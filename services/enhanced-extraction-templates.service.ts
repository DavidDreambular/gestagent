/**
 * Servicio mejorado de plantillas de extracción
 * Compatible con la estructura actual de la base de datos
 */

import pgClient from '@/lib/postgresql-client';
import { v4 as uuidv4 } from 'uuid';

export interface ExtractionTemplate {
  template_id: string;
  name: string;
  description?: string;
  document_type: string;
  supplier_id?: string;
  customer_id?: string;
  extraction_rules: {
    supplier?: {
      name_patterns: string[];
      nif_patterns: string[];
      address_patterns?: string[];
    };
    customer?: {
      name_patterns: string[];
      nif_patterns: string[];
      address_patterns?: string[];
    };
    invoice_number_patterns: string[];
    date_patterns: string[];
    total_amount_patterns: string[];
    tax_patterns?: string[];
    line_items_patterns?: string[];
    [key: string]: any;
  };
  confidence_threshold: number;
  is_active: boolean;
  usage_count: number;
  success_rate: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface DocumentProcessingResult {
  original_data: any;
  enhanced_data: any;
  template_applied?: string;
  confidence_boost: number;
  patterns_matched: string[];
}

export class EnhancedExtractionTemplatesService {
  
  /**
   * Buscar plantilla por información del proveedor
   */
  async findTemplateBySupplier(supplierName: string, supplierNif?: string): Promise<ExtractionTemplate | null> {
    try {
      console.log(`🔍 [Templates] Buscando plantilla para: ${supplierName} ${supplierNif ? `(${supplierNif})` : ''}`);
      
      // Primero buscar por NIF exacto
      if (supplierNif) {
        const { data: exactMatch } = await pgClient.query(`
          SELECT * FROM extraction_templates 
          WHERE is_active = true 
          AND extraction_rules->'supplier'->'nif_patterns' @> $1
          ORDER BY success_rate DESC, usage_count DESC
          LIMIT 1
        `, [JSON.stringify([supplierNif])]);
        
        if (exactMatch && exactMatch.length > 0) {
          console.log(`✅ [Templates] Plantilla encontrada por NIF: ${exactMatch[0].name}`);
          return this.parseTemplate(exactMatch[0]);
        }
      }
      
      // Buscar por nombre similar
      const { data: nameMatches } = await pgClient.query(`
        SELECT *, 
          CASE 
            WHEN extraction_rules->'supplier'->'name_patterns' IS NOT NULL THEN
              (SELECT COUNT(*) FROM jsonb_array_elements_text(extraction_rules->'supplier'->'name_patterns') AS pattern
               WHERE LOWER($1) LIKE LOWER('%' || pattern || '%') OR LOWER(pattern) LIKE LOWER('%' || $1 || '%'))
            ELSE 0
          END as pattern_matches
        FROM extraction_templates 
        WHERE is_active = true 
        AND document_type = 'factura'
        ORDER BY pattern_matches DESC, success_rate DESC, usage_count DESC
        LIMIT 5
      `, [supplierName]);
      
      if (nameMatches && nameMatches.length > 0) {
        // Verificar si hay matches reales de patrones
        for (const template of nameMatches) {
          if (template.pattern_matches > 0) {
            console.log(`✅ [Templates] Plantilla encontrada por nombre: ${template.name} (${template.pattern_matches} matches)`);
            return this.parseTemplate(template);
          }
        }
      }
      
      console.log(`❌ [Templates] No se encontró plantilla para: ${supplierName}`);
      return null;
      
    } catch (error) {
      console.error('❌ [Templates] Error buscando plantilla:', error);
      return null;
    }
  }
  
  /**
   * Aplicar plantilla a datos extraídos
   */
  async applyTemplate(template: ExtractionTemplate, extractedData: any): Promise<DocumentProcessingResult> {
    try {
      console.log(`📋 [Templates] Aplicando plantilla: ${template.name}`);
      
      const result: DocumentProcessingResult = {
        original_data: { ...extractedData },
        enhanced_data: { ...extractedData },
        template_applied: template.template_id,
        confidence_boost: 0,
        patterns_matched: []
      };
      
      // Aplicar patrones de extracción
      if (Array.isArray(extractedData)) {
        // Múltiples facturas
        result.enhanced_data = extractedData.map(invoice => 
          this.enhanceInvoiceData(invoice, template, result)
        );
      } else if (extractedData && typeof extractedData === 'object') {
        // Factura única
        result.enhanced_data = this.enhanceInvoiceData(extractedData, template, result);
      }
      
      // Actualizar estadísticas de uso
      await this.updateTemplateUsage(template.template_id);
      
      console.log(`✅ [Templates] Plantilla aplicada. Boost: +${(result.confidence_boost * 100).toFixed(1)}%`);
      
      return result;
      
    } catch (error) {
      console.error('❌ [Templates] Error aplicando plantilla:', error);
      return {
        original_data: extractedData,
        enhanced_data: extractedData,
        confidence_boost: 0,
        patterns_matched: []
      };
    }
  }
  
