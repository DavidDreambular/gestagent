/**
 * Servicio de Procesamiento Paralelo
 * Maneja múltiples documentos concurrentemente con control de concurrencia
 */

import { EnhancedMistralProcessor } from './document-processor-mistral-enhanced';
import pgClient from '@/lib/postgresql-client';
import { v4 as uuidv4 } from 'uuid';
import { suppliersCustomersManager } from './suppliers-customers-manager';
import { duplicateDetectionService } from './duplicate-detection.service';
import AuditService, { AuditAction, AuditEntityType } from './audit.service';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export interface ProcessingJob {
  jobId: string;
  fileName: string;
  buffer: Buffer;
  status: 'waiting' | 'processing' | 'completed' | 'error' | 'cancelled';
  progress: number;
  result?: any;
  error?: string;
  startTime?: Date;
  endTime?: Date;
}

export interface ProcessingOptions {
  maxConcurrency?: number;
  detectDuplicates?: boolean;
  autoLinkInvoices?: boolean;
  skipSupplierCreation?: boolean;
  userId?: string;
  requestIp?: string;
}

export interface ProcessingResult {
  totalJobs: number;
  completed: number;
  errors: number;
  cancelled: number;
  results: ProcessingJob[];
  processingTime: number;
}

export class ParallelProcessorService {
  private jobs: Map<string, ProcessingJob> = new Map();
  private activeProcessing: number = 0;
  private maxConcurrency: number = 3; // Por defecto, 3 documentos en paralelo
  private documentProcessor: EnhancedMistralProcessor;
  private jobQueue: string[] = [];
  private isProcessing: boolean = false;
  private abortController: AbortController | null = null;

  constructor() {
    this.documentProcessor = new EnhancedMistralProcessor();
  }

  /**
   * Añadir múltiples documentos a la cola de procesamiento
   */
  async addBatch(files: Array<{ fileName: string; buffer: Buffer }>, options: ProcessingOptions = {}): Promise<string[]> {
    const jobIds: string[] = [];
    
    // Aplicar opciones
    if (options.maxConcurrency) {
      this.maxConcurrency = Math.min(options.maxConcurrency, 10); // Máximo 10 concurrentes
    }

    // Crear jobs para cada archivo
    for (const file of files) {
      const jobId = uuidv4();
      const job: ProcessingJob = {
        jobId,
        fileName: file.fileName,
        buffer: file.buffer,
        status: 'waiting',
        progress: 0
      };
      
      this.jobs.set(jobId, job);
      this.jobQueue.push(jobId);
      jobIds.push(jobId);
    }

    // Iniciar procesamiento si no está activo
    if (!this.isProcessing) {
      this.startProcessing(options);
    }

    return jobIds;
  }

