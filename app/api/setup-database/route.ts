// Endpoint para configurar la base de datos PostgreSQL
// app/api/setup-database/route.ts
// Versión 2.0.0 - Migrado a PostgreSQL

import { NextRequest, NextResponse } from 'next/server';
import { PostgreSQLClient } from '@/lib/postgresql-client';

// Inicializar cliente PostgreSQL
const pgClient = new PostgreSQLClient();

export async function POST() {
  try {
    console.log('🚀 [SetupDB] Iniciando configuración de base de datos PostgreSQL...');

    // Lista de tablas a verificar/crear
    const tables = [
      {
        name: 'users',
        sql: `CREATE TABLE IF NOT EXISTS users (
          user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'user', 'contable', 'gestor', 'supervisor')) DEFAULT 'user',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );`
      },
      {
        name: 'suppliers',
        sql: `CREATE TABLE IF NOT EXISTS suppliers (
          supplier_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nif_cif VARCHAR(20) UNIQUE,
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
          last_updated_from_document UUID,
          activity_status VARCHAR(20) DEFAULT 'active',
          volume_category VARCHAR(20) DEFAULT 'small'
        );`
      },
      {
        name: 'customers',
        sql: `CREATE TABLE IF NOT EXISTS customers (
          customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nif_cif VARCHAR(20) UNIQUE,
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
          payment_terms VARCHAR(50),
          credit_limit DECIMAL(12,2),
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          total_invoices INTEGER DEFAULT 0,
          total_amount DECIMAL(12,2) DEFAULT 0.00,
          last_invoice_date DATE,
          first_detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          last_updated_from_document UUID,
          activity_status VARCHAR(20) DEFAULT 'active',
          volume_category VARCHAR(20) DEFAULT 'small'
        );`
      },
      {
        name: 'documents',
        sql: `CREATE TABLE IF NOT EXISTS documents (
          id SERIAL PRIMARY KEY,
          job_id UUID UNIQUE NOT NULL,
          document_type VARCHAR(50) NOT NULL,
          raw_text TEXT,
          raw_json JSONB,
          processed_json JSONB NOT NULL,
          upload_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
          status VARCHAR(20) DEFAULT 'completed',
          version INTEGER DEFAULT 1,
          supplier_id UUID REFERENCES suppliers(supplier_id) ON DELETE SET NULL,
          customer_id UUID REFERENCES customers(customer_id) ON DELETE SET NULL,
          emitter_name VARCHAR(255),
          receiver_name VARCHAR(255),
          document_date DATE,
          total_amount DECIMAL(12,2),
          tax_amount DECIMAL(12,2),
          title VARCHAR(255),
          file_path TEXT,
          processing_metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );`
      },
      {
        name: 'audit_logs',
        sql: `CREATE TABLE IF NOT EXISTS audit_logs (
          log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('supplier', 'customer', 'document')),
          entity_id UUID NOT NULL,
          action VARCHAR(20) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'merged')),
          user_id UUID,
          document_id UUID,
          changes JSONB,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          notes TEXT
        );`
      }
    ];

    const results = [];
    let allSuccessful = true;

    // Crear tablas una por una
    for (const table of tables) {
      try {
        console.log(`📋 [SetupDB] Creando tabla ${table.name}...`);
        
        const result = await pgClient.query(table.sql);
        
        if (result.error) {
          console.error(`❌ [SetupDB] Error creando ${table.name}:`, result.error);
          results.push({ 
            table: table.name, 
            success: false, 
            error: result.error.message 
          });
          allSuccessful = false;
        } else {
          console.log(`✅ [SetupDB] Tabla ${table.name} verificada/creada exitosamente`);
          results.push({ 
            table: table.name, 
            success: true 
          });
        }
      } catch (err: any) {
        console.error(`❌ [SetupDB] Error en ${table.name}:`, err);
        results.push({ 
          table: table.name, 
          success: false, 
          error: err.message 
        });
        allSuccessful = false;
      }
    }

    // Crear usuario de prueba si no existe
    try {
      console.log('👤 [SetupDB] Creando usuario admin de prueba...');
      
      const userResult = await pgClient.query(`
        INSERT INTO users (username, email, role) 
        VALUES ('admin', 'admin@gestagent.com', 'admin')
        ON CONFLICT (email) DO NOTHING
        RETURNING user_id, username, email
      `);

      if (userResult.error) {
        console.warn('⚠️ [SetupDB] Error creando usuario admin:', userResult.error);
        results.push({
          table: 'admin_user',
          success: false,
          error: userResult.error.message
        });
      } else {
        const userData = userResult.data?.[0];
        if (userData) {
          console.log(`✅ [SetupDB] Usuario admin creado: ${userData.username}`);
          results.push({
            table: 'admin_user',
            success: true,
            data: userData
          });
        } else {
          console.log('ℹ️ [SetupDB] Usuario admin ya existía');
          results.push({
            table: 'admin_user',
            success: true,
            message: 'Usuario ya existía'
          });
        }
      }
    } catch (userErr: any) {
      console.error('❌ [SetupDB] Error con usuario admin:', userErr);
      results.push({
        table: 'admin_user',
        success: false,
        error: userErr.message
      });
    }

    // Crear índices adicionales
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_documents_job_id ON documents(job_id)',
      'CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status)',
      'CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_documents_upload_timestamp ON documents(upload_timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_suppliers_nif_cif ON suppliers(nif_cif)',
      'CREATE INDEX IF NOT EXISTS idx_customers_nif_cif ON customers(nif_cif)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)'
    ];

    console.log('📊 [SetupDB] Creando índices...');
    for (const indexSQL of indexes) {
      try {
        const indexResult = await pgClient.query(indexSQL);
        if (indexResult.error) {
          console.warn(`⚠️ [SetupDB] Error creando índice: ${indexResult.error.message}`);
        }
      } catch (err) {
        console.warn(`⚠️ [SetupDB] Error con índice: ${err}`);
      }
    }

    if (allSuccessful) {
      console.log('🎉 [SetupDB] ¡Base de datos configurada exitosamente!');
      return NextResponse.json({
        success: true,
        message: 'Base de datos PostgreSQL configurada exitosamente',
        results: results,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('⚠️ [SetupDB] Configuración completada con algunos errores');
      return NextResponse.json({
        success: false,
        message: 'Configuración completada con algunos errores',
        results: results,
        timestamp: new Date().toISOString()
      }, { status: 207 }); // 207 Multi-Status
    }

  } catch (error: any) {
    console.error('❌ [SetupDB] Error fatal en configuración:', error);
    return NextResponse.json({
      success: false,
      error: 'Error fatal en configuración de base de datos',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    console.log('🔍 [SetupDB] Verificando estado de la base de datos...');

    // Verificar conexión
    const connectionTest = await pgClient.query('SELECT NOW() as current_time');
    if (connectionTest.error) {
      return NextResponse.json({
        success: false,
        error: 'Error de conexión a PostgreSQL',
        details: connectionTest.error.message
      }, { status: 500 });
    }

    // Verificar tablas
    const tablesResult = await pgClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    const tables = tablesResult.data?.map(row => row.table_name) || [];
    const expectedTables = ['users', 'suppliers', 'customers', 'documents', 'audit_logs'];
    const missingTables = expectedTables.filter(table => !tables.includes(table));

    // Contar registros en cada tabla
    const tableCounts: any = {};
    for (const table of expectedTables) {
      if (tables.includes(table)) {
        try {
          const countResult = await pgClient.query(`SELECT COUNT(*) as count FROM ${table}`);
          tableCounts[table] = parseInt(countResult.data?.[0]?.count || '0');
        } catch (err) {
          tableCounts[table] = 'error';
        }
      } else {
        tableCounts[table] = 'missing';
      }
    }

    return NextResponse.json({
      success: missingTables.length === 0,
      connection: 'active',
      database_time: connectionTest.data?.[0]?.current_time,
      tables: {
        total: tables.length,
        expected: expectedTables.length,
        existing: tables,
        missing: missingTables,
        counts: tableCounts
      },
      status: missingTables.length === 0 ? 'ready' : 'incomplete',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ [SetupDB] Error en verificación:', error);
    return NextResponse.json({
      success: false,
      error: 'Error verificando estado de base de datos',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 