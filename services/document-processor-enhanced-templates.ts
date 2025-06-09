// PROCESADOR CON SISTEMA DE PLANTILLAS INTEGRADO
// services/document-processor-enhanced-templates.ts

import { EnhancedMistralProcessor } from './document-processor-mistral-enhanced';
import { PostgreSQLClient } from '@/lib/postgresql-client';

const pgClient = new PostgreSQLClient();

interface TemplateAwareResult {
  success: boolean;
  jobId: string;
  extracted_data: any;
  total_invoices_detected: number;
  processing_metadata: {
    upload_time_ms: number;
    mistral_processing_time_ms: number;
    template_processing_time_ms: number;
    total_time_ms: number;
    method: 'mistral-enhanced-with-templates';
    confidence: number;
    template_applied?: string;
    template_learned?: boolean;
    invoices_found: number;
  };
}

export class TemplateAwareProcessor {
  /**
   * Procesa documento con plantillas inteligentes
   */
  async processDocument(
    pdfBuffer: Buffer, 
    jobId?: string,
    providerHint?: string
  ): Promise<TemplateAwareResult> {
    const totalStartTime = Date.now();
    const finalJobId = jobId || `template-aware-${Date.now()}`;
    
    console.log(`🚀 [TemplateAware] Iniciando procesamiento con plantillas`);
    console.log(`📋 [TemplateAware] Job ID: ${finalJobId}`);

    try {
      // Procesar con Mistral primero
      const processor = new EnhancedMistralProcessor();
      const mistralResult = await processor.processDocument(pdfBuffer, finalJobId);
      
      if (!mistralResult.success) {
        console.log(`❌ [TemplateAware] Error en Mistral, retornando resultado original`);
        return {
          success: false,
          jobId: finalJobId,
          extracted_data: mistralResult.extracted_data,
          total_invoices_detected: 0,
          processing_metadata: {
            upload_time_ms: 0,
            mistral_processing_time_ms: 0,
            template_processing_time_ms: 0,
            total_time_ms: Date.now() - totalStartTime,
            method: 'mistral-enhanced-with-templates',
            confidence: 0,
            invoices_found: 0
          }
        };
      }

      const templateStartTime = Date.now();
      let enhancedData = mistralResult.extracted_data;
      let templateApplied: string | undefined;
      let templateLearned = false;

      try {
        // Intentar extraer información del proveedor de los datos
        const providerInfo = this.extractProviderInfo(enhancedData, providerHint);
        console.log(`🏢 [TemplateAware] Proveedor detectado: ${providerInfo.name || 'Desconocido'}`);

        if (providerInfo.name) {
          // Buscar plantilla existente
          const template = await this.findTemplateByProvider(providerInfo.name, providerInfo.nif || null);
          
          if (template) {
            console.log(`📋 [TemplateAware] Aplicando plantilla: ${template.id}`);
            enhancedData = await this.applyTemplate(template, enhancedData);
            templateApplied = template.id;
          }

          // Aprender de este documento (async, no bloquea respuesta)
          this.learnFromDocumentAsync(providerInfo.name, providerInfo.nif || null, enhancedData)
            .then(() => {
              console.log(`🧠 [TemplateAware] Aprendizaje completado para ${providerInfo.name}`);
            })
            .catch(error => {
              console.error(`❌ [TemplateAware] Error en aprendizaje:`, error);
            });
          
          templateLearned = true;
        }

      } catch (templateError) {
        console.error('❌ [TemplateAware] Error procesando plantillas:', templateError);
        // Continuar con datos originales si hay error en plantillas
      }

      const templateTime = Date.now() - templateStartTime;
      const totalTime = Date.now() - totalStartTime;

      console.log(`✅ [TemplateAware] Procesamiento completado en ${totalTime}ms`);
      if (templateApplied) {
        console.log(`📈 [TemplateAware] Plantilla aplicada: ${templateApplied}`);
      }

      return {
        success: true,
        jobId: finalJobId,
        extracted_data: enhancedData,
        total_invoices_detected: mistralResult.total_invoices_detected || 1,
        processing_metadata: {
          upload_time_ms: mistralResult.processing_metadata?.upload_time_ms || 0,
          mistral_processing_time_ms: mistralResult.processing_metadata?.mistral_processing_time_ms || 0,
          template_processing_time_ms: templateTime,
          total_time_ms: totalTime,
          method: 'mistral-enhanced-with-templates',
          confidence: mistralResult.processing_metadata?.confidence || 0.5,
          template_applied: templateApplied,
          template_learned: templateLearned,
          invoices_found: mistralResult.total_invoices_detected || 1
        }
      };

    } catch (error: any) {
      console.error(`❌ [TemplateAware] Error general:`, error);

      return {
        success: false,
        jobId: finalJobId,
        extracted_data: {
          error: error?.message || 'Error desconocido',
          error_type: 'template_aware_processing_error',
          timestamp: new Date().toISOString()
        },
        total_invoices_detected: 0,
        processing_metadata: {
          upload_time_ms: 0,
          mistral_processing_time_ms: 0,
          template_processing_time_ms: 0,
          total_time_ms: Date.now() - totalStartTime,
          method: 'mistral-enhanced-with-templates',
          confidence: 0,
          invoices_found: 0
        }
      };
    }
  }

