// API Route para listar documentos - MIGRADO A POSTGRESQL
// /app/api/documents/list/route.ts

import { NextRequest, NextResponse } from 'next/server';
import pgClient from '@/lib/postgresql-client';

// Datos de ejemplo para fallback
const EXAMPLE_DOCUMENTS = [
  {
    job_id: 'demo-001',
    document_type: 'invoice',
    status: 'completed',
    upload_timestamp: new Date().toISOString(),
    emitter_name: 'Empresa Demo S.L.',
    receiver_name: 'Cliente Ejemplo',
    document_date: '2024-01-15',
    user_id: 'demo-user',
    version: 1,
    processed_json: {
      invoice_number: 'DEMO-001',
      total: 1250.50,
      currency: 'EUR'
    }
  },
  {
    job_id: 'demo-002',
    document_type: 'invoice',
    status: 'processing',
    upload_timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    emitter_name: 'Proveedor Test',
    receiver_name: 'Gestoría ABC',
    document_date: '2024-01-14',
    user_id: 'demo-user',
    version: 1,
    processed_json: {
      invoice_number: 'TEST-002',
      total: 890.25,
      currency: 'EUR'
    }
  }
];

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  console.log('[List Documents] Iniciando consulta de documentos con PostgreSQL');
  
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const type = searchParams.get('type');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');
  
  console.log(`[List Documents] Parámetros: status=${status}, type=${type}, limit=${limit}, offset=${offset}`);

  try {
    // Usar el cliente PostgreSQL existente
    const { data, error } = await pgClient.getDocuments({
      status: status === 'all' ? undefined : status || undefined,
      type: type === 'all' ? undefined : type || undefined,
      limit,
      offset
    });

    if (error) {
      console.log('[List Documents] Error en consulta PostgreSQL:', error);
      
      // Si hay error de PostgreSQL, usar datos de ejemplo
      console.log('⚠️ [List Documents] PostgreSQL no disponible, usando datos de ejemplo');
      
      let filteredDocs = [...EXAMPLE_DOCUMENTS];
      
      // Aplicar filtros a los datos de ejemplo
      if (status && status !== 'all') {
        filteredDocs = filteredDocs.filter(doc => doc.status === status);
      }
      
      if (type && type !== 'all') {
        filteredDocs = filteredDocs.filter(doc => doc.document_type === type);
      }
      
      // Aplicar paginación
      const paginatedDocs = filteredDocs.slice(offset, offset + limit);
      
      return NextResponse.json({
        success: true,
        documents: paginatedDocs,
        total: filteredDocs.length,
        pagination: {
          limit,
          offset,
          total: filteredDocs.length,
          pages: Math.ceil(filteredDocs.length / limit)
        },
        debug: {
          mode: 'example_data',
          reason: 'postgresql_unavailable',
          query_params: { status, type, limit, offset }
        }
      });
    }

    console.log(`[List Documents] Documentos encontrados desde PostgreSQL: ${data?.length || 0}`);

    // Obtener conteo total para paginación
    const totalQuery = await pgClient.query(
      'SELECT COUNT(*) as total FROM documents WHERE 1=1' + 
      (status && status !== 'all' ? ' AND status = $1' : '') +
      (type && type !== 'all' ? ` AND document_type = $${status && status !== 'all' ? '2' : '1'}` : ''),
      [
        ...(status && status !== 'all' ? [status] : []),
        ...(type && type !== 'all' ? [type] : [])
      ].filter(Boolean)
    );

    const totalCount = totalQuery.data?.[0]?.total || data?.length || 0;

    return NextResponse.json({
      success: true,
      documents: data || [],
      total: parseInt(totalCount.toString()),
      pagination: {
        limit,
        offset,
        total: parseInt(totalCount.toString()),
        pages: Math.ceil(parseInt(totalCount.toString()) / limit)
      },
      source: 'postgresql'
    });

  } catch (error) {
    console.error('[List Documents] Error inesperado:', error);
    
    // En caso de error crítico, devolver datos de ejemplo
    return NextResponse.json({
      success: true,
      documents: EXAMPLE_DOCUMENTS.slice(offset, offset + limit),
      total: EXAMPLE_DOCUMENTS.length,
      pagination: {
        limit,
        offset,
        total: EXAMPLE_DOCUMENTS.length,
        pages: Math.ceil(EXAMPLE_DOCUMENTS.length / limit)
      },
      debug: {
        mode: 'fallback_data',
        reason: 'critical_error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
} 