import { PostgreSQLClient } from '@/lib/postgresql-client';

const pgClient = new PostgreSQLClient();

export interface ExtractionTemplate {
  id: string;
  provider_name: string;
  provider_nif?: string;
  field_mappings: {
    // Patrones de ubicación de campos comunes
    invoice_number_patterns: string[];
    date_patterns: string[];
    total_amount_patterns: string[];
    tax_patterns: string[];
    // Coordenadas aproximadas de campos en el documento
    field_positions?: {
      [fieldName: string]: {
        x: number;
        y: number;
        width: number;
        height: number;
        confidence: number;
      };
    };
  };
  confidence_threshold: number;
  usage_count: number;
  success_rate: number;
  created_at: string;
  updated_at: string;
  status: 'active' | 'learning' | 'deprecated';
}

export interface DocumentPattern {
  field_name: string;
  extracted_value: string;
  pattern_used: string;
  confidence: number;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export class ExtractionTemplatesService {
  
  /**
   * Buscar plantilla por proveedor
   */
  async findTemplateByProvider(providerName: string, providerNif?: string): Promise<ExtractionTemplate | null> {
    try {
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
        const template = result.data[0];
        // Parsear field_mappings si es string
        if (typeof template.field_mappings === 'string') {
          template.field_mappings = JSON.parse(template.field_mappings);
        }
        return template;
      }

      return null;
    } catch (error) {
      console.error('❌ [Templates] Error buscando plantilla:', error);
      return null;
    }
  }

  /**
   * Aplicar plantilla a datos extraídos
   */
  async applyTemplate(template: ExtractionTemplate, extractedData: any): Promise<any> {
    try {
      console.log(`📋 [Templates] Aplicando plantilla: ${template.id}`);
      
      const enhancedData = { ...extractedData };
      
      // Marcar que se aplicó una plantilla
      if (Array.isArray(enhancedData)) {
        enhancedData.forEach((item: any) => {
          if (item && typeof item === 'object') {
            item.template_applied = template.id;
            item.confidence = Math.min((item.confidence || 0.5) + 0.15, 1.0);
          }
        });
      } else if (enhancedData && typeof enhancedData === 'object') {
        enhancedData.template_applied = template.id;
        enhancedData.confidence = Math.min((enhancedData.confidence || 0.5) + 0.15, 1.0);
      }

      // Actualizar estadísticas de uso
      await this.updateTemplateUsage(template.id);
      
      return enhancedData;
    } catch (error) {
      console.error('❌ [Templates] Error aplicando plantilla:', error);
      return extractedData;
    }
  }

  /**
   * Aprender de un documento procesado
   */
  async learnFromDocument(
    providerName: string,
    providerNif: string | null,
    extractedData: any,
    correctedData?: any
  ): Promise<void> {
    try {
      console.log(`🧠 [Templates] Aprendiendo de documento para ${providerName}`);
      
      // Buscar plantilla existente
      const existingTemplate = await this.findTemplateByProvider(providerName, providerNif || undefined);
      
      if (existingTemplate) {
        // Actualizar plantilla existente
        await this.updateTemplateSuccess(existingTemplate.id);
      } else {
        // Crear nueva plantilla
        await this.createNewTemplate(providerName, providerNif, extractedData);
      }
      
    } catch (error) {
      console.error('❌ [Templates] Error en aprendizaje:', error);
    }
  }

