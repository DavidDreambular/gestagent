// API Route para validar y limpiar lista de documentos
import { NextRequest, NextResponse } from 'next/server';
import { dbAdapter } from '@/lib/db-adapter';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('🔄 [VALIDATE] Validando lista de documentos...');
    
    // Inicializar el adaptador de base de datos
    await dbAdapter.initialize();

    // Obtener todos los documentos con status activo
    const allDocsResult = await dbAdapter.query(
      `SELECT job_id, status, emitter_name, upload_timestamp, processed_json 
       FROM documents 
       WHERE status != 'deleted' 
       ORDER BY upload_timestamp DESC`
    );
    
    if (!allDocsResult.rows) {
      return NextResponse.json({
        success: true,
        valid_documents: [],
        total_found: 0,
        valid_count: 0,
        message: 'No se encontraron documentos'
      });
    }

    const allDocuments = allDocsResult.rows;
    
    // Filtrar documentos válidos (que tienen datos procesados)
    const validDocuments = allDocuments.filter(doc => {
      const hasValidData = doc.processed_json && 
                          (doc.processed_json.detected_invoices || 
                           doc.processed_json.invoice_number ||
                           doc.processed_json.supplier);
      
      return hasValidData;
    });

    // Formatear documentos para el frontend
    const formattedDocuments = validDocuments.map(doc => ({
      job_id: doc.job_id,
      document_type: 'factura',
      status: doc.status,
      emitter_name: doc.emitter_name,
      upload_timestamp: doc.upload_timestamp,
      has_invoices: !!(doc.processed_json?.detected_invoices?.length > 0),
      invoice_count: doc.processed_json?.detected_invoices?.length || 
                    (doc.processed_json?.invoice_number ? 1 : 0)
    }));

    console.log(`✅ [VALIDATE] ${validDocuments.length}/${allDocuments.length} documentos válidos encontrados`);

    return NextResponse.json({
      success: true,
      valid_documents: formattedDocuments,
      total_found: allDocuments.length,
      valid_count: validDocuments.length,
      invalid_count: allDocuments.length - validDocuments.length,
      validation_summary: {
        total_documents: allDocuments.length,
        valid_with_invoices: formattedDocuments.filter(d => d.has_invoices).length,
        valid_without_invoices: formattedDocuments.filter(d => !d.has_invoices).length,
        status_breakdown: allDocuments.reduce((acc: any, doc: any) => {
          acc[doc.status] = (acc[doc.status] || 0) + 1;
          return acc;
        }, {})
      }
    });
    
  } catch (error: any) {
    console.error('❌ [VALIDATE] Error validando documentos:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}