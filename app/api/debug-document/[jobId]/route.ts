// API Route para debug de documentos
import { NextRequest, NextResponse } from 'next/server';
import pgClient from '@/lib/postgresql-client';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    
    console.log(`[DEBUG] Buscando documento: ${jobId}`);
    
    // Query básico
    const { data, error, count } = await pgClient.query(
      'SELECT job_id, status, emitter_name FROM documents WHERE job_id = $1',
      [jobId]
    );
    
    console.log(`[DEBUG] Query result:`, { error: error?.message, count, dataLength: data?.length });
    
    // También buscar sin WHERE para ver todos los documentos
    const { data: allDocs } = await pgClient.query(
      'SELECT job_id, status FROM documents ORDER BY created_at DESC LIMIT 5'
    );
    
    return NextResponse.json({
      success: true,
      searched_job_id: jobId,
      found: !!(data && data.length > 0),
      document: data?.[0] || null,
      query_error: error?.message || null,
      recent_documents: allDocs || [],
      debug_info: {
        query_executed: true,
        result_count: count || 0,
        has_error: !!error
      }
    });
    
  } catch (error: any) {
    console.error('[DEBUG] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}