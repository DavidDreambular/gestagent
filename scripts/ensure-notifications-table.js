#!/usr/bin/env node

/**
 * Script para asegurar que la tabla de notificaciones existe en PostgreSQL
 * Este script verifica y crea la tabla si no existe
 */

const { Pool } = require('pg');
require('dotenv').config();

// Configurar conexión a PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'gestagent',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function ensureNotificationsTable() {
  let client;
  
  try {
    client = await pool.connect();
    console.log('✅ Conectado a PostgreSQL');

    // Verificar si la tabla existe
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
      );
    `;

    const { rows } = await client.query(checkTableQuery);
    const tableExists = rows[0].exists;

    if (tableExists) {
      console.log('✅ La tabla notifications ya existe');
    } else {
      console.log('📋 Creando tabla notifications...');

      // Crear tabla de notificaciones
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT,
          read BOOLEAN DEFAULT FALSE,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          read_at TIMESTAMP WITH TIME ZONE,
          
          -- Índices para rendimiento
          CONSTRAINT notifications_type_check CHECK (
            type IN (
              'document_uploaded',
              'document_processed',
              'document_error',
              'document_shared',
              'system_update',
              'payment_reminder',
              'export_completed',
              'supplier_created',
              'customer_created',
              'entity_updated'
            )
          )
        );

        -- Crear índices
        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
        CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = FALSE;
      `;

      await client.query(createTableQuery);
      console.log('✅ Tabla notifications creada exitosamente');
    }

    // Verificar la estructura de la tabla
    const checkColumnsQuery = `
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'notifications' 
      ORDER BY ordinal_position;
    `;

    const columnsResult = await client.query(checkColumnsQuery);
    console.log('\n📊 Estructura de la tabla notifications:');
    columnsResult.rows.forEach(column => {
      console.log(`  - ${column.column_name}: ${column.data_type} ${column.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });

    // Contar notificaciones existentes
    const countQuery = 'SELECT COUNT(*) as total FROM notifications';
    const countResult = await client.query(countQuery);
    console.log(`\n📈 Total de notificaciones en la base de datos: ${countResult.rows[0].total}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Ejecutar el script
ensureNotificationsTable()
  .then(() => {
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });