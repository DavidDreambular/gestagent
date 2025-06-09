// Servicio de plantillas de extracción por proveedor

import { postgresqlClient } from '@/lib/postgresql-client';

// Interfaces para el sistema de plantillas
export interface ExtractorTemplate {
  id: string;
  provider_name: string;
  provider_tax_id?: string;
  document_type: 'invoice' | 'payslip' | 'receipt';
  field_mappings: Record<string, FieldMapping>;
  confidence_threshold: number;
  usage_count: number;
  success_rate: number;
  created_at: string;
  updated_at: string;
  last_used: string;
  status: 'active' | 'learning' | 'deprecated';
}

export interface FieldMapping {
  json_path: string;
  confidence_score: number;
  validation_rules?: ValidationRule[];
  transformation?: string;
}

export interface ValidationRule {
  type: 'regex' | 'range' | 'format' | 'required';
  value: string | number | boolean;
  message: string;
}

export interface TemplateMatchResult {
  template: ExtractorTemplate | null;
  confidence: number;
  matched_fields: string[];
  suggested_improvements: string[];
}

export interface LearningData {
  original_extraction: Record<string, any>;
  manual_corrections: Record<string, any>;
  user_id: string;
  document_metadata: {
    provider_name?: string;
    provider_tax_id?: string;
    document_type: string;
  };
}

/**
 * Servicio para gestionar plantillas de extracción de datos
 * Aprende de las correcciones manuales para mejorar futuras extracciones
 */
export class ExtractionTemplateService {
  
  /**
   * Busca plantillas por proveedor y tipo de documento
   */
  async findTemplateByProvider(
    providerName: string, 
    taxId?: string, 
    documentType?: string
  ): Promise<TemplateMatchResult> {
    try {
      // Búsqueda exacta por NIF primero
      let template = null;
      if (taxId) {
        const exactMatch = await postgresqlClient.query<ExtractorTemplate>(
          `SELECT * FROM extraction_templates 
           WHERE provider_tax_id = $1 
           AND ($2::text IS NULL OR document_type = $2)
           AND status = 'active'
           ORDER BY success_rate DESC, usage_count DESC 
           LIMIT 1`,
          [taxId, documentType]
        );
        template = exactMatch.data?.[0];
      }

      // Si no hay match exacto, buscar por nombre con fuzzy matching
      if (!template) {
        const fuzzyMatch = await postgresqlClient.query<ExtractorTemplate>(
          `SELECT *, 
           similarity(provider_name, $1) as sim_score
           FROM extraction_templates 
           WHERE similarity(provider_name, $1) > 0.3
           AND ($2::text IS NULL OR document_type = $2)
           AND status = 'active'
           ORDER BY sim_score DESC, success_rate DESC 
           LIMIT 1`,
          [providerName, documentType]
        );
        template = fuzzyMatch.data?.[0];
      }

      if (!template) {
        return {
          template: null,
          confidence: 0,
          matched_fields: [],
          suggested_improvements: ['No hay plantillas disponibles para este proveedor']
        };
      }

      // Calcular confianza basada en similitud y éxito histórico
      const confidence = this.calculateConfidence(template, providerName, taxId);

      return {
        template,
        confidence,
        matched_fields: Object.keys(template.field_mappings),
        suggested_improvements: this.generateSuggestions(template, confidence)
      };

    } catch (error) {
      console.error('❌ [Templates] Error buscando plantilla:', error);
      return {
        template: null,
        confidence: 0,
        matched_fields: [],
        suggested_improvements: ['Error al buscar plantillas']
      };
    }
  }

  /**
   * Aplica una plantilla a datos extraídos en crudo
   */
  async applyTemplate(
    rawData: Record<string, any>, 
    template: ExtractorTemplate
  ): Promise<{ processedData: Record<string, any>; confidence: number }> {
    const processedData: Record<string, any> = { ...rawData };
    let totalConfidence = 0;
    let fieldCount = 0;

    for (const [fieldName, mapping] of Object.entries(template.field_mappings)) {
      try {
        const value = this.extractValueByPath(rawData, mapping.json_path);
        
        if (value !== undefined) {
          // Aplicar transformaciones si existen
          const transformedValue = mapping.transformation 
            ? this.applyTransformation(value, mapping.transformation)
            : value;

          // Validar el valor
          const isValid = this.validateField(transformedValue, mapping.validation_rules);
          
          if (isValid) {
            processedData[fieldName] = transformedValue;
            totalConfidence += mapping.confidence_score;
            fieldCount++;
          }
        }
      } catch (error) {
        console.warn(`⚠️ [Templates] Error procesando campo ${fieldName}:`, error);
      }
    }

    const avgConfidence = fieldCount > 0 ? totalConfidence / fieldCount : 0;

    // Actualizar estadísticas de uso
    await this.updateTemplateUsage(template.id, avgConfidence > 0.7);

    return {
      processedData,
      confidence: avgConfidence
    };
  }

  /**
   * Aprende de correcciones manuales para crear/mejorar plantillas
   */
  async learnFromCorrections(learningData: LearningData): Promise<boolean> {
    try {
      const { original_extraction, manual_corrections, document_metadata } = learningData;
      
      // Buscar plantilla existente
      const existingTemplate = await this.findTemplateByProvider(
        document_metadata.provider_name || '',
        document_metadata.provider_tax_id,
        document_metadata.document_type
      );

      if (existingTemplate.template) {
        // Actualizar plantilla existente
        await this.updateTemplateFromLearning(existingTemplate.template, learningData);
      } else {
        // Crear nueva plantilla
        await this.createTemplateFromLearning(learningData);
      }

      return true;
    } catch (error) {
      console.error('❌ [Templates] Error en aprendizaje:', error);
      return false;
    }
  }

  /**
   * Crea nueva plantilla desde datos de aprendizaje
   */
  private async createTemplateFromLearning(learningData: LearningData): Promise<void> {
    const { manual_corrections, document_metadata } = learningData;
    
    // Generar mappings basados en correcciones
    const fieldMappings: Record<string, FieldMapping> = {};
    
    for (const [fieldName, correctedValue] of Object.entries(manual_corrections)) {
      // Intentar encontrar el path en la extracción original
      const jsonPath = this.findPathInObject(learningData.original_extraction, correctedValue);
      
      fieldMappings[fieldName] = {
        json_path: jsonPath || `$.${fieldName}`,
        confidence_score: 0.8, // Confianza inicial moderada
        validation_rules: this.generateValidationRules(fieldName, correctedValue)
      };
    }

    const newTemplate: Partial<ExtractorTemplate> = {
      provider_name: document_metadata.provider_name || 'Proveedor Desconocido',
      provider_tax_id: document_metadata.provider_tax_id,
      document_type: document_metadata.document_type as any,
      field_mappings: fieldMappings,
      confidence_threshold: 0.6,
      usage_count: 1,
      success_rate: 1.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_used: new Date().toISOString(),
      status: 'learning'
    };

    await postgresqlClient.query(
      `INSERT INTO extraction_templates 
       (provider_name, provider_tax_id, document_type, field_mappings, 
        confidence_threshold, usage_count, success_rate, created_at, updated_at, last_used, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        newTemplate.provider_name,
        newTemplate.provider_tax_id,
        newTemplate.document_type,
        JSON.stringify(newTemplate.field_mappings),
        newTemplate.confidence_threshold,
        newTemplate.usage_count,
        newTemplate.success_rate,
        newTemplate.created_at,
        newTemplate.updated_at,
        newTemplate.last_used,
        newTemplate.status
      ]
    );

    console.log('✅ [Templates] Nueva plantilla creada para:', newTemplate.provider_name);
  }

  /**
   * Actualiza plantilla existente con nuevos datos de aprendizaje
   */
  private async updateTemplateFromLearning(
    template: ExtractorTemplate, 
    learningData: LearningData
  ): Promise<void> {
    const { manual_corrections } = learningData;
    
    // Mejorar mappings existentes
    const updatedMappings = { ...template.field_mappings };
    
    for (const [fieldName, correctedValue] of Object.entries(manual_corrections)) {
      if (updatedMappings[fieldName]) {
        // Actualizar confianza basada en éxito/fallo
        const currentMapping = updatedMappings[fieldName];
        const originalValue = this.extractValueByPath(learningData.original_extraction, currentMapping.json_path);
        
        if (originalValue === correctedValue) {
          // Éxito: aumentar confianza
          currentMapping.confidence_score = Math.min(1.0, currentMapping.confidence_score + 0.1);
        } else {
          // Fallo: disminuir confianza y buscar nuevo path
          currentMapping.confidence_score = Math.max(0.1, currentMapping.confidence_score - 0.1);
          const newPath = this.findPathInObject(learningData.original_extraction, correctedValue);
          if (newPath) {
            currentMapping.json_path = newPath;
            currentMapping.confidence_score = 0.7; // Reset a confianza moderada
          }
        }
      } else {
        // Nuevo campo: agregar mapping
        const jsonPath = this.findPathInObject(learningData.original_extraction, correctedValue);
        updatedMappings[fieldName] = {
          json_path: jsonPath || `$.${fieldName}`,
          confidence_score: 0.7,
          validation_rules: this.generateValidationRules(fieldName, correctedValue)
        };
      }
    }

    // Actualizar base de datos
    await postgresqlClient.query(
      `UPDATE extraction_templates 
       SET field_mappings = $1, updated_at = $2, last_used = $3
       WHERE id = $4`,
      [
        JSON.stringify(updatedMappings),
        new Date().toISOString(),
        new Date().toISOString(),
        template.id
      ]
    );

    console.log('✅ [Templates] Plantilla actualizada:', template.provider_name);
  }

  // Métodos auxiliares
  private calculateConfidence(
    template: ExtractorTemplate, 
    providerName: string, 
    taxId?: string
  ): number {
    let baseConfidence = template.success_rate;
    
    // Bonus por match exacto de NIF
    if (taxId && template.provider_tax_id === taxId) {
      baseConfidence += 0.2;
    }
    
    // Penalización por diferencia en nombre
    const nameSimilarity = this.calculateStringSimilarity(template.provider_name, providerName);
    baseConfidence *= nameSimilarity;
    
    return Math.min(1.0, baseConfidence);
  }

  private generateSuggestions(template: ExtractorTemplate, confidence: number): string[] {
    const suggestions: string[] = [];
    
    if (confidence < 0.6) {
      suggestions.push('Baja confianza en la plantilla. Revisar resultados manualmente.');
    }
    
    if (template.usage_count < 5) {
      suggestions.push('Plantilla nueva. Los resultados mejorarán con más uso.');
    }
    
    if (template.success_rate < 0.8) {
      suggestions.push('Plantilla con errores frecuentes. Considerar corrección manual.');
    }
    
    return suggestions;
  }

  private extractValueByPath(obj: any, path: string): any {
    try {
      // Implementación simple de JSONPath
      const keys = path.replace(/^\$\./, '').split('.');
      let current = obj;
      
      for (const key of keys) {
        if (current && typeof current === 'object') {
          current = current[key];
        } else {
          return undefined;
        }
      }
      
      return current;
    } catch {
      return undefined;
    }
  }

  private applyTransformation(value: any, transformation: string): any {
    try {
      switch (transformation) {
        case 'uppercase':
          return String(value).toUpperCase();
        case 'lowercase':
          return String(value).toLowerCase();
        case 'trim':
          return String(value).trim();
        case 'number':
          return parseFloat(String(value).replace(/[^0-9.-]/g, ''));
        case 'date':
          return new Date(value).toISOString().split('T')[0];
        default:
          return value;
      }
    } catch {
      return value;
    }
  }

  private validateField(value: any, rules?: ValidationRule[]): boolean {
    if (!rules) return true;
    
    return rules.every(rule => {
      switch (rule.type) {
        case 'required':
          return value !== undefined && value !== null && value !== '';
        case 'regex':
          return new RegExp(String(rule.value)).test(String(value));
        case 'range':
          const num = parseFloat(String(value));
          return !isNaN(num) && num >= (rule.value as number);
        default:
          return true;
      }
    });
  }

  private findPathInObject(obj: any, targetValue: any, currentPath = '$'): string | null {
    if (obj === targetValue) {
      return currentPath;
    }
    
    if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        const foundPath = this.findPathInObject(value, targetValue, `${currentPath}.${key}`);
        if (foundPath) {
          return foundPath;
        }
      }
    }
    
    return null;
  }

  private generateValidationRules(fieldName: string, value: any): ValidationRule[] {
    const rules: ValidationRule[] = [
      { type: 'required', value: true, message: `${fieldName} es requerido` }
    ];
    
    // Reglas específicas por tipo de campo
    if (fieldName.includes('email')) {
      rules.push({
        type: 'regex',
        value: '^[^@]+@[^@]+\.[^@]+$',
        message: 'Formato de email inválido'
      });
    } else if (fieldName.includes('nif') || fieldName.includes('tax_id')) {
      rules.push({
        type: 'regex',
        value: '^[A-Z0-9]{8,}$',
        message: 'Formato de NIF inválido'
      });
    } else if (fieldName.includes('amount') || fieldName.includes('total')) {
      rules.push({
        type: 'range',
        value: 0,
        message: 'El importe debe ser positivo'
      });
    }
    
    return rules;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Implementación simple de distancia de Levenshtein normalizada
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));
    
    for (let i = 0; i <= len1; matrix[0][i] = i, i++);
    for (let j = 0; j <= len2; matrix[j][0] = j, j++);
    
    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1,     // deletion
          matrix[j][i - 1] + 1,     // insertion
          matrix[j - 1][i - 1] + cost // substitution
        );
      }
    }
    
    const distance = matrix[len2][len1];
    return 1 - distance / Math.max(len1, len2);
  }

  private async updateTemplateUsage(templateId: string, success: boolean): Promise<void> {
    try {
      await postgresqlClient.query(
        `UPDATE extraction_templates 
         SET usage_count = usage_count + 1,
             success_rate = CASE 
               WHEN $2 THEN LEAST(1.0, success_rate + 0.05)
               ELSE GREATEST(0.0, success_rate - 0.05)
             END,
             last_used = $3
         WHERE id = $1`,
        [templateId, success, new Date().toISOString()]
      );
    } catch (error) {
      console.error('❌ [Templates] Error actualizando uso:', error);
    }
  }
}

// Exportar instancia singleton
export const extractionTemplateService = new ExtractionTemplateService();

// Funciones de conveniencia
export const findTemplate = (providerName: string, taxId?: string, docType?: string) =>
  extractionTemplateService.findTemplateByProvider(providerName, taxId, docType);

export const applyTemplate = (data: Record<string, any>, template: ExtractorTemplate) =>
  extractionTemplateService.applyTemplate(data, template);

export const learnFromCorrections = (learningData: LearningData) =>
  extractionTemplateService.learnFromCorrections(learningData);