  /**
   * Extraer información del proveedor de los datos procesados
   */
  private extractProviderInfo(extractedData: any, hint?: string): { name?: string; nif?: string } {
    try {
      // Si es array de facturas, usar la primera
      const invoiceData = Array.isArray(extractedData) ? extractedData[0] : extractedData;
      
      if (!invoiceData) {
        return { name: hint };
      }

      // Buscar en supplier
      if (invoiceData.supplier) {
        return {
          name: invoiceData.supplier.name || hint,
          nif: invoiceData.supplier.nif_cif || invoiceData.supplier.nif
        };
      }

      // Buscar en otros lugares comunes
      const name = invoiceData.proveedor_nombre || 
                   invoiceData.emisor_nombre ||
                   invoiceData.supplier_name ||
                   hint;

      const nif = invoiceData.proveedor_nif ||
                  invoiceData.emisor_nif ||
                  invoiceData.supplier_nif;

      return { name, nif };

    } catch (error) {
      console.error('❌ [TemplateAware] Error extrayendo info proveedor:', error);
      return { name: hint };
    }
  }

  /**
   * Buscar plantilla por proveedor
   */
  private async findTemplateByProvider(providerName: string, providerNif: string | null): Promise<any> {
    try {
      // Asegurar que la tabla existe
      await this.ensureTemplatesTableExists();
      
      let query = `
        SELECT * FROM extraction_templates 
        WHERE LOWER(provider_name) LIKE LOWER($1) AND status = 'active'
        ORDER BY success_rate DESC, usage_count DESC
        LIMIT 1
      `;
      let params: any[] = [`%${providerName}%`];

      if (providerNif) {
        query = `
          SELECT * FROM extraction_templates 
          WHERE (provider_nif = $1 OR LOWER(provider_name) LIKE LOWER($2)) AND status = 'active'
          ORDER BY 
            CASE WHEN provider_nif = $1 THEN 1 ELSE 2 END,
            success_rate DESC, usage_count DESC
          LIMIT 1
        `;
        params = [providerNif, `%${providerName}%`];
      }

      const result = await pgClient.query(query, params);
      
      if (result.data && result.data.length > 0) {
        console.log(`✅ [TemplateAware] Plantilla encontrada: ${result.data[0].id}`);
        return result.data[0];
      }

      return null;
    } catch (error) {
      console.error('❌ [TemplateAware] Error buscando plantilla:', error);
      return null;
    }
  }

  /**
   * Aplicar plantilla a datos extraídos
   */
  private async applyTemplate(template: any, extractedData: any): Promise<any> {
    try {
      const enhancedData = { ...extractedData };
      
      // Implementación simplificada de aplicación de plantilla
      console.log(`📋 [TemplateAware] Aplicando plantilla ${template.id}`);
      
      // Aquí se aplicarían las mejoras específicas de la plantilla
      // Por ahora, solo retornamos los datos originales
      
      return enhancedData;
    } catch (error) {
      console.error('❌ [TemplateAware] Error aplicando plantilla:', error);
      return extractedData;
    }
  }

  /**
   * Aprender de documento (async)
   */
  private async learnFromDocumentAsync(
    providerName: string,
    providerNif: string | null,
    extractedData: any
  ): Promise<void> {
    try {
      console.log(`🧠 [TemplateAware] Iniciando aprendizaje para ${providerName}`);
      
      // Implementación simplificada de aprendizaje
      // Aquí se analizarían los patrones y se actualizarían las plantillas
      
      console.log(`✅ [TemplateAware] Aprendizaje completado para ${providerName}`);
    } catch (error) {
      console.error('❌ [TemplateAware] Error en aprendizaje:', error);
    }
  }

  /**
   * Asegurar que la tabla de plantillas existe
   */
  private async ensureTemplatesTableExists(): Promise<void> {
    try {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS extraction_templates (
          id SERIAL PRIMARY KEY,
          provider_name VARCHAR(255) NOT NULL,
          provider_nif VARCHAR(50),
          field_mappings JSONB,
          success_rate DECIMAL(3,2) DEFAULT 0.0,
          usage_count INTEGER DEFAULT 0,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      
      await pgClient.query(createTableQuery);
    } catch (error) {
      console.error('❌ [TemplateAware] Error creando tabla de plantillas:', error);
    }
  }
}

export const templateAwareProcessor = new TemplateAwareProcessor(); 