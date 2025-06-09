// Script para ejecutar migración SQL usando Supabase client
// scripts/run-migration.js

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno desde .env
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('🚀 GESTAGENT - Ejecutando migración de Proveedores y Clientes');
console.log('===============================================================');

// Verificar variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Faltan variables de entorno requeridas:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓ Configurado' : '✗ Falta');
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓ Configurado' : '✗ Falta');
    process.exit(1);
}

console.log('✓ Variables de entorno configuradas correctamente');

// Configuración de base de datos
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: false
});

async function runMigration() {
  try {
    console.log('🗄️ [Migration] Iniciando migración de notificaciones...');

    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, '../supabase/migrations/006_create_provider_notifications.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.log('⚠️ [Migration] Archivo de migración no encontrado, creando tabla manualmente...');
      
      // Crear tabla de notificaciones manualmente
      const createTableQuery = `
        -- Crear tabla para notificaciones de proveedores
        CREATE TABLE IF NOT EXISTS provider_notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            supplier_id UUID NOT NULL,
            document_id VARCHAR(255),
            type VARCHAR(50) NOT NULL CHECK (type IN ('document_received', 'document_validated', 'document_error', 'information_required')),
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            read_at TIMESTAMPTZ NULL
        );

        -- Crear índices para optimizar consultas
        CREATE INDEX IF NOT EXISTS idx_provider_notifications_supplier_id ON provider_notifications(supplier_id);
        CREATE INDEX IF NOT EXISTS idx_provider_notifications_document_id ON provider_notifications(document_id);
        CREATE INDEX IF NOT EXISTS idx_provider_notifications_type ON provider_notifications(type);
        CREATE INDEX IF NOT EXISTS idx_provider_notifications_created_at ON provider_notifications(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_provider_notifications_read_at ON provider_notifications(read_at) WHERE read_at IS NULL;

        -- Insertar datos de ejemplo
        INSERT INTO provider_notifications (supplier_id, document_id, type, title, message, metadata) 
        SELECT 
            s.supplier_id,
            'DOC-' || gen_random_uuid()::text,
            'document_received',
            'Documento recibido correctamente',
            'Su factura ha sido recibida y está siendo procesada.',
            jsonb_build_object(
                'documentName', 'Factura #' || (1000 + (random() * 1000)::int),
                'documentNumber', 'FAC-' || (random() * 10000)::int,
                'receivedDate', NOW()::date
            )
        FROM suppliers s 
        WHERE s.status = 'active'
        LIMIT 3
        ON CONFLICT DO NOTHING;
      `;

      await pool.query(createTableQuery);
      console.log('✅ [Migration] Tabla de notificaciones creada manualmente');
    } else {
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      await pool.query(migrationSQL);
      console.log('✅ [Migration] Migración ejecutada desde archivo');
    }

    // Verificar que la tabla existe
    const checkResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'provider_notifications'
    `);

    if (parseInt(checkResult.rows[0].count) > 0) {
      console.log('✅ [Migration] Tabla provider_notifications verificada');
      
      // Contar notificaciones
      const countResult = await pool.query('SELECT COUNT(*) as total FROM provider_notifications');
      console.log(`📊 [Migration] Notificaciones en la tabla: ${countResult.rows[0].total}`);
    } else {
      console.error('❌ [Migration] Error: tabla no creada');
    }

  } catch (error) {
    console.error('❌ [Migration] Error ejecutando migración:', error);
  } finally {
    await pool.end();
  }
}

runMigration(); 