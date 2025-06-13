import { NextRequest, NextResponse } from 'next/server';
import { EnhancedMistralProcessor } from '@/services/document-processor-mistral-enhanced';
import pgClient from '@/lib/postgresql-client';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SuppliersCustomersManager } from '@/services/suppliers-customers-manager';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import AuditService, { AuditAction, AuditEntityType } from '@/services/audit.service';
import { unifiedNotificationService } from '@/lib/services/unified-notification.service';

// Configuración para procesamiento masivo optimizado
export const maxDuration = 300; // 5 minutos para múltiples archivos
export const dynamic = 'force-dynamic';

// Límites de procesamiento paralelo optimizados
const MAX_CONCURRENT_UPLOADS = 5; // Aumentado para mejor rendimiento
const MAX_FILES_PER_BATCH = 25; // Más archivos por lote
const MAX_TOTAL_SIZE = 250 * 1024 * 1024; // 250MB total
const RETRY_ATTEMPTS = 3; // Reintentos en caso de error

// Instancia del manager de proveedores/clientes
const suppliersCustomersManager = new SuppliersCustomersManager();

// Cola de procesamiento con prioridades
interface ProcessingJob {
  id: string;
  file: File;
  documentType: string;
  userId: string;
  priority: number;
  attempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  startTime?: number;
  endTime?: number;
}

// Función para convertir fecha DD/MM/YYYY a formato ISO YYYY-MM-DD
function convertToISODate(dateString: string | null | undefined): string | null {
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
    
    const yyyymmdd = dateString.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (yyyymmdd) {
      const [, year, month, day] = yyyymmdd;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    console.warn(`⚠️ [UPLOAD-MULTIPLE] Formato de fecha no reconocido: ${dateString}`);
    return null;
  } catch (error) {
    console.error(`❌ [UPLOAD-MULTIPLE] Error convirtiendo fecha "${dateString}":`, error);
    return null;
  }
}

// Función mejorada para guardar archivo localmente
function saveFileLocally(buffer: Buffer, fileName: string, jobId: string): string {
  try {
    const uploadsDir = join(process.cwd(), 'uploads', 'batch');
    mkdirSync(uploadsDir, { recursive: true });
    
    const timestamp = Date.now();
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${jobId}_${timestamp}_${safeFileName}`;
    const filePath = join(uploadsDir, uniqueFileName);
    
    writeFileSync(filePath, buffer);
    console.log(`💾 [UPLOAD-MULTIPLE] Archivo guardado: ${filePath}`);
    
    return `/uploads/batch/${uniqueFileName}`;
  } catch (error) {
    console.error('❌ [UPLOAD-MULTIPLE] Error guardando archivo:', error);
    throw error;
  }
}

// Función para detectar duplicados
async function checkForDuplicates(extractedData: any): Promise<boolean> {
  try {
    if (!extractedData?.detected_invoices || extractedData.detected_invoices.length === 0) {
      return false;
    }

    const invoice = extractedData.detected_invoices[0];
    const emitterName = invoice.supplier?.name || invoice.emitter?.name;
    const invoiceNumber = invoice.invoice_number || invoice.number;
    const totalAmount = invoice.total_amount || invoice.amount?.total;
    const documentDate = convertToISODate(invoice.issue_date || invoice.date);

    if (!emitterName || !invoiceNumber || !totalAmount) {
      return false;
    }

    const query = `
      SELECT COUNT(*) as count 
      FROM documents 
      WHERE processing_metadata->>'emitter_name' = $1 
        AND processed_json->>'invoice_number' = $2 
        AND (processed_json->>'total_amount')::text = $3
        AND document_date = $4
    `;

    const result: any = await pgClient.query(query, [
      emitterName,
      invoiceNumber,
      totalAmount.toString(),
      documentDate
    ]);

    if (result.rows && result.rows.length > 0 && result.rows[0]) {
      return parseInt(result.rows[0].count) > 0;
    }
    
    return false;
  } catch (error) {
    console.error('❌ [UPLOAD-MULTIPLE] Error verificando duplicados:', error);
    return false;
  }
}

// Función optimizada para procesar un documento individual con Mistral
async function processDocumentWithMistral(
  job: ProcessingJob,
  request: NextRequest
): Promise<ProcessingJob> {
  const startTime = Date.now();
  job.startTime = startTime;
  job.status = 'processing';
  
  try {
    console.log(`🔄 [UPLOAD-MULTIPLE] Procesando: ${job.file.name} (Job: ${job.id}, Intento: ${job.attempts + 1})`);
    
    // Validaciones básicas
    if (job.file.type !== 'application/pdf') {
      throw new Error('Solo se permiten archivos PDF');
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (job.file.size > maxSize) {
      throw new Error('Archivo demasiado grande. Máximo 50MB');
    }

    // Convertir archivo a buffer
    const arrayBuffer = await job.file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);
    
    // Guardar archivo localmente
    const filePath = saveFileLocally(pdfBuffer, job.file.name, job.id);

    // Notificar que el documento ha sido recibido
    await unifiedNotificationService.notifyDocumentUploaded(job.userId, job.file.name, job.id);

    // Procesar con Enhanced Mistral Processor
    const enhancedProcessor = new EnhancedMistralProcessor();
    const mistralResult = await enhancedProcessor.processDocument(pdfBuffer, job.id);

    if (!mistralResult.success) {
      throw new Error(`Error en Mistral OCR: ${mistralResult.extracted_data || 'Error desconocido'}`);
    }

    console.log(`✅ [UPLOAD-MULTIPLE] Mistral procesó exitosamente: ${job.file.name}`);
    console.log(`📊 [UPLOAD-MULTIPLE] Facturas detectadas: ${mistralResult.total_invoices_detected}`);

    // Verificar duplicados
    const isDuplicate = await checkForDuplicates(mistralResult.extracted_data);
    if (isDuplicate) {
      console.warn(`⚠️ [UPLOAD-MULTIPLE] Documento duplicado detectado: ${job.file.name}`);
    }

    // Extraer datos clave del resultado de Mistral
    const extractedData = mistralResult.extracted_data;
    
    // NUEVA LÓGICA: Procesar TODAS las facturas detectadas, no solo la primera
    const allInvoices = extractedData?.detected_invoices || [];
    console.log(`🔍 [UPLOAD-MULTIPLE] Procesando ${allInvoices.length} facturas detectadas en ${job.file.name}`);
    
    // DEBUG: Logging detallado de facturas detectadas
    if (allInvoices.length > 0) {
      console.log(`📋 [DEBUG] Facturas detectadas:`);
      allInvoices.forEach((invoice, index) => {
        console.log(`   📄 Factura ${index + 1}:`);
        console.log(`      📋 Número: ${invoice.invoice_number || 'Sin número'}`);
        console.log(`      🏢 Proveedor: ${invoice.supplier?.name || 'Sin proveedor'} (${invoice.supplier?.nif_cif || 'Sin NIF'})`);
        console.log(`      👤 Cliente: ${invoice.customer?.name || 'Sin cliente'} (${invoice.customer?.nif_cif || 'Sin NIF'})`);
        console.log(`      💰 Importe: ${invoice.total_amount || 'Sin importe'}`);
      });
    } else {
      console.warn(`⚠️ [UPLOAD-MULTIPLE] No se detectaron facturas en el extractedData`);
      console.log(`🔍 [DEBUG] extractedData structure:`, JSON.stringify(extractedData, null, 2));
    }
    
    // Procesar información usando TODAS las facturas
    let emitterName = 'Desconocido';
    let emitterNif = null;
    let receiverName = 'Desconocido';
    let receiverNif = null;
    let totalAmount = null;
    let taxAmount = null;
    let baseAmount = null;
    let documentDate = null;
    let dueDate = null;
    let invoiceNumber = null;
    
    // Para compatibilidad con la BD, usar datos de la primera factura como representativos del documento
    if (allInvoices.length > 0) {
      const firstInvoice = allInvoices[0];
      
      emitterName = firstInvoice.supplier?.name || firstInvoice.emitter?.name || 'Desconocido';
      emitterNif = firstInvoice.supplier?.nif || firstInvoice.emitter?.nif;
      receiverName = firstInvoice.customer?.name || firstInvoice.receiver?.name || 'Desconocido';
      receiverNif = firstInvoice.customer?.nif || firstInvoice.receiver?.nif;
      
      totalAmount = firstInvoice.total_amount || firstInvoice.amount?.total;
      taxAmount = firstInvoice.tax_amount || firstInvoice.amount?.tax;
      baseAmount = firstInvoice.base_amount || firstInvoice.amount?.base;
      
      documentDate = convertToISODate(firstInvoice.issue_date || firstInvoice.date);
      dueDate = convertToISODate(firstInvoice.due_date);
      invoiceNumber = firstInvoice.invoice_number || firstInvoice.number;
      
      // Si hay múltiples facturas, agregar indicador en el número
      if (allInvoices.length > 1) {
        invoiceNumber = `${invoiceNumber || 'SIN_NUMERO'} (+${allInvoices.length - 1} más)`;
      }
    }

    // CRÍTICO: Gestionar TODAS las facturas automáticamente usando processInvoiceRelations
    let supplierId = null;
    let customerId = null;
    let relationResults: string[] = [];

    try {
      console.log(`🏢 [UPLOAD-MULTIPLE] Procesando relaciones para ${allInvoices.length} facturas`);
      
      // Pasar TODAS las facturas al manager para que procese cada una
      const relations = await suppliersCustomersManager.processInvoiceRelations(allInvoices, job.id);
      
      supplierId = relations.supplier_id || null;
      customerId = relations.customer_id || null;
      relationResults = relations.operations || [];
      
      console.log(`✅ [UPLOAD-MULTIPLE] Relaciones procesadas:`, {
        supplier_id: supplierId,
        customer_id: customerId,
        operations_count: relationResults.length,
        operations: relationResults
      });
      
    } catch (relationError: any) {
      console.error(`❌ [UPLOAD-MULTIPLE] Error procesando relaciones para ${job.file.name}:`, relationError);
      relationResults.push(`Error: ${relationError.message}`);
    }

    // Guardar en la base de datos con columnas existentes solamente
    const query = `
      INSERT INTO documents (
        job_id, document_type, raw_json, processed_json, upload_timestamp, user_id, 
        status, emitter_name, receiver_name, document_date, total_amount, tax_amount, 
        title, file_path, processing_metadata, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
      ) RETURNING job_id
    `;

    const processingMetadata = {
      processing_time_ms: mistralResult.processing_metadata?.total_time_ms || 0,
      confidence: mistralResult.processing_metadata?.confidence || 0,
      total_invoices_detected: mistralResult.total_invoices_detected,
      invoices_processed: allInvoices.length,
      is_duplicate: isDuplicate,
      emitter_name: emitterName,
      invoice_number: invoiceNumber,
      supplier_id: supplierId,
      customer_id: customerId,
      method: mistralResult.processing_metadata?.method || 'mistral-enhanced',
      multiple_invoices: allInvoices.length > 1,
      relation_operations: relationResults,
      all_invoice_numbers: allInvoices.map(inv => inv.invoice_number || 'SIN_NUMERO').join(', ')
    };

    const values = [
      job.id,
      job.documentType,
      JSON.stringify(mistralResult.extracted_data),
      JSON.stringify(mistralResult.extracted_data),
      job.userId,
      'completed',
      emitterName,
      receiverName,
      documentDate,
      totalAmount ? parseFloat(totalAmount.toString()) : null,
      taxAmount ? parseFloat(taxAmount.toString()) : null,
      `${job.file.name} - ${invoiceNumber || 'Sin número'}`,
      filePath,
      JSON.stringify(processingMetadata)
    ];

    await pgClient.query(query, values);

    // Registrar auditoría
    await AuditService.logFromRequest(request, {
      userId: job.userId,
      action: AuditAction.UPLOAD,
      entityType: AuditEntityType.DOCUMENTS,
      entityId: job.id,
      newValues: {
        fileName: job.file.name,
        documentType: job.documentType,
        fileSize: job.file.size,
        processingTime: mistralResult.processing_metadata?.total_time_ms || 0,
        totalInvoices: mistralResult.total_invoices_detected,
        mistralConfidence: mistralResult.processing_metadata?.confidence || 0,
        isDuplicate
      },
      metadata: {
        batchUpload: true,
        source: 'upload_multiple_enhanced',
        mistralVersion: 'enhanced',
        multipleInvoices: allInvoices.length > 1,
        allInvoiceNumbers: allInvoices.map(inv => inv.invoice_number || 'SIN_NUMERO').slice(0, 5).join(', '),
        relationOperations: relationResults.length
      }
    });

    // Notificar que el documento ha sido procesado exitosamente
    await unifiedNotificationService.notifyDocumentProcessed(
      job.userId, 
      job.file.name, 
      job.id, 
      mistralResult.total_invoices_detected || 0
    );

    // Enviar notificación de resumen de descubrimientos si se procesaron múltiples facturas
    if (allInvoices.length > 1 && relationResults.length > 0) {
      const discoveryCount = relationResults.filter(op => 
        op.includes('procesado:') || op.includes('creado exitosamente')
      ).length;
      
      if (discoveryCount > 0) {
        await unifiedNotificationService.notifySystemWarning(
          job.userId,
          `Múltiples entidades descubiertas`,
          `Se han detectado ${allInvoices.length} facturas en "${job.file.name}". Se procesaron ${discoveryCount} nuevas entidades comerciales. Revisa la sección de proveedores y clientes para ver los nuevos registros.`
        );
      }
    }

    job.endTime = Date.now();
    job.status = 'completed';
    job.result = {
      success: true,
      jobId: job.id,
      fileName: job.file.name,
      documentType: job.documentType,
      processingTime: job.endTime - startTime,
      totalInvoices: mistralResult.total_invoices_detected,
      invoicesProcessed: allInvoices.length,
      multipleInvoices: allInvoices.length > 1,
      emitterName,
      receiverName,
      totalAmount,
      invoiceNumber,
      isDuplicate,
      mistralConfidence: mistralResult.processing_metadata?.confidence || 0,
      supplierId,
      customerId,
      relationOperations: relationResults.length,
      allInvoiceNumbers: allInvoices.map(inv => inv.invoice_number || 'SIN_NUMERO').slice(0, 3)
    };

    console.log(`✅ [UPLOAD-MULTIPLE] Completado: ${job.file.name} en ${job.endTime - startTime}ms`);
    console.log(`📊 [UPLOAD-MULTIPLE] Resumen del procesamiento:`);
    console.log(`   📄 Facturas detectadas: ${mistralResult.total_invoices_detected}`);
    console.log(`   🏢 Facturas procesadas: ${allInvoices.length}`);
    console.log(`   🆔 Proveedores/Clientes: ${supplierId ? 'S' : '-'}${customerId ? 'C' : '-'}`);
    console.log(`   🔗 Operaciones de relación: ${relationResults.length}`);
    if (allInvoices.length > 1) {
      console.log(`   📋 Números de factura: ${allInvoices.map(inv => inv.invoice_number || 'SIN_NUMERO').slice(0, 3).join(', ')}${allInvoices.length > 3 ? '...' : ''}`);
    }
    return job;

  } catch (error: any) {
    job.attempts++;
    job.error = error?.message || 'Error desconocido';
    job.endTime = Date.now();
    
    console.error(`❌ [UPLOAD-MULTIPLE] Error procesando ${job.file.name}:`, error);
    
    // Notificar error si se han agotado los intentos
    if (job.attempts >= RETRY_ATTEMPTS) {
      await unifiedNotificationService.notifyDocumentError(
        job.userId, 
        job.file.name, 
        error?.message || 'Error desconocido'
      );
    }
    
    // Reintentar si no se han agotado los intentos
    if (job.attempts < RETRY_ATTEMPTS) {
      console.log(`🔄 [UPLOAD-MULTIPLE] Reintentando ${job.file.name} (${job.attempts}/${RETRY_ATTEMPTS})`);
      job.status = 'pending';
      return job;
    } else {
      job.status = 'failed';
      return job;
    }
  }
}

// Función para dividir array en chunks
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

// Endpoint GET para obtener estado de procesamiento
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    config: {
      maxConcurrentUploads: MAX_CONCURRENT_UPLOADS,
      maxFilesPerBatch: MAX_FILES_PER_BATCH,
      maxTotalSize: MAX_TOTAL_SIZE,
      supportedFormats: ['application/pdf'],
      features: {
        mistralOCR: true,
        duplicateDetection: true,
        batchProcessing: true,
        autoRetry: true,
        parallelProcessing: true
      }
    }
  });
}

// Endpoint POST mejorado para procesamiento masivo
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log(`🚀 [UPLOAD-MULTIPLE] Iniciando procesamiento masivo de documentos`);

  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = session.user.id;
    console.log(`👤 [UPLOAD-MULTIPLE] Usuario autenticado: ${userId}`);

    // Obtener datos del formulario
    const formData = await request.formData();
    const documentType = formData.get('documentType') as string || 'factura';
    
    // Extraer archivos
    const files: File[] = [];
    let totalSize = 0;

    formData.forEach((value, key) => {
      if (key === 'files' && value && typeof value === 'object' && 'name' in value && 'size' in value && 'type' in value) {
        files.push(value as File);
        totalSize += (value as File).size;
      }
    });

    console.log(`📁 [UPLOAD-MULTIPLE] Archivos recibidos: ${files.length}`);
    console.log(`📊 [UPLOAD-MULTIPLE] Tamaño total: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);

    // Validaciones
    if (files.length === 0) {
      return NextResponse.json({ error: 'No se recibieron archivos' }, { status: 400 });
    }

    if (files.length > MAX_FILES_PER_BATCH) {
      return NextResponse.json({ 
        error: `Máximo ${MAX_FILES_PER_BATCH} archivos por lote` 
      }, { status: 400 });
    }

    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json({ 
        error: `Tamaño total excede ${MAX_TOTAL_SIZE / 1024 / 1024}MB` 
      }, { status: 400 });
    }

    // Crear trabajos de procesamiento
    const jobs: ProcessingJob[] = files.map((file, index) => ({
      id: uuidv4(),
      file,
      documentType,
      userId,
      priority: index,
      attempts: 0,
      status: 'pending'
    }));

    console.log(`⚙️ [UPLOAD-MULTIPLE] Creados ${jobs.length} trabajos de procesamiento`);

    // Procesar en lotes paralelos
    const processedJobs: ProcessingJob[] = [];
    const chunks = chunkArray(jobs, MAX_CONCURRENT_UPLOADS);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`🔄 [UPLOAD-MULTIPLE] Procesando lote ${i + 1}/${chunks.length} (${chunk.length} archivos)`);

      const chunkPromises = chunk.map(job => processDocumentWithMistral(job, request));
      const chunkResults = await Promise.allSettled(chunkPromises);

      chunkResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          processedJobs.push(result.value);
        } else {
          console.error(`❌ [UPLOAD-MULTIPLE] Error en trabajo ${chunk[index].id}:`, result.reason);
          processedJobs.push({
            ...chunk[index],
            status: 'failed',
            error: result.reason?.message || 'Error desconocido'
          });
        }
      });
    }

    // Recopilar estadísticas
    const completed = processedJobs.filter(job => job.status === 'completed');
    const failed = processedJobs.filter(job => job.status === 'failed');
    const totalProcessingTime = Date.now() - startTime;

    const stats = {
      totalFiles: files.length,
      completed: completed.length,
      failed: failed.length,
      totalProcessingTime,
      averageProcessingTime: completed.length > 0 
        ? completed.reduce((sum, job) => sum + (job.endTime! - job.startTime!), 0) / completed.length
        : 0,
      duplicatesDetected: completed.filter(job => job.result?.isDuplicate).length,
      totalInvoicesDetected: completed.reduce((sum, job) => sum + (job.result?.totalInvoices || 0), 0),
      totalInvoicesProcessed: completed.reduce((sum, job) => sum + (job.result?.invoicesProcessed || 0), 0),
      documentsWithMultipleInvoices: completed.filter(job => job.result?.multipleInvoices).length,
      totalSupplierCustomerOperations: completed.reduce((sum, job) => sum + (job.result?.relationOperations || 0), 0),
      averageInvoicesPerDocument: completed.length > 0 
        ? completed.reduce((sum, job) => sum + (job.result?.invoicesProcessed || 0), 0) / completed.length
        : 0
    };

    console.log(`✅ [UPLOAD-MULTIPLE] Procesamiento completado:`);
    console.log(`   📁 Archivos: ${stats.totalFiles}`);
    console.log(`   ✅ Exitosos: ${stats.completed}`);
    console.log(`   ❌ Fallidos: ${stats.failed}`);
    console.log(`   ⏱️ Tiempo total: ${stats.totalProcessingTime}ms`);
    console.log(`   📄 Facturas detectadas: ${stats.totalInvoicesDetected}`);
    console.log(`   🏢 Facturas procesadas: ${stats.totalInvoicesProcessed}`);
    console.log(`   📊 Promedio facturas/documento: ${stats.averageInvoicesPerDocument.toFixed(1)}`);
    console.log(`   📋 Documentos con múltiples facturas: ${stats.documentsWithMultipleInvoices}`);
    console.log(`   🔗 Operaciones de proveedor/cliente: ${stats.totalSupplierCustomerOperations}`);
    console.log(`   🔄 Duplicados: ${stats.duplicatesDetected}`);

    return NextResponse.json({
      success: true,
      message: `Procesamiento completado: ${stats.completed}/${stats.totalFiles} archivos exitosos, ${stats.totalInvoicesProcessed} facturas procesadas`,
      stats,
      results: processedJobs.map(job => ({
        jobId: job.id,
        fileName: job.file.name,
        status: job.status,
        result: job.result,
        error: job.error,
        processingTime: job.endTime && job.startTime ? job.endTime - job.startTime : null
      }))
    });

  } catch (error: any) {
    console.error('❌ [UPLOAD-MULTIPLE] Error general:', error);
    return NextResponse.json({
      success: false,
      error: 'Error procesando archivos',
      details: error?.message || 'Error desconocido'
    }, { status: 500 });
  }
}
