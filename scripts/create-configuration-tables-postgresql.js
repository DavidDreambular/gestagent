#!/usr/bin/env node

/**
 * Script para crear las tablas de configuración en PostgreSQL
 * 
 * Uso: node scripts/create-configuration-tables-postgresql.js
 */

const { Pool } = require('pg');

// Configuración de conexión PostgreSQL
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'gestagent',
  user: process.env.POSTGRES_USER || 'gestagent_user',
  password: process.env.POSTGRES_PASSWORD || 'gestagent_pass_2024',
  ssl: process.env.POSTGRES_SSL === 'true' ? {
    rejectUnauthorized: process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED !== 'false'
  } : false
});

async function createConfigurationTables() {
  const client = await pool.connect();
  
  try {
    console.log('🏗️  [CONFIG] Iniciando creación de tablas de configuración en PostgreSQL...');
    
    // Crear tabla principal de configuración del sistema
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_configuration (
        id SERIAL PRIMARY KEY,
        section VARCHAR(50) NOT NULL,
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_by VARCHAR(100) NOT NULL,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT unique_active_section UNIQUE(section, active) DEFERRABLE
      )
    `);
    console.log('✅ [CONFIG] Tabla system_configuration creada');

    // Crear tabla de auditoría de configuración
    await client.query(`
      CREATE TABLE IF NOT EXISTS configuration_audit_logs (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        user_id VARCHAR(100) NOT NULL,
        section VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        old_value JSONB,
        new_value JSONB,
        metadata JSONB,
        ip_address INET,
        user_agent TEXT
      )
    `);
    console.log('✅ [CONFIG] Tabla configuration_audit_logs creada');

    // Crear índices para optimizar consultas
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_config_section_active 
      ON system_configuration(section, active)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_config_updated_at 
      ON system_configuration(updated_at)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_timestamp 
      ON configuration_audit_logs(timestamp)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_user 
      ON configuration_audit_logs(user_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_section 
      ON configuration_audit_logs(section)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_action 
      ON configuration_audit_logs(action)
    `);

    console.log('✅ [CONFIG] Índices creados');

    // Insertar configuración por defecto si no existe
    const existingConfig = await client.query(
      'SELECT COUNT(*) as count FROM system_configuration WHERE active = true'
    );

    if (parseInt(existingConfig.rows[0].count) === 0) {
      console.log('🔧 [CONFIG] Insertando configuración por defecto...');

      const defaultConfiguration = {
        company: {
          name: 'GestAgent',
          cif: '',
          address: '',
          phone: '',
          email: '',
          logo_url: ''
        },
        apis: {
          mistral_api_key: '',
          openai_api_key: '',
          openrouter_api_key: '',
          stripe_api_key: ''
        },
        notifications: {
          email_enabled: true,
          push_enabled: false,
          vencimientos_dias: 7,
          alertas_criticas: true
        },
        backup: {
          auto_backup_enabled: true,
          backup_frequency_days: 1,
          backup_retention_days: 30,
          backup_location: 'local'
        },
        advanced: {
          debug_mode: false,
          api_rate_limit: 100,
          max_file_size_mb: 50,
          allowed_file_types: ['pdf', 'jpg', 'jpeg', 'png'],
          ocr_language: 'es'
        }
      };

      // Insertar cada sección de configuración
      for (const [section, data] of Object.entries(defaultConfiguration)) {
        await client.query(`
          INSERT INTO system_configuration (section, data, updated_by, active)
          VALUES ($1, $2, $3, true)
        `, [section, JSON.stringify(data), 'system_init']);
        
        console.log(`   ✓ Sección ${section} insertada`);
      }

      // Registrar auditoría inicial
      await client.query(`
        INSERT INTO configuration_audit_logs 
        (user_id, section, action, new_value, metadata)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        'system_init', 
        'all', 
        'initial_setup', 
        JSON.stringify(defaultConfiguration),
        JSON.stringify({ 
          reason: 'database_initialization',
          script: 'create-configuration-tables-postgresql.js'
        })
      ]);

      console.log('✅ [CONFIG] Configuración por defecto insertada');
    } else {
      console.log('ℹ️  [CONFIG] Configuración existente encontrada, no se insertó configuración por defecto');
    }

    // Crear función para trigger de auditoría automática
    await client.query(`
      CREATE OR REPLACE FUNCTION audit_configuration_changes()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'UPDATE' THEN
          INSERT INTO configuration_audit_logs (
            user_id, section, action, old_value, new_value, metadata
          ) VALUES (
            NEW.updated_by, 
            NEW.section, 
            'auto_update',
            row_to_json(OLD),
            row_to_json(NEW),
            jsonb_build_object('trigger', 'automatic', 'timestamp', NOW())
          );
          RETURN NEW;
        ELSIF TG_OP = 'INSERT' THEN
          INSERT INTO configuration_audit_logs (
            user_id, section, action, new_value, metadata
          ) VALUES (
            NEW.updated_by, 
            NEW.section, 
            'auto_insert',
            row_to_json(NEW),
            jsonb_build_object('trigger', 'automatic', 'timestamp', NOW())
          );
          RETURN NEW;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Crear trigger para auditoría automática
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_audit_configuration ON system_configuration;
      CREATE TRIGGER trigger_audit_configuration
        AFTER INSERT OR UPDATE ON system_configuration
        FOR EACH ROW
        EXECUTE FUNCTION audit_configuration_changes();
    `);

    console.log('✅ [CONFIG] Triggers de auditoría creados');

    // Verificar estructura final
    const tables = await client.query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name IN ('system_configuration', 'configuration_audit_logs')
      ORDER BY table_name, ordinal_position
    `);

    console.log('\n📋 [CONFIG] Estructura de tablas creadas:');
    console.log('=====================================');
    
    let currentTable = '';
    for (const row of tables.rows) {
      if (row.table_name !== currentTable) {
        console.log(`\n🔸 ${row.table_name}:`);
        currentTable = row.table_name;
      }
      console.log(`   ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    }

    // Mostrar estadísticas
    const configCount = await client.query('SELECT COUNT(*) as count FROM system_configuration');
    const auditCount = await client.query('SELECT COUNT(*) as count FROM configuration_audit_logs');
    
    console.log('\n📊 [CONFIG] Estadísticas:');
    console.log('=======================');
    console.log(`   Configuraciones: ${configCount.rows[0].count}`);
    console.log(`   Logs de auditoría: ${auditCount.rows[0].count}`);

    console.log('\n🎉 [CONFIG] Tablas de configuración creadas exitosamente en PostgreSQL');
    
  } catch (error) {
    console.error('❌ [CONFIG] Error creando tablas:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function testConfiguration() {
  const client = await pool.connect();
  
  try {
    console.log('\n🧪 [CONFIG] Probando funcionalidad de configuración...');
    
    // Test 1: Leer configuración
    const configTest = await client.query(`
      SELECT section, data FROM system_configuration WHERE active = true
    `);
    console.log(`   ✓ Lectura de configuración: ${configTest.rows.length} secciones encontradas`);
    
    // Test 2: Actualizar configuración (ejemplo)
    await client.query(`
      UPDATE system_configuration 
      SET data = jsonb_set(data, '{test_field}', '"test_value"', true),
          updated_by = 'test_script'
      WHERE section = 'advanced' AND active = true
    `);
    console.log('   ✓ Actualización de configuración exitosa');
    
    // Test 3: Verificar auditoría automática
    const auditTest = await client.query(`
      SELECT COUNT(*) as count FROM configuration_audit_logs 
      WHERE action LIKE 'auto_%' AND user_id = 'test_script'
    `);
    console.log(`   ✓ Auditoría automática: ${auditTest.rows[0].count} entradas generadas`);
    
    // Limpiar el test
    await client.query(`
      UPDATE system_configuration 
      SET data = data - 'test_field',
          updated_by = 'test_cleanup'
      WHERE section = 'advanced' AND active = true
    `);
    
    console.log('✅ [CONFIG] Todas las pruebas pasaron correctamente');
    
  } catch (error) {
    console.error('❌ [CONFIG] Error en pruebas:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    console.log('🚀 [CONFIG] Iniciando configuración de sistema...\n');
    
    await createConfigurationTables();
    await testConfiguration();
    
    console.log('\n🎯 [CONFIG] Configuración completada exitosamente');
    console.log('📌 [CONFIG] Próximos pasos:');
    console.log('   1. Verificar variables de entorno para PostgreSQL');
    console.log('   2. Reiniciar la aplicación para usar las nuevas tablas');
    console.log('   3. Acceder al panel de configuración desde el dashboard');
    
  } catch (error) {
    console.error('\n💥 [CONFIG] Error fatal:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Ejecutar script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createConfigurationTables,
  testConfiguration
};