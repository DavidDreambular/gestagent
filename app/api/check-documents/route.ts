// API Route para verificar documentos existentes
import { NextRequest, NextResponse } from 'next/server';
import pgClient from '@/lib/postgresql-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Contar total de documentos
    const { data: countData } = await pgClient.query(
      'SELECT COUNT(*) as count FROM documents'
    );
    const totalDocuments = parseInt(countData?.[0]?.count || '0');
    
    // 2. Obtener últimos 10 documentos
    const { data: documents } = await pgClient.query(
      `SELECT job_id, document_type, status, emitter_name, receiver_name, 
              upload_timestamp, file_path
       FROM documents 
       ORDER BY upload_timestamp DESC 
       LIMIT 10`
    );
    
    // 3. Verificar el documento específico que dio error 404
    const specificJobId = '9c9ec49a-b092-4de5-96a7-8af7754625df';
    const { data: specificDoc } = await pgClient.query(
      'SELECT * FROM documents WHERE job_id = $1',
      [specificJobId]
    );
    
    // 4. Contar documentos por estado
    const { data: statusCounts } = await pgClient.query(`
      SELECT status, COUNT(*) as count 
      FROM documents 
      GROUP BY status
    `);
    
    return NextResponse.json({
      success: true,
      summary: {
        total_documents: totalDocuments,
        documents_found: documents?.length || 0
      },
      recent_documents: documents?.map((doc: any) => ({
        job_id: doc.job_id,
        type: doc.document_type,
        status: doc.status,
        emitter: doc.emitter_name,
        receiver: doc.receiver_name,
        uploaded: doc.upload_timestamp,
        file: doc.file_path
      })) || [],
      specific_document: {
        job_id: specificJobId,
        found: (specificDoc && specificDoc.length > 0),
        data: specificDoc?.[0] || null
      },
      status_breakdown: statusCounts || [],
      notes: [
        totalDocuments > 0 ? `✅ ${totalDocuments} documentos en la base de datos` : '❌ No hay documentos en la base de datos',
        specificDoc && specificDoc.length > 0 ? '✅ Documento específico encontrado' : '❌ Documento 9c9ec49a... no encontrado'
      ]
    });
    
  } catch (error: any) {
    console.error('❌ Error verificando documentos:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}