  /**
   * Mejorar datos de una factura individual usando plantilla
   */
  private enhanceInvoiceData(invoice: any, template: ExtractionTemplate, result: DocumentProcessingResult): any {
    const enhanced = { ...invoice };
    const rules = template.extraction_rules;
    
    // Marcar que se aplicó plantilla
    enhanced.template_applied = template.template_id;
    enhanced.template_name = template.name;
    
    // Incrementar confianza base
    const baseConfidence = enhanced.confidence || 0.5;
    enhanced.confidence = Math.min(baseConfidence + 0.15, 1.0);
    result.confidence_boost = 0.15;
    
    // Aplicar mejoras específicas según reglas
    if (rules.invoice_number_patterns && enhanced.invoice_number) {
      const pattern = this.testPatterns(enhanced.invoice_number, rules.invoice_number_patterns);
      if (pattern) {
        result.patterns_matched.push('invoice_number');
        enhanced.invoice_number_confidence = Math.min((enhanced.invoice_number_confidence || 0.5) + 0.2, 1.0);
      }
    }
    
    if (rules.total_amount_patterns && enhanced.totals?.total) {
      const amountStr = enhanced.totals.total.toString();
      const pattern = this.testPatterns(amountStr, rules.total_amount_patterns);
      if (pattern) {
        result.patterns_matched.push('total_amount');
        enhanced.totals.confidence = Math.min((enhanced.totals.confidence || 0.5) + 0.2, 1.0);
      }
    }
    
    if (rules.date_patterns && enhanced.issue_date) {
      const pattern = this.testPatterns(enhanced.issue_date, rules.date_patterns);
      if (pattern) {
        result.patterns_matched.push('issue_date');
        enhanced.date_confidence = Math.min((enhanced.date_confidence || 0.5) + 0.2, 1.0);
      }
    }
    
    // Mejorar información del proveedor
    if (rules.supplier && enhanced.supplier) {
      const supplierBoost = this.enhanceSupplierData(enhanced.supplier, rules.supplier);
      if (supplierBoost > 0) {
        result.patterns_matched.push('supplier');
        enhanced.supplier.confidence = Math.min((enhanced.supplier.confidence || 0.5) + supplierBoost, 1.0);
      }
    }
    
    return enhanced;
  }
  
  /**
   * Mejorar datos del proveedor
   */
  private enhanceSupplierData(supplier: any, rules: any): number {
    let boost = 0;
    
    if (rules.name_patterns && supplier.name) {
      const pattern = this.testPatterns(supplier.name, rules.name_patterns);
      if (pattern) boost += 0.15;
    }
    
    if (rules.nif_patterns && supplier.nif) {
      const pattern = this.testPatterns(supplier.nif, rules.nif_patterns);
      if (pattern) boost += 0.2;
    }
    
    if (rules.address_patterns && supplier.address) {
      const pattern = this.testPatterns(supplier.address, rules.address_patterns);
      if (pattern) boost += 0.1;
    }
    
    return boost;
  }
  
  /**
   * Probar patrones contra un texto
   */
  private testPatterns(text: string, patterns: string[]): string | null {
    for (const pattern of patterns) {
      try {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(text)) {
          return pattern;
        }
      } catch (error) {
        console.warn(`⚠️ [Templates] Patrón inválido: ${pattern}`);
      }
    }
    return null;
  }
  
  /**
   * Aprender de un documento procesado exitosamente
   */
  async learnFromDocument(supplierName: string, supplierNif: string, extractedData: any, successRate: number = 1.0): Promise<void> {
    try {
      console.log(`🧠 [Templates] Aprendiendo de documento: ${supplierName}`);
      
      // Buscar plantilla existente
      const existingTemplate = await this.findTemplateBySupplier(supplierName, supplierNif);
      
      if (existingTemplate) {
        // Actualizar estadísticas de plantilla existente
        await this.updateTemplateSuccess(existingTemplate.template_id, successRate);
        console.log(`📈 [Templates] Estadísticas actualizadas para: ${existingTemplate.name}`);
      } else {
        // Crear nueva plantilla automáticamente
        await this.createTemplateFromDocument(supplierName, supplierNif, extractedData);
        console.log(`🆕 [Templates] Nueva plantilla creada para: ${supplierName}`);
      }
      
    } catch (error) {
      console.error('❌ [Templates] Error en aprendizaje:', error);
    }
  }
  
  /**
   * Crear plantilla automáticamente desde documento
   */
  private async createTemplateFromDocument(supplierName: string, supplierNif: string, extractedData: any): Promise<void> {
    try {
      const templateId = uuidv4();
      
      // Extraer patrones básicos del documento
      const patterns = this.extractPatternsFromDocument(extractedData);
      
      const template = {
        template_id: templateId,
        name: `${supplierName} - Auto-generada`,
        description: `Plantilla generada automáticamente para ${supplierName}`,
        document_type: 'factura',
        extraction_rules: {
          supplier: {
            name_patterns: [supplierName.toUpperCase(), supplierName],
            nif_patterns: [supplierNif],
            address_patterns: []
          },
          ...patterns
        },
        confidence_threshold: 0.7,
        is_active: true,
        usage_count: 1,
        success_rate: 1.0,
        created_by: '00000000-0000-0000-0000-000000000000'
      };
      
      await pgClient.query(`
        INSERT INTO extraction_templates (
          template_id, name, description, document_type, extraction_rules,
          confidence_threshold, is_active, usage_count, success_rate,
          created_at, updated_at, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), $10)
      `, [
        template.template_id,
        template.name,
        template.description,
        template.document_type,
        JSON.stringify(template.extraction_rules),
        template.confidence_threshold,
        template.is_active,
        template.usage_count,
        template.success_rate,
        template.created_by
      ]);
      
      console.log(`✅ [Templates] Plantilla auto-generada creada: ${template.name}`);
      
    } catch (error) {
      console.error('❌ [Templates] Error creando plantilla automática:', error);
    }
  }
  
  /**
   * Extraer patrones básicos de un documento
   */
  private extractPatternsFromDocument(extractedData: any): any {
    const patterns: any = {
      invoice_number_patterns: [],
      date_patterns: [],
      total_amount_patterns: [],
      tax_patterns: []
    };
    
    // Si es array, usar el primer elemento
    const invoice = Array.isArray(extractedData) ? extractedData[0] : extractedData;
    
    if (invoice) {
      // Patrones de número de factura
      if (invoice.invoice_number) {
        patterns.invoice_number_patterns.push(`${invoice.invoice_number.replace(/[0-9]/g, '[0-9]')}`);
      }
      
      // Patrones de fecha
      if (invoice.issue_date) {
        const datePattern = invoice.issue_date.replace(/\d/g, '\\d').replace(/\//g, '[/\\-]');
        patterns.date_patterns.push(datePattern);
      }
      
      // Patrones de importe
      if (invoice.totals?.total) {
        const amountPattern = `([0-9,.]+)`;
        patterns.total_amount_patterns.push(amountPattern);
      }
    }
    
    return patterns;
  }
  
  /**
   * Actualizar estadísticas de uso
   */
  private async updateTemplateUsage(templateId: string): Promise<void> {
    try {
      await pgClient.query(`
        UPDATE extraction_templates 
        SET usage_count = usage_count + 1,
            last_used_at = NOW(),
            updated_at = NOW()
        WHERE template_id = $1
      `, [templateId]);
    } catch (error) {
      console.error('❌ [Templates] Error actualizando uso:', error);
    }
  }
  
  /**
   * Actualizar tasa de éxito
   */
  private async updateTemplateSuccess(templateId: string, successRate: number): Promise<void> {
    try {
      await pgClient.query(`
        UPDATE extraction_templates 
        SET success_rate = (success_rate * usage_count + $2) / (usage_count + 1),
            usage_count = usage_count + 1,
            last_used_at = NOW(),
            updated_at = NOW()
        WHERE template_id = $1
      `, [templateId, successRate]);
    } catch (error) {
      console.error('❌ [Templates] Error actualizando éxito:', error);
    }
  }
  
  /**
   * Parsear plantilla desde BD
   */
  private parseTemplate(row: any): ExtractionTemplate {
    return {
      ...row,
      extraction_rules: typeof row.extraction_rules === 'string' 
        ? JSON.parse(row.extraction_rules) 
        : row.extraction_rules
    };
  }
  
  /**
   * Obtener estadísticas del sistema de plantillas
   */
  async getTemplateStatistics(): Promise<any> {
    try {
      const { data } = await pgClient.query(`
        SELECT 
          COUNT(*) as total_templates,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_templates,
          ROUND(AVG(success_rate)::numeric, 3) as avg_success_rate,
          SUM(usage_count) as total_usage,
          MAX(last_used_at) as last_activity
        FROM extraction_templates
      `);
      
      return data[0] || {};
    } catch (error) {
      console.error('❌ [Templates] Error obteniendo estadísticas:', error);
      return {};
    }
  }
  
  /**
   * Listar todas las plantillas activas
   */
  async getActiveTemplates(): Promise<ExtractionTemplate[]> {
    try {
      const { data } = await pgClient.query(`
        SELECT * FROM extraction_templates 
        WHERE is_active = true 
        ORDER BY success_rate DESC, usage_count DESC
      `);
      
      return data.map(row => this.parseTemplate(row));
    } catch (error) {
      console.error('❌ [Templates] Error listando plantillas:', error);
      return [];
    }
  }
}

// Singleton
export const enhancedTemplatesService = new EnhancedExtractionTemplatesService();