  /**
   * Obtener estado de un job específico
   */
  getJobStatus(jobId: string): ProcessingJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Obtener estado de todos los jobs
   */
  getAllJobs(): ProcessingJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Cancelar un job específico
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'waiting') {
      job.status = 'cancelled';
      this.jobQueue = this.jobQueue.filter(id => id !== jobId);
      return true;
    }
    return false;
  }

  /**
   * Cancelar todo el procesamiento
   */
  cancelAll(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    
    this.jobQueue = [];
    this.jobs.forEach(job => {
      if (job.status === 'waiting' || job.status === 'processing') {
        job.status = 'cancelled';
      }
    });
    
    this.isProcessing = false;
  }

  /**
   * Iniciar procesamiento de la cola
   */
  private async startProcessing(options: ProcessingOptions): Promise<void> {
    this.isProcessing = true;
    this.abortController = new AbortController();
    const startTime = Date.now();

    while (this.jobQueue.length > 0 && !this.abortController.signal.aborted) {
      // Procesar hasta maxConcurrency documentos en paralelo
      const batch = this.jobQueue.splice(0, this.maxConcurrency - this.activeProcessing);
      
      if (batch.length > 0) {
        await Promise.all(
          batch.map(jobId => this.processJob(jobId, options))
        );
      }
      
      // Pequeña pausa para evitar sobrecarga
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessing = false;
    const endTime = Date.now();
    
    console.log(`✅ [ParallelProcessor] Procesamiento completado en ${(endTime - startTime) / 1000}s`);
  }

  /**
   * Procesar un job individual
   */
  private async processJob(jobId: string, options: ProcessingOptions): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'waiting') return;

    this.activeProcessing++;
    job.status = 'processing';
    job.startTime = new Date();

    try {
      console.log(`🔄 [ParallelProcessor] Procesando: ${job.fileName}`);
      
      // 1. Guardar archivo localmente
      job.progress = 10;
      const filePath = await this.saveFileLocally(job.buffer, job.fileName);
      
      // 2. Procesar con Mistral
      job.progress = 30;
      const extractedData = await this.documentProcessor.processDocument(job.buffer);
      
      if (!extractedData || extractedData.error) {
        throw new Error(extractedData?.error || 'Error en procesamiento Mistral');
      }

      // 3. Detectar duplicados si está habilitado
      job.progress = 50;
      let duplicateInfo = null;
      
      if (options.detectDuplicates && extractedData.supplierInfo) {
        const duplicateResult = await duplicateDetectionService.findDuplicateSupplier({
          name: extractedData.supplierInfo.name,
          nif_cif: extractedData.supplierInfo.nif,
          address: extractedData.supplierInfo.address,
          phone: extractedData.supplierInfo.phone,
          email: extractedData.supplierInfo.email
        });
        
        if (duplicateResult.has_duplicates) {
          duplicateInfo = {
            hasDuplicates: true,
            candidates: duplicateResult.candidates,
            recommendedAction: duplicateResult.recommended_action
          };
        }
      }

      // 4. Gestionar proveedores y clientes
      job.progress = 70;
      let supplierData = null;
      let customerData = null;
      
      if (!options.skipSupplierCreation && extractedData.supplierInfo) {
        const supplierResult = await suppliersCustomersManager.processSupplier(
          extractedData.supplierInfo,
          { skipDuplicateCheck: duplicateInfo?.recommendedAction === 'merge' }
        );
        
        if (supplierResult.success) {
          supplierData = supplierResult.data;
        }
      }
      
      if (extractedData.customerInfo) {
        const customerResult = await suppliersCustomersManager.processCustomer(
          extractedData.customerInfo
        );
        
        if (customerResult.success) {
          customerData = customerResult.data;
        }
      }

      // 5. Guardar documento en PostgreSQL
      job.progress = 85;
      const documentId = uuidv4();
      const documentDate = this.convertToISODate(extractedData.date);
      
      const { error: insertError } = await pgClient.query(
        `INSERT INTO documents (
          job_id, original_filename, file_path, document_type, document_subtype,
          status, upload_timestamp, processing_timestamp, 
          document_date, period_year, period_month,
          extracted_data, total_amount, tax_amount,
          emitter_id, emitter_type, emitter_name, emitter_nif,
          receiver_id, receiver_type, receiver_name, receiver_nif,
          user_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, NOW(), NOW())`,
        [
          documentId,
          job.fileName,
          filePath,
          extractedData.type || 'factura',
          extractedData.subtipo || null,
          'processed',
          new Date().toISOString(),
          new Date().toISOString(),
          documentDate,
          documentDate ? new Date(documentDate).getFullYear() : null,
          documentDate ? new Date(documentDate).getMonth() + 1 : null,
          JSON.stringify(extractedData),
          extractedData.totalAmount || 0,
          extractedData.taxAmount || 0,
          supplierData?.supplier_id || null,
          'supplier',
          extractedData.supplierInfo?.name || null,
          extractedData.supplierInfo?.nif || null,
          customerData?.customer_id || null,
          'customer',
          extractedData.customerInfo?.name || null,
          extractedData.customerInfo?.nif || null,
          options.userId || null
        ]
      );

      if (insertError) {
        throw new Error(`Error guardando documento: ${insertError.message}`);
      }

      // 6. Vincular factura si está habilitado
      if (options.autoLinkInvoices && extractedData.type === 'factura') {
        await this.linkInvoice(documentId, supplierData?.supplier_id, customerData?.customer_id, extractedData);
      }

      // 7. Registrar en auditoría
      if (options.userId) {
        await AuditService.log({
          userId: options.userId,
          action: AuditAction.CREATE,
          entityType: AuditEntityType.DOCUMENTS,
          entityId: documentId,
          newValues: {
            fileName: job.fileName,
            documentType: extractedData.type,
            status: 'processed',
            batchProcessing: true
          },
          ipAddress: options.requestIp,
          userAgent: 'ParallelProcessorService'
        });
      }

      job.progress = 100;
      job.status = 'completed';
      job.result = {
        documentId,
        extractedData,
        supplierData,
        customerData,
        duplicateInfo
      };
      
      console.log(`✅ [ParallelProcessor] Completado: ${job.fileName}`);
      
    } catch (error) {
      console.error(`❌ [ParallelProcessor] Error procesando ${job.fileName}:`, error);
      job.status = 'error';
      job.error = error instanceof Error ? error.message : 'Error desconocido';
    } finally {
      job.endTime = new Date();
      this.activeProcessing--;
    }
  }

  /**
   * Guardar archivo localmente
   */
  private async saveFileLocally(buffer: Buffer, fileName: string): Promise<string> {
    const uploadsDir = join(process.cwd(), 'uploads', 'batch');
    await mkdir(uploadsDir, { recursive: true });
    
    const timestamp = Date.now();
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueId = uuidv4();
    const uniqueFileName = `${uniqueId}_${timestamp}_${safeFileName}`;
    const filePath = join(uploadsDir, uniqueFileName);
    
    await writeFile(filePath, buffer);
    
    return `/uploads/batch/${uniqueFileName}`;
  }

  /**
   * Vincular factura con entidades
   */
  private async linkInvoice(
    documentId: string, 
    supplierId: string | null, 
    customerId: string | null,
    extractedData: any
  ): Promise<void> {
    if (!supplierId && !customerId) return;

    try {
      await pgClient.query(
        `INSERT INTO invoice_entities (
          document_id, supplier_id, customer_id, 
          invoice_number, invoice_date, total_amount, tax_amount
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (document_id, supplier_id, customer_id, invoice_number)
        DO UPDATE SET updated_at = NOW()`,
        [
          documentId,
          supplierId,
          customerId,
          extractedData.invoiceNumber || null,
          this.convertToISODate(extractedData.date),
          extractedData.totalAmount || 0,
          extractedData.taxAmount || 0
        ]
      );
    } catch (error) {
      console.error('❌ [ParallelProcessor] Error vinculando factura:', error);
    }
  }

  /**
   * Convertir fecha a formato ISO
   */
  private convertToISODate(dateString: string | null | undefined): string | null {
    if (!dateString) return null;
    
    try {
      if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
        return dateString.split('T')[0];
      }
      
      const ddmmyyyy = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (ddmmyyyy) {
        const [, day, month, year] = ddmmyyyy;
        const fullYear = year.length === 2 ? `20${year}` : year;
        return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Obtener estadísticas del procesamiento
   */
  getStatistics(): ProcessingResult {
    const jobs = this.getAllJobs();
    const completed = jobs.filter(j => j.status === 'completed').length;
    const errors = jobs.filter(j => j.status === 'error').length;
    const cancelled = jobs.filter(j => j.status === 'cancelled').length;
    
    // Calcular tiempo total de procesamiento
    let totalTime = 0;
    jobs.forEach(job => {
      if (job.startTime && job.endTime) {
        totalTime += job.endTime.getTime() - job.startTime.getTime();
      }
    });

    return {
      totalJobs: jobs.length,
      completed,
      errors,
      cancelled,
      results: jobs,
      processingTime: totalTime / 1000 // en segundos
    };
  }

  /**
   * Limpiar jobs completados/cancelados
   */
  cleanup(): void {
    const toRemove: string[] = [];
    this.jobs.forEach((job, id) => {
      if (job.status === 'completed' || job.status === 'cancelled' || job.status === 'error') {
        toRemove.push(id);
      }
    });
    
    toRemove.forEach(id => this.jobs.delete(id));
  }
}

// Singleton
export const parallelProcessorService = new ParallelProcessorService();