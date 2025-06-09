// API Route para exportar documentos a formato Sage
// /app/api/documents/export/sage/route.ts
// Versión 2.0.0 - Migrado a PostgreSQL

import { NextRequest, NextResponse } from 'next/server';
import { PostgreSQLClient } from '@/lib/postgresql-client';

const pgClient = new PostgreSQLClient();

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [Export Sage] Generando exportación Sage...');

    // Obtener documentos para exportar
    const documentsResult = await pgClient.query(`
      SELECT 
        job_id,
        document_type,
        processed_json,
        document_date,
        emitter_name,
        receiver_name,
        total_amount,
        upload_timestamp
      FROM documents 
      WHERE status = 'completed'
      ORDER BY document_date DESC
      LIMIT 100
    `);

    if (documentsResult.error) {
      return NextResponse.json(
        { error: 'Error obteniendo documentos', details: documentsResult.error.message },
        { status: 500 }
      );
    }

    const documents = documentsResult.data || [];
    
    // Formatear para Sage
    const sageData = documents.map(doc => ({
      fecha: doc.document_date,
      tipo: doc.document_type,
      emisor: doc.emitter_name,
      receptor: doc.receiver_name,
      importe: parseFloat(doc.total_amount || '0'),
      referencia: doc.job_id
    }));

    return NextResponse.json({
      success: true,
      format: 'sage',
      total_documents: documents.length,
      data: sageData,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Export Sage] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 