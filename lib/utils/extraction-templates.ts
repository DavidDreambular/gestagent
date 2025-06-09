import pgClient from '@/lib/postgresql-client';

export interface ExtractionTemplate {
  id: string;
  provider_name: string;
  provider_nif?: string;
  field_mappings: {
    invoice_number_patterns: string[];
    date_patterns: string[];
    total_amount_patterns: string[];
    tax_patterns: string[];
  };
  confidence_threshold: number;
  usage_count: number;
  success_rate: number;
  status: 'active' | 'learning' | 'deprecated';
}

/**
 * Buscar plantilla de extracción por proveedor
 */
export async function findTemplateByProvider(
  providerName: string, 
  providerNif?: string
): Promise<ExtractionTemplate | null> {
  try {
    console.log(`🔍 [Templates] Buscando plantilla para: ${providerName}`);
    
    // Primero intentar crear la tabla si no existe
    await ensureTemplatesTableExists();
    
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

    const result = await pgClient.query<ExtractionTemplate>(query, params);
    
    if (result.data && result.data.length > 0) {
      console.log(`✅ [Templates] Plantilla encontrada: ${result.data[0].id}`);
      return result.data[0];
    }

    console.log(`ℹ️ [Templates] No hay plantilla para ${providerName}`);
    return null;
  } catch (error) {
    console.error('❌ [Templates] Error buscando plantilla:', error);
    return null;
  }
}

/**
 * Aplicar plantilla a datos extraídos
 */
export async function applyTemplate(
  template: ExtractionTemplate, 
  extractedData: any
): Promise<any> {
  try {
    console.log(`🔧 [Templates] Aplicando plantilla ${template.id}`);
    
    const enhancedData = { ...extractedData };
    const { field_mappings } = template;

    // Mejorar números de factura
    if (field_mappings.invoice_number_patterns && enhancedData.detected_invoices) {
      enhancedData.detected_invoices = enhancedData.detected_invoices.map((invoice: any) => {
        if (!invoice.invoice_number || invoice.invoice_number === 'unknown') {
          for (const pattern of field_mappings.invoice_number_patterns) {
            try {
              const regex = new RegExp(pattern, 'i');
              const match = extractedData.raw_text?.match(regex);
              if (match && match[1]) {
                invoice.invoice_number = match[1].trim();
                invoice.confidence = Math.min((invoice.confidence || 0.5) + 0.2, 1.0);
                console.log(`📈 [Templates] Número mejorado: ${invoice.invoice_number}`);
                break;
              }
            } catch (e) {
              // Patrón inválido, continuar
            }
          }
        }
        return invoice;
      });
    }

    // Actualizar estadísticas de uso
    await updateTemplateUsage(template.id);
    
    return enhancedData;
  } catch (error) {
    console.error('❌ [Templates] Error aplicando plantilla:', error);
    return extractedData;
  }
}

/**
 * Aprender de un documento procesado
 */
export async function learnFromDocument(
  providerName: string,
  providerNif: string | null,
  extractedData: any
): Promise<void> {
  try {
    console.log(`🧠 [Templates] Aprendiendo de ${providerName}`);
    
    // Verificar si ya existe plantilla
    const existingTemplate = await findTemplateByProvider(providerName, providerNif || undefined);
    
    if (!existingTemplate) {
      // Crear nueva plantilla básica
      await createBasicTemplate(providerName, providerNif, extractedData);
    } else {
      // Actualizar plantilla existente
      await updateTemplateSuccess(existingTemplate.id);
    }

    console.log(`✅ [Templates] Aprendizaje completado`);
  } catch (error) {
    console.error('❌ [Templates] Error en aprendizaje:', error);
  }
}

/**
 * Crear plantilla básica a partir de un documento
 */
async function createBasicTemplate(
  providerName: string,
  providerNif: string | null,
  extractedData: any
): Promise<void> {
  try {
    await ensureTemplatesTableExists();
    
    const templateId = `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    // Extraer patrones básicos
    const fieldMappings = {
      invoice_number_patterns: [],
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
 * Actualizar uso de plantilla
 */
async function updateTemplateUsage(templateId: string): Promise<void> {
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
async function updateTemplateSuccess(templateId: string): Promise<void> {
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
 * Asegurar que la tabla existe
 */
async function ensureTemplatesTableExists(): Promise<void> {
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
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await pgClient.query(createTableQuery);
    
    // Crear índices básicos
    await pgClient.query('CREATE INDEX IF NOT EXISTS idx_extraction_templates_provider ON extraction_templates(provider_name);');
    await pgClient.query('CREATE INDEX IF NOT EXISTS idx_extraction_templates_status ON extraction_templates(status);');
    
  } catch (error) {
    console.error('❌ [Templates] Error creando tabla:', error);
  }
}

/**
 * Obtener estadísticas de plantillas
 */
export async function getTemplateStats(): Promise<any> {
  try {
    await ensureTemplatesTableExists();
    
    const result = await pgClient.query(`
      SELECT 
        COUNT(*) as total_templates,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_templates,
        COUNT(CASE WHEN status = 'learning' THEN 1 END) as learning_templates,
        COALESCE(AVG(success_rate), 0) as avg_success_rate,
        COALESCE(SUM(usage_count), 0) as total_usage
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
    return {
      total_templates: 0,
      active_templates: 0,
      learning_templates: 0,
      avg_success_rate: 0,
      total_usage: 0
    };
  }
} 