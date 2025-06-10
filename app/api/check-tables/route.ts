// API Route para verificar estructura de tablas
import { NextRequest, NextResponse } from 'next/server';
import pgClient from '@/lib/postgresql-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Verificar conexión
    const connected = await pgClient.testConnection();
    
    // 2. Listar todas las tablas
    const { data: tables } = await pgClient.query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    // 3. Verificar estructura de tabla documents
    const { data: documentsColumns } = await pgClient.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'documents' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    // 4. Verificar estructura de tabla suppliers
    const { data: suppliersColumns } = await pgClient.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'suppliers' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    // 5. Verificar estructura de tabla customers
    const { data: customersColumns } = await pgClient.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'customers' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    // 6. Contar registros en cada tabla
    const { data: documentsCount } = await pgClient.query('SELECT COUNT(*) as count FROM documents');
    const { data: suppliersCount } = await pgClient.query('SELECT COUNT(*) as count FROM suppliers');
    const { data: customersCount } = await pgClient.query('SELECT COUNT(*) as count FROM customers');
    
    return NextResponse.json({
      success: true,
      connection: connected,
      tables: {
        total_tables: tables?.length || 0,
        list: tables?.map(t => t.table_name) || []
      },
      documents_table: {
        exists: (documentsColumns?.length || 0) > 0,
        columns_count: documentsColumns?.length || 0,
        columns: documentsColumns || [],
        record_count: parseInt(documentsCount?.[0]?.count || '0')
      },
      suppliers_table: {
        exists: (suppliersColumns?.length || 0) > 0,
        columns_count: suppliersColumns?.length || 0,
        columns: suppliersColumns?.map(c => c.column_name) || [],
        record_count: parseInt(suppliersCount?.[0]?.count || '0')
      },
      customers_table: {
        exists: (customersColumns?.length || 0) > 0,
        columns_count: customersColumns?.length || 0,
        columns: customersColumns?.map(c => c.column_name) || [],
        record_count: parseInt(customersCount?.[0]?.count || '0')
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error verificando tablas:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.stack
    }, { status: 500 });
  }
}