const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'gestagent_db',
  user: 'postgres',
  password: 'proyectotest123'
});

async function createExtractionTemplatesTable() {
  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL');

    // Crear tabla extraction_templates
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS extraction_templates (
        id VARCHAR(255) PRIMARY KEY,
        provider_name VARCHAR(255) NOT NULL,
        provider_nif VARCHAR(50),
        field_mappings JSONB NOT NULL DEFAULT '{}',
        confidence_threshold DECIMAL(3,2) DEFAULT 0.70,
        usage_count INTEGER DEFAULT 0,
        success_rate DECIMAL(3,2) DEFAULT 1.00,
        status VARCHAR(20) DEFAULT 'learning' CHECK (status IN ('active', 'learning', 'deprecated')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await client.query(createTableQuery);
    console.log('✅ Tabla extraction_templates creada');

    // Crear índices
    const indices = [
      'CREATE INDEX IF NOT EXISTS idx_extraction_templates_provider_name ON extraction_templates(provider_name);',
      'CREATE INDEX IF NOT EXISTS idx_extraction_templates_provider_nif ON extraction_templates(provider_nif);',
      'CREATE INDEX IF NOT EXISTS idx_extraction_templates_status ON extraction_templates(status);',
      'CREATE INDEX IF NOT EXISTS idx_extraction_templates_success_rate ON extraction_templates(success_rate DESC);',
      'CREATE INDEX IF NOT EXISTS idx_extraction_templates_field_mappings ON extraction_templates USING GIN (field_mappings);'
    ];

    for (const indexQuery of indices) {
      await client.query(indexQuery);
    }
    console.log('✅ Índices creados');

    // Insertar plantillas de ejemplo
    const insertExampleTemplates = `
      INSERT INTO extraction_templates (
        id, provider_name, provider_nif, field_mappings, confidence_threshold, usage_count, success_rate, status
      ) VALUES 
      (
        'template_example_1',
        'Empresa Ejemplo S.L.',
        'B12345678',
        '{"invoice_number_patterns": ["FAC-\\\\d{4}-\\\\d{3}", "FACTURA\\\\s+(\\\\d+)"], "date_patterns": ["\\\\d{1,2}/\\\\d{1,2}/\\\\d{4}"], "total_amount_patterns": ["TOTAL[:\\\\s]+(\\\\d+[.,]\\\\d+)\\\\s*€"], "tax_patterns": ["IVA[:\\\\s]+(\\\\d+[.,]\\\\d+)"]}',
        0.75,
        10,
        0.90,
        'active'
      ),
      (
        'template_example_2', 
        'Suministros Técnicos S.A.',
        'A87654321',
        '{"invoice_number_patterns": ["ST-\\\\d{6}", "N[ºº]\\\\s*(\\\\d+)"], "date_patterns": ["\\\\d{2}-\\\\d{2}-\\\\d{4}"], "total_amount_patterns": ["IMPORTE TOTAL[:\\\\s]+(\\\\d+,\\\\d+)"], "tax_patterns": ["21%[:\\\\s]+(\\\\d+,\\\\d+)"]}',
        0.80,
        5,
        0.85,
        'active'
      )
      ON CONFLICT (id) DO NOTHING;
    `;

    await client.query(insertExampleTemplates);
    console.log('✅ Plantillas de ejemplo insertadas');

    // Verificar tabla creada
    const checkResult = await client.query('SELECT COUNT(*) FROM extraction_templates');
    console.log(`📊 Total plantillas: ${checkResult.rows[0].count}`);

    console.log('🎉 Migración de extraction_templates completada exitosamente');

  } catch (error) {
    console.error('❌ Error creando tabla extraction_templates:', error);
  } finally {
    await client.end();
  }
}

createExtractionTemplatesTable(); 