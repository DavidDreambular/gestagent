// API Route para verificar qué tipo de base de datos se está usando
import { NextRequest, NextResponse } from 'next/server';
import { dbAdapter } from '@/lib/db-adapter';
import pgClient from '@/lib/postgresql-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('🔍 [DEBUG] Verificando tipo de base de datos...');
    
    // Inicializar el adaptador para verificar disponibilidad
    await dbAdapter.initialize();
    
    const isUsingPostgreSQL = dbAdapter.isUsingPostgreSQL();
    
    // Test de conexión directo
    let pgDirectConnection = false;
    try {
      const testResult = await pgClient.testConnection();
      pgDirectConnection = testResult;
    } catch (error) {
      console.log('PostgreSQL directo no disponible:', error);
    }
    
    // Verificar documentos usando el adaptador
    let documentsFromAdapter = [];
    try {
      const result = await dbAdapter.query('SELECT job_id, status, emitter_name FROM documents ORDER BY upload_timestamp DESC LIMIT 5');
      documentsFromAdapter = result.rows || [];
    } catch (error) {
      console.log('Error obteniendo documentos del adaptador:', error);
    }
    
    // Verificar si memory-db tiene datos
    let memoryDBStats = {};
    try {
      const { memoryDB } = await import('@/lib/memory-db');
      const docs = await memoryDB.getAllDocuments();
      const suppliers = await memoryDB.getAllSuppliers(); 
      const customers = await memoryDB.getAllCustomers();
      
      memoryDBStats = {
        documents_count: docs.length,
        suppliers_count: suppliers.length,
        customers_count: customers.length,
        sample_document: docs[0] || null
      };
    } catch (error) {
      console.log('Error accediendo a memory-db:', error);
    }
    
    return NextResponse.json({
      success: true,
      database_info: {
        is_using_postgresql: isUsingPostgreSQL,
        pg_direct_connection: pgDirectConnection,
        database_url_configured: !!process.env.DATABASE_URL,
        database_url_value: process.env.DATABASE_URL ? 'configured' : 'not_configured'
      },
      documents_from_adapter: documentsFromAdapter,
      memory_db_stats: memoryDBStats,
      recommendations: [
        isUsingPostgreSQL ? 'Sistema usando PostgreSQL' : 'Sistema usando base de datos en memoria',
        'Verificar por qué los documentos no aparecen en PostgreSQL',
        'El auto-registro de proveedores debería funcionar con la base de datos detectada'
      ]
    });
    
  } catch (error: any) {
    console.error('❌ [DEBUG] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}