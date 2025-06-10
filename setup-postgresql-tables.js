// Script para crear tablas PostgreSQL para GestAgent
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuración de PostgreSQL desde las variables de entorno
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'gestagent_user',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'gestagent',
  password: process.env.POSTGRES_PASSWORD || 'gestagent_pass_2024',
  port: process.env.POSTGRES_PORT || 5432,
});

async function setupTables() {
  console.log('🚀 [SETUP] Iniciando configuración de tablas PostgreSQL...');
  
  try {
    // Test de conexión
    const client = await pool.connect();
    console.log('✅ [SETUP] Conectado a PostgreSQL exitosamente');

    // 1. Crear tabla users
    console.log('📋 [SETUP] Creando tabla users...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        role TEXT CHECK (role IN ('admin', 'contable', 'gestor', 'operador', 'supervisor')) NOT NULL DEFAULT 'operador',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `);
    
    // 2. Crear tabla documents
    console.log('📋 [SETUP] Creando tabla documents...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_type TEXT CHECK (document_type IN ('factura', 'nomina', 'recibo', 'extracto', 'balance')) NOT NULL,
        raw_text TEXT,
        raw_json JSONB,
        processed_json JSONB,
        upload_timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
        user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
        status TEXT CHECK (status IN ('processing', 'validated', 'error', 'pending_review', 'completed')) NOT NULL DEFAULT 'processing',
        version TEXT NOT NULL DEFAULT '1.0',
        emitter_name TEXT,
        receiver_name TEXT,
        document_date DATE,
        title TEXT,
        file_path TEXT
      );
    `);

    // 3. Crear tabla suppliers
    console.log('📋 [SETUP] Creando tabla suppliers...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        supplier_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nif_cif VARCHAR(50) UNIQUE,
        name VARCHAR(255) NOT NULL,
        commercial_name VARCHAR(255),
        address TEXT,
        postal_code VARCHAR(10),
        city VARCHAR(100),
        province VARCHAR(100),
        country VARCHAR(100) DEFAULT 'España',
        phone VARCHAR(20),
        email VARCHAR(100),
        website VARCHAR(255),
        contact_person VARCHAR(100),
        business_sector VARCHAR(100),
        company_size VARCHAR(20) CHECK (company_size IN ('micro', 'pequeña', 'mediana', 'grande')),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        total_invoices INTEGER DEFAULT 0,
        total_amount DECIMAL(12,2) DEFAULT 0.00,
        last_invoice_date DATE,
        first_detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        average_invoice_amount DECIMAL(12,2) DEFAULT 0.00,
        invoice_frequency VARCHAR(20)
      );
    `);

    // 4. Crear tabla customers
    console.log('📋 [SETUP] Creando tabla customers...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nif_cif VARCHAR(50) UNIQUE,
        name VARCHAR(255) NOT NULL,
        commercial_name VARCHAR(255),
        address TEXT,
        postal_code VARCHAR(10),
        city VARCHAR(100),
        province VARCHAR(100),
        country VARCHAR(100) DEFAULT 'España',
        phone VARCHAR(20),
        email VARCHAR(100),
        website VARCHAR(255),
        contact_person VARCHAR(100),
        customer_type VARCHAR(20) DEFAULT 'company' CHECK (customer_type IN ('company', 'individual', 'freelancer', 'public')),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        total_invoices INTEGER DEFAULT 0,
        total_amount DECIMAL(12,2) DEFAULT 0.00,
        last_invoice_date DATE,
        first_detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        average_invoice_amount DECIMAL(12,2) DEFAULT 0.00,
        invoice_frequency VARCHAR(20)
      );
    `);

    // 5. Agregar columnas de referencia a la tabla documents
    console.log('📋 [SETUP] Agregando columnas de referencia...');
    await client.query(`
      ALTER TABLE documents 
      ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(supplier_id),
      ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(customer_id);
    `);

    // 6. Crear tabla audit_logs
    console.log('📋 [SETUP] Creando tabla audit_logs...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID REFERENCES documents(job_id) ON DELETE SET NULL,
        user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
        details JSONB
      );
    `);

    // 7. Crear índices importantes
    console.log('📋 [SETUP] Creando índices...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
      CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
      CREATE INDEX IF NOT EXISTS idx_documents_supplier_id ON documents(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_documents_customer_id ON documents(customer_id);
      CREATE INDEX IF NOT EXISTS idx_suppliers_nif_cif ON suppliers(nif_cif);
      CREATE INDEX IF NOT EXISTS idx_customers_nif_cif ON customers(nif_cif);
    `);

    // 8. Insertar usuario de desarrollo
    console.log('📋 [SETUP] Creando usuario de desarrollo...');
    await client.query(`
      INSERT INTO users (user_id, username, email, password_hash, role) VALUES 
        ('00000000-0000-0000-0000-000000000000', 'admin', 'admin@gestagent.com', '$2b$10$defaulthashedpasswordfordev', 'admin')
      ON CONFLICT (email) DO NOTHING;
    `);

    // 9. Verificar que las tablas se crearon correctamente
    console.log('📋 [SETUP] Verificando tablas creadas...');
    const tablesResult = await client.query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📊 [SETUP] Tablas creadas:', tablesResult.rows.map(row => row.table_name));

    // 10. Verificar conteos
    const userCount = await client.query('SELECT COUNT(*) as count FROM users');
    const documentsCount = await client.query('SELECT COUNT(*) as count FROM documents');
    const suppliersCount = await client.query('SELECT COUNT(*) as count FROM suppliers');
    const customersCount = await client.query('SELECT COUNT(*) as count FROM customers');

    console.log('📊 [SETUP] Registros por tabla:');
    console.log(`  - Users: ${userCount.rows[0].count}`);
    console.log(`  - Documents: ${documentsCount.rows[0].count}`);
    console.log(`  - Suppliers: ${suppliersCount.rows[0].count}`);
    console.log(`  - Customers: ${customersCount.rows[0].count}`);

    client.release();
    console.log('✅ [SETUP] Configuración de PostgreSQL completada exitosamente');
    
    return {
      success: true,
      tables_created: tablesResult.rows.map(row => row.table_name),
      record_counts: {
        users: parseInt(userCount.rows[0].count),
        documents: parseInt(documentsCount.rows[0].count),
        suppliers: parseInt(suppliersCount.rows[0].count),
        customers: parseInt(customersCount.rows[0].count)
      }
    };
    
  } catch (error) {
    console.error('❌ [SETUP] Error configurando PostgreSQL:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Ejecutar setup si es llamado directamente
if (require.main === module) {
  setupTables()
    .then(result => {
      console.log('🎉 [SETUP] Setup completado:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 [SETUP] Setup falló:', error);
      process.exit(1);
    });
}

module.exports = { setupTables };