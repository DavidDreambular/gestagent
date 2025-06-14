/**
 * Invoice-Entity Linker Service
 * Servicio para vincular documentos procesados con proveedores y clientes,
 * actualizando las estadísticas automáticamente
 * 
 * Features:
 * - Vinculación automática de documentos con entidades
 * - Actualización de estadísticas en tiempo real
 * - Manejo de múltiples facturas por documento
 * - Logging de auditoría para tracking
 * - Retry automático en caso de errores
 */

import pgClient from '@/lib/postgresql-client';
import { entityMatchingService, MatchResult, InvoiceData } from './entity-matching.service';

export interface LinkingResult {
  success: boolean;
  job_id: string;
  supplier_links: {
    entity_id: string | null;
    confidence: number;
    method: string;
    created_new: boolean;
  }[];
  customer_links: {
    entity_id: string | null;
    confidence: number;
    method: string;
    created_new: boolean;
  }[];
  statistics_updated: boolean;
  errors: string[];
  summary: {
    total_invoices: number;
    successful_links: number;
    failed_links: number;
    new_entities_created: number;
  };
}

export interface EntityMatchingLog {
  log_id: string;
  job_id: string;
  entity_type: 'supplier' | 'customer';
  entity_id: string | null;
  match_method: string;
  confidence: number;
  created_new: boolean;
  invoice_data: any;
  reasoning: string;
  created_at: string;
}

export class InvoiceEntityLinkerService {

  /**
   * Guardar log de matching para auditoría
   */
  private async saveMatchingLog(
    jobId: string,
    entityType: 'supplier' | 'customer',
    matchResult: MatchResult,
    invoiceData: any
  ): Promise<void> {
    try {
      await pgClient.query(
        `INSERT INTO entity_matching_logs (
          job_id, entity_type, entity_id, match_method, confidence,
          created_new, invoice_data, reasoning, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          jobId,
          entityType,
          matchResult.entity_id,
          matchResult.match_method,
          matchResult.confidence,
          matchResult.created_new,
          JSON.stringify(invoiceData),
          matchResult.reasoning || 'Sin información adicional'
        ]
      );
    } catch (error) {
      console.error('❌ [LinkerService] Error guardando log de matching:', error);
      // No fallar el proceso completo por un error de logging
    }
  }

  /**
   * Actualizar documento con IDs de entidades vinculadas
   */
  private async updateDocumentWithEntities(
    jobId: string,
    supplierIds: (string | null)[],
    customerIds: (string | null)[],
    supplierConfidences: number[],
    customerConfidences: number[]
  ): Promise<boolean> {
    try {
      // Tomar el primer proveedor y cliente encontrados (o null)
      const primarySupplierId = supplierIds.find(id => id !== null) || null;
      const primaryCustomerId = customerIds.find(id => id !== null) || null;
      
      // Calcular confianzas promedio
      const avgSupplierConfidence = supplierConfidences.length > 0 
        ? Math.round(supplierConfidences.reduce((a, b) => a + b, 0) / supplierConfidences.length)
        : 0;
      
      const avgCustomerConfidence = customerConfidences.length > 0
        ? Math.round(customerConfidences.reduce((a, b) => a + b, 0) / customerConfidences.length)
        : 0;

      const { error } = await pgClient.query(
        `UPDATE documents 
         SET supplier_id = $1, 
             customer_id = $2,
             supplier_match_confidence = $3,
             customer_match_confidence = $4,
             auto_created_supplier = $5,
             auto_created_customer = $6,
             updated_at = NOW()
         WHERE job_id = $7`,
        [
          primarySupplierId,
          primaryCustomerId,
          avgSupplierConfidence,
          avgCustomerConfidence,
          supplierIds.some(id => id !== null), // Si encontramos algún proveedor
          customerIds.some(id => id !== null), // Si encontramos algún cliente
          jobId
        ]
      );

      if (error) {
        console.error('❌ [LinkerService] Error actualizando documento:', error);
        return false;
      }

      console.log(`✅ [LinkerService] Documento ${jobId} actualizado con entidades vinculadas`);
      return true;
    } catch (error) {
      console.error('❌ [LinkerService] Error en updateDocumentWithEntities:', error);
      return false;
    }
  }

  /**
   * Ejecutar funciones de actualización de estadísticas para entidades
   */
  private async updateEntityStatistics(entityIds: (string | null)[], entityType: 'supplier' | 'customer'): Promise<boolean> {
    try {
      const validIds = entityIds.filter(id => id !== null);
      if (validIds.length === 0) return true;

      const functionName = entityType === 'supplier' ? 'update_supplier_stats' : 'update_customer_stats';
      
      for (const entityId of validIds) {
        const { error } = await pgClient.query(`SELECT ${functionName}($1)`, [entityId]);
        if (error) {
          console.error(`❌ [LinkerService] Error actualizando estadísticas de ${entityType} ${entityId}:`, error);
        } else {
          console.log(`✅ [LinkerService] Estadísticas actualizadas para ${entityType} ${entityId}`);
        }
      }

      return true;
    } catch (error) {
      console.error('❌ [LinkerService] Error en updateEntityStatistics:', error);
      return false;
    }
  }

  /**
   * Procesar datos extraídos y extraer facturas individuales
   */
  private extractInvoicesFromDocument(extractedData: any): InvoiceData[] {
    const invoices: InvoiceData[] = [];

    try {
      // Si hay array de facturas detectadas (formato Mistral)
      if (extractedData.detected_invoices && Array.isArray(extractedData.detected_invoices)) {
        extractedData.detected_invoices.forEach((invoice: any) => {
          invoices.push({
            invoice_number: invoice.invoice_number || invoice.number,
            total_amount: parseFloat(invoice.total_amount || invoice.totals?.total || 0),
            issue_date: invoice.issue_date || invoice.date,
            supplier: invoice.supplier || invoice.emitter,
            customer: invoice.customer || invoice.receiver
          });
        });
      }
      // Si es un array directo de facturas
      else if (Array.isArray(extractedData)) {
        extractedData.forEach((invoice: any) => {
          invoices.push({
            invoice_number: invoice.invoice_number,
            total_amount: parseFloat(invoice.total_amount || invoice.totals?.total || 0),
            issue_date: invoice.issue_date,
            supplier: invoice.supplier,
            customer: invoice.customer
          });
        });
      }
      // Si es una sola factura
      else if (extractedData.invoice_number || extractedData.supplier || extractedData.customer) {
        invoices.push({
          invoice_number: extractedData.invoice_number,
          total_amount: parseFloat(extractedData.total_amount || extractedData.totals?.total || 0),
          issue_date: extractedData.issue_date,
          supplier: extractedData.supplier,
          customer: extractedData.customer
        });
      }

      console.log(`📋 [LinkerService] Extraídas ${invoices.length} facturas del documento`);
      return invoices;
    } catch (error) {
      console.error('❌ [LinkerService] Error extrayendo facturas:', error);
      return [];
    }
  }

  /**
   * Función principal: vincular documento con entidades
   */
  public async linkDocumentToEntities(jobId: string, extractedData: any): Promise<LinkingResult> {
    console.log(`🔗 [LinkerService] Iniciando vinculación para documento ${jobId}`);

    const result: LinkingResult = {
      success: false,
      job_id: jobId,
      supplier_links: [],
      customer_links: [],
      statistics_updated: false,
      errors: [],
      summary: {
        total_invoices: 0,
        successful_links: 0,
        failed_links: 0,
        new_entities_created: 0
      }
    };

    try {
      // Extraer facturas del documento
      const invoices = this.extractInvoicesFromDocument(extractedData);
      result.summary.total_invoices = invoices.length;

      if (invoices.length === 0) {
        result.errors.push('No se encontraron facturas válidas en el documento');
        return result;
      }

      // Realizar matching de entidades
      const matchingResults = await entityMatchingService.matchInvoiceEntities(invoices);

      // Procesar resultados de matching
      const supplierIds: (string | null)[] = [];
      const customerIds: (string | null)[] = [];
      const supplierConfidences: number[] = [];
      const customerConfidences: number[] = [];

      // Procesar proveedores
      for (let i = 0; i < matchingResults.suppliers.length; i++) {
        const supplierMatch = matchingResults.suppliers[i];
        const invoice = invoices[i];

        supplierIds.push(supplierMatch.entity_id);
        if (supplierMatch.matched) {
          supplierConfidences.push(supplierMatch.confidence);
          result.summary.successful_links++;
        } else {
          result.summary.failed_links++;
        }

        if (supplierMatch.created_new) {
          result.summary.new_entities_created++;
        }

        result.supplier_links.push({
          entity_id: supplierMatch.entity_id,
          confidence: supplierMatch.confidence,
          method: supplierMatch.match_method,
          created_new: supplierMatch.created_new
        });

        // Guardar log de auditoría
        await this.saveMatchingLog(jobId, 'supplier', supplierMatch, invoice.supplier);
      }

      // Procesar clientes
      for (let i = 0; i < matchingResults.customers.length; i++) {
        const customerMatch = matchingResults.customers[i];
        const invoice = invoices[i];

        customerIds.push(customerMatch.entity_id);
        if (customerMatch.matched) {
          supplierConfidences.push(customerMatch.confidence);
          result.summary.successful_links++;
        } else {
          result.summary.failed_links++;
        }

        if (customerMatch.created_new) {
          result.summary.new_entities_created++;
        }

        result.customer_links.push({
          entity_id: customerMatch.entity_id,
          confidence: customerMatch.confidence,
          method: customerMatch.match_method,
          created_new: customerMatch.created_new
        });

        // Guardar log de auditoría
        await this.saveMatchingLog(jobId, 'customer', customerMatch, invoice.customer);
      }

      // Actualizar documento con entidades vinculadas
      const documentUpdated = await this.updateDocumentWithEntities(
        jobId,
        supplierIds,
        customerIds,
        supplierConfidences,
        customerConfidences
      );

      if (!documentUpdated) {
        result.errors.push('Error actualizando documento con entidades vinculadas');
      }

      // Actualizar estadísticas de entidades
      const statsUpdated = await this.updateEntityStatistics(supplierIds, 'supplier') &&
                           await this.updateEntityStatistics(customerIds, 'customer');

      result.statistics_updated = statsUpdated;

      if (!statsUpdated) {
        result.errors.push('Error actualizando estadísticas de entidades');
      }

      result.success = documentUpdated && result.summary.total_invoices > 0;

      console.log(`🎯 [LinkerService] Vinculación completada para ${jobId}:`, result.summary);

    } catch (error) {
      console.error('❌ [LinkerService] Error en linkDocumentToEntities:', error);
      result.errors.push(`Error general: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }

    return result;
  }

  /**
   * Procesar documento existente (para migración histórica)
   */
  public async processExistingDocument(jobId: string): Promise<LinkingResult> {
    try {
      console.log(`🔄 [LinkerService] Procesando documento existente ${jobId}`);

      // Obtener datos del documento
      const { data, error } = await pgClient.query(
        'SELECT processed_json FROM documents WHERE job_id = $1',
        [jobId]
      );

      if (error || !data || data.length === 0) {
        console.error('❌ [LinkerService] Documento no encontrado:', jobId);
        return {
          success: false,
          job_id: jobId,
          supplier_links: [],
          customer_links: [],
          statistics_updated: false,
          errors: ['Documento no encontrado'],
          summary: { total_invoices: 0, successful_links: 0, failed_links: 0, new_entities_created: 0 }
        };
      }

      const extractedData = data[0].processed_json;
      return await this.linkDocumentToEntities(jobId, extractedData);

    } catch (error) {
      console.error('❌ [LinkerService] Error procesando documento existente:', error);
      return {
        success: false,
        job_id: jobId,
        supplier_links: [],
        customer_links: [],
        statistics_updated: false,
        errors: [`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`],
        summary: { total_invoices: 0, successful_links: 0, failed_links: 0, new_entities_created: 0 }
      };
    }
  }

  /**
   * Obtener estadísticas de vinculación
   */
  public async getLinkingStatistics(): Promise<{
    total_documents: number;
    linked_documents: number;
    unlinked_documents: number;
    auto_created_suppliers: number;
    auto_created_customers: number;
    matching_accuracy: number;
  }> {
    try {
      const { data } = await pgClient.query(`
        SELECT 
          COUNT(*) as total_documents,
          COUNT(CASE WHEN supplier_id IS NOT NULL OR customer_id IS NOT NULL THEN 1 END) as linked_documents,
          COUNT(CASE WHEN supplier_id IS NULL AND customer_id IS NULL THEN 1 END) as unlinked_documents,
          COUNT(CASE WHEN auto_created_supplier = true THEN 1 END) as auto_created_suppliers,
          COUNT(CASE WHEN auto_created_customer = true THEN 1 END) as auto_created_customers,
          AVG(COALESCE(supplier_match_confidence, 0) + COALESCE(customer_match_confidence, 0)) / 2 as avg_confidence
        FROM documents 
        WHERE status = 'completed'
      `);

      const stats = data?.[0] || {};
      
      return {
        total_documents: parseInt(stats.total_documents || '0'),
        linked_documents: parseInt(stats.linked_documents || '0'),
        unlinked_documents: parseInt(stats.unlinked_documents || '0'),
        auto_created_suppliers: parseInt(stats.auto_created_suppliers || '0'),
        auto_created_customers: parseInt(stats.auto_created_customers || '0'),
        matching_accuracy: parseFloat(stats.avg_confidence || '0')
      };
    } catch (error) {
      console.error('❌ [LinkerService] Error obteniendo estadísticas:', error);
      return {
        total_documents: 0,
        linked_documents: 0,
        unlinked_documents: 0,
        auto_created_suppliers: 0,
        auto_created_customers: 0,
        matching_accuracy: 0
      };
    }
  }
}

// Exportar instancia singleton
export const invoiceEntityLinkerService = new InvoiceEntityLinkerService();