  /**
   * Crear nueva plantilla
   */
  private async createNewTemplate(
    providerName: string,
    providerNif: string | null,
    extractedData: any
  ): Promise<void> {
    try {
      const templateId = `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      
      const fieldMappings = {
        invoice_number_patterns: ['\\d+'],
        date_patterns: ['\\d{1,2}/\\d{1,2}/\\d{4}', '\\d{2}-\\d{2}-\\d{4}'],
        total_amount_patterns: ['TOTAL[:\\s]+(\\d+[.,]\\d+)', 'IMPORTE[:\\s]+(\\d+[.,]\\d+)'],
        tax_patterns: ['IVA[:\\s]+(\\d+[.,]\\d+)', '21%[:\\s]+(\\d+[.,]\\d+)']
      };

      const insertQuery = `
        INSERT INTO extraction_templates (
          id, provider_name, provider_nif, field_mappings, 
          confidence_threshold, usage_count, success_rate, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      `;

      await pgClient.query(insertQuery, [
        templateId,
        providerName,
        providerNif,
        JSON.stringify(fieldMappings),
        0.7,
        1,
        1.0,
        'learning'
      ]);

      console.log(`🆕 [Templates] Nueva plantilla creada: ${templateId}`);
    } catch (error) {
      console.error('❌ [Templates] Error creando plantilla:', error);
    }
  }

  /**
   * Actualizar estadísticas de uso
   */
  private async updateTemplateUsage(templateId: string): Promise<void> {
    try {
      await pgClient.query(
        'UPDATE extraction_templates SET usage_count = usage_count + 1, updated_at = NOW() WHERE id = $1',
        [templateId]
      );
    } catch (error) {
      console.error('❌ [Templates] Error actualizando uso:', error);
    }
  }

  /**
   * Actualizar tasa de éxito
   */
  private async updateTemplateSuccess(templateId: string): Promise<void> {
    try {
      await pgClient.query(`
        UPDATE extraction_templates 
        SET 
          usage_count = usage_count + 1,
          success_rate = LEAST(success_rate + 0.02, 1.0),
          updated_at = NOW(),
          status = CASE 
            WHEN usage_count >= 5 AND success_rate >= 0.8 THEN 'active'
            ELSE status 
          END
        WHERE id = $1
      `, [templateId]);
    } catch (error) {
      console.error('❌ [Templates] Error actualizando éxito:', error);
    }
  }

  /**
   * Obtener estadísticas de plantillas
   */
  async getTemplateStats(): Promise<any> {
    try {
      const result = await pgClient.query(`
        SELECT 
          COUNT(*) as total_templates,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_templates,
          COUNT(CASE WHEN status = 'learning' THEN 1 END) as learning_templates,
          AVG(success_rate) as avg_success_rate,
          SUM(usage_count) as total_usage
        FROM extraction_templates
      `);

      return result.data?.[0] || {
        total_templates: 0,
        active_templates: 0,
        learning_templates: 0,
        avg_success_rate: 0,
        total_usage: 0
      };
    } catch (error) {
      console.error('❌ [Templates] Error obteniendo estadísticas:', error);
      return null;
    }
  }

  /**
   * Listar plantillas activas
   */
  async getActiveTemplates(): Promise<ExtractionTemplate[]> {
    try {
      const result = await pgClient.query(
        `SELECT * FROM extraction_templates 
         WHERE status = 'active' 
         ORDER BY success_rate DESC, usage_count DESC`
      );

      return result.data || [];
    } catch (error) {
      console.error('❌ [Templates] Error listando plantillas:', error);
      return [];
    }
  }

  /**
   * Obtener plantilla por ID
   */
  async getTemplateById(id: string): Promise<ExtractionTemplate | null> {
    try {
      const result = await pgClient.query(
        'SELECT * FROM extraction_templates WHERE id = $1',
        [id]
      );
      
      if (result.data && result.data.length > 0) {
        const template = result.data[0];
        if (typeof template.field_mappings === 'string') {
          template.field_mappings = JSON.parse(template.field_mappings);
        }
        return template;
      }
      
      return null;
    } catch (error) {
      console.error('❌ [Templates] Error obteniendo plantilla:', error);
      return null;
    }
  }

  /**
   * Actualizar plantilla
   */
  async updateTemplate(id: string, data: Partial<ExtractionTemplate>): Promise<ExtractionTemplate | null> {
    try {
      const setClauses = [];
      const values = [];
      let paramCount = 1;

      // Campos actualizables
      const updateableFields = [
        'provider_name',
        'provider_nif', 
        'field_mappings',
        'confidence_threshold',
        'status'
      ];

      for (const field of updateableFields) {
        if (data[field as keyof ExtractionTemplate] !== undefined) {
          setClauses.push(`${field} = $${paramCount}`);
          const value = field === 'field_mappings' ? JSON.stringify(data[field as keyof ExtractionTemplate]) : data[field as keyof ExtractionTemplate];
          values.push(value);
          paramCount++;
        }
      }

      if (setClauses.length === 0) {
        throw new Error('No fields to update');
      }

      setClauses.push(`updated_at = NOW()`);
      values.push(id);

      const query = `
        UPDATE extraction_templates 
        SET ${setClauses.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await pgClient.query(query, values);
      
      if (result.data && result.data.length > 0) {
        const template = result.data[0];
        if (typeof template.field_mappings === 'string') {
          template.field_mappings = JSON.parse(template.field_mappings);
        }
        return template;
      }
      
      return null;
    } catch (error) {
      console.error('❌ [Templates] Error actualizando plantilla:', error);
      return null;
    }
  }

  /**
   * Eliminar plantilla
   */
  async deleteTemplate(id: string): Promise<boolean> {
    try {
      const result = await pgClient.query(
        'DELETE FROM extraction_templates WHERE id = $1',
        [id]
      );
      
      return !result.error;
    } catch (error) {
      console.error('❌ [Templates] Error eliminando plantilla:', error);
      return false;
    }
  }

  /**
   * Asegurar que la tabla existe
   */
  private async ensureTemplatesTableExists(): Promise<void> {
    try {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS extraction_templates (
          id VARCHAR(255) PRIMARY KEY,
          provider_name VARCHAR(255) NOT NULL,
          provider_nif VARCHAR(50),
          field_mappings JSONB NOT NULL DEFAULT '{}',
          confidence_threshold DECIMAL(3,2) DEFAULT 0.70,
          usage_count INTEGER DEFAULT 0,
          success_rate DECIMAL(3,2) DEFAULT 1.00,
          status VARCHAR(20) DEFAULT 'learning',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      
      await pgClient.query(createTableQuery);
    } catch (error) {
      console.error('❌ [Templates] Error creando tabla:', error);
    }
  }
}

export const extractionTemplatesService = new ExtractionTemplatesService(); 