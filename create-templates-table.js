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
        id VARCHAR(255) PRIMARY KEY DEFAULT 'tpl_' || EXTRACT(EPOCH FROM NOW()) || '_' || substr(md5(random()::text), 1, 6),
        provider_name VARCHAR(255) NOT NULL,
        provider_nif VARCHAR(50),
        field_mappings JSONB NOT NULL DEFAULT '{}',
        confidence_threshold DECIMAL(3,2) DEFAULT 0.70,
        usage_count INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        last_used_at TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await client.query(createTableQuery);
    console.log('✅ Tabla extraction_templates creada');

    // Crear índices
    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_extraction_templates_provider_name ON extraction_templates(provider_name);',
      'CREATE INDEX IF NOT EXISTS idx_extraction_templates_provider_nif ON extraction_templates(provider_nif);',
      'CREATE INDEX IF NOT EXISTS idx_extraction_templates_active ON extraction_templates(is_active);',
      'CREATE INDEX IF NOT EXISTS idx_extraction_templates_usage ON extraction_templates(usage_count DESC);',
      'CREATE INDEX IF NOT EXISTS idx_extraction_templates_mappings ON extraction_templates USING GIN(field_mappings);'
    ];

    for (const indexQuery of createIndexes) {
      await client.query(indexQuery);
    }
    console.log('✅ Índices creados');

    // Insertar plantilla de ejemplo
    const insertExampleTemplate = `
      INSERT INTO extraction_templates (id, provider_name, provider_nif, field_mappings, confidence_threshold, usage_count, success_count)
      VALUES (
        'tpl_example_001',
        'EMPRESA EJEMPLO S.L.',
        'B12345678',
        '{
          "invoice_number": {"pattern": "N[ºo]\\\\s*(\\\\d+)", "field": "numero_factura"},
          "date": {"pattern": "Fecha[:\\\\s]*(\\\\d{1,2}[/\\\\-]\\\\d{1,2}[/\\\\-]\\\\d{4})", "field": "fecha"},
          "total": {"pattern": "Total[:\\\\s]*(\\\\d+[,.]\\\\d{2})", "field": "importe_total"},
          "supplier": {"fixed_value": "EMPRESA EJEMPLO S.L.", "field": "proveedor"}
        }',
        0.85,
        0,
        0
      )
      ON CONFLICT (id) DO NOTHING;
    `;

    await client.query(insertExampleTemplate);
    console.log('✅ Plantilla de ejemplo insertada');

    // Verificar la tabla
    const verifyQuery = await client.query('SELECT COUNT(*) as count FROM extraction_templates');
    console.log(`📊 Total de plantillas: ${verifyQuery.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error creando tabla:', error);
  } finally {
    await client.end();
  }
}

createExtractionTemplatesTable(); 