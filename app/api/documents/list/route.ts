// API Route para listar documentos desde Supabase
// /app/api/documents/list/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('[List Documents] Iniciando consulta de documentos');

    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const documentType = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log(`[List Documents] Parámetros: status=${status}, type=${documentType}, limit=${limit}, offset=${offset}`);

    // Construir query base
    let query = supabase
      .from('documents')
      .select('*', { count: 'exact' })
      .order('upload_timestamp', { ascending: false });

    // Aplicar filtros
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    
    if (documentType && documentType !== 'all') {
      query = query.eq('document_type', documentType);
    }

    // Aplicar paginación
    if (limit > 0) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data: documents, error, count } = await query;

    if (error) {
      console.error('[List Documents] Error en consulta Supabase:', error);
      throw error;
    }

    console.log(`[List Documents] Encontrados ${documents?.length || 0} documentos de un total de ${count}`);

    // Formatear respuesta
    const formattedDocuments = (documents || []).map(doc => ({
      job_id: doc.job_id,
      document_type: doc.document_type,
      file_name: doc.title || `documento_${doc.job_id.slice(0, 8)}.pdf`,
      status: doc.status || 'processed',
      upload_timestamp: doc.upload_timestamp,
      emitter_name: doc.emitter_name,
      receiver_name: doc.receiver_name,
      document_date: doc.document_date,
      title: doc.title,
      version: doc.version || 1,
      processed_json: doc.processed_json,
      user_id: doc.user_id,
      created_at: doc.created_at || doc.upload_timestamp,
      updated_at: doc.updated_at || doc.upload_timestamp,
      // Campos adicionales para el dashboard
      supplier_id: doc.supplier_id,
      customer_id: doc.customer_id,
      total_amount: doc.total_amount,
      tax_amount: doc.tax_amount
    }));

    return NextResponse.json({
      success: true,
      documents: formattedDocuments,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: offset + limit < (count || 0)
      },
      metadata: {
        query_time: new Date().toISOString(),
        filters_applied: {
          status: status || 'all',
          document_type: documentType || 'all'
        }
      }
    });
    
  } catch (error: any) {
    console.error('[List Documents] Error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al listar documentos',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
} 