// API Route para debugear todos los documentos
import { NextRequest, NextResponse } from 'next/server';
import pgClient from '@/lib/postgresql-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('🔍 [DEBUG] Obteniendo todos los documentos...');
    
    // Obtener TODOS los documentos sin filtros
    const { data: documents } = await pgClient.query(`
      SELECT job_id, status, processed_json IS NOT NULL as has_json, emitter_name, upload_timestamp
      FROM documents 
      ORDER BY upload_timestamp DESC
    `);
    
    // Obtener un documento específico con datos completos
    const { data: fullDocument } = await pgClient.query(`
      SELECT *
      FROM documents 
      WHERE processed_json IS NOT NULL
      ORDER BY upload_timestamp DESC 
      LIMIT 1
    `);
    
    return NextResponse.json({
      success: true,
      all_documents: documents || [],
      total_count: documents?.length || 0,
      status_breakdown: documents?.reduce((acc: any, doc: any) => {
        acc[doc.status] = (acc[doc.status] || 0) + 1;
        return acc;
      }, {}) || {},
      sample_full_document: fullDocument?.[0] || null,
      sample_processed_json_keys: fullDocument?.[0]?.processed_json ? Object.keys(fullDocument[0].processed_json) : null
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