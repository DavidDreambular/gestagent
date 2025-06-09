const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'gestagent_db',
  user: 'postgres',
  password: 'proyectotest123'
});

async function runExtractionTemplatesMigration() {
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
        last_used TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        is_active BOOLEAN DEFAULT true
      );
    `;

    await client.query(createTableQuery);
    console.log('✅ Tabla extraction_templates creada');

    // Crear índices para optimización
    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_extraction_templates_provider_name ON extraction_templates(provider_name);',
      'CREATE INDEX IF NOT EXISTS idx_extraction_templates_provider_nif ON extraction_templates(provider_nif);',
      'CREATE INDEX IF NOT EXISTS idx_extraction_templates_active ON extraction_templates(is_active);',
      'CREATE INDEX IF NOT EXISTS idx_extraction_templates_usage ON extraction_templates(usage_count DESC);',
      'CREATE INDEX IF NOT EXISTS idx_extraction_templates_success_rate ON extraction_templates((success_count::float / NULLIF(usage_count, 0)));'
    ];

    for (const indexQuery of createIndexes) {
      await client.query(indexQuery);
    }
    console.log('✅ Índices creados');

    // Verificar que la tabla existe y mostrar estructura
    const checkTableQuery = `
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'extraction_templates' 
      ORDER BY ordinal_position;
    `;
    
    const result = await client.query(checkTableQuery);
    console.log('📋 Estructura de la tabla extraction_templates:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : ''} ${row.column_default ? 'DEFAULT ' + row.column_default : ''}`);
    });

    console.log('🎉 Migración de extraction_templates completada exitosamente');

  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runExtractionTemplatesMigration(); 