// Script para ejecutar la migración de invoice_entities
// Este script ejecuta la migración 004 para crear la tabla invoice_entities

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Configuración de la base de datos (lee del .env)
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'gestagent',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'gestagent',
  password: process.env.POSTGRES_PASSWORD || 'gestagent123',
  port: process.env.POSTGRES_PORT || 5432,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔗 Conectando a PostgreSQL...');
    
    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, '..', 'database', '004_create_invoice_entities_simple.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📋 Ejecutando migración de invoice_entities...');
    
    // Ejecutar la migración
    await client.query(migrationSQL);
    
    console.log('✅ Migración completada exitosamente');
    
    console.log('✅ Migración ejecutada (los datos se poblaron durante la migración)');
    
    // Verificar el resultado
    const countResult = await client.query('SELECT COUNT(*) as total FROM invoice_entities;');
    const totalInvoices = countResult.rows[0].total;
    
    console.log(`📈 Total de facturas en invoice_entities: ${totalInvoices}`);
    
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('🎉 Migración completada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en migración:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };