// API Route para debugear un documento específico
import { NextRequest, NextResponse } from 'next/server';
import pgClient from '@/lib/postgresql-client';
import { suppliersCustomersManager } from '@/services/suppliers-customers-manager';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const specificJobId = '9c9ec49a-b092-4de5-96a7-8af7754625df';
    console.log(`🔍 [DEBUG] Analizando documento específico: ${specificJobId}`);
    
    // Obtener el documento completo usando pgClient directamente
    const result = await pgClient.query(
      'SELECT * FROM documents ORDER BY upload_timestamp DESC LIMIT 1'
    );
    
    const document = result.data?.[0];
    
    if (!document) {
      return NextResponse.json({
        success: false,
        message: 'No hay documentos en la base de datos',
        debug_info: {
          error: result.error?.message,
          query_result: result
        }
      });
    }
    
    // Analizar la estructura del processed_json
    const processedJson = document.processed_json;
    
    const analysis = {
      document_info: {
        job_id: document.job_id,
        status: document.status,
        emitter_name: document.emitter_name,
        has_processed_json: !!processedJson
      },
      json_structure: {
        top_level_keys: processedJson ? Object.keys(processedJson) : [],
        has_detected_invoices: !!processedJson?.detected_invoices,
        detected_invoices_count: processedJson?.detected_invoices?.length || 0
      },
      sample_invoices: processedJson?.detected_invoices?.slice(0, 3) || [],
      first_invoice_structure: processedJson?.detected_invoices?.[0] ? {
        keys: Object.keys(processedJson.detected_invoices[0]),
        has_supplier: !!processedJson.detected_invoices[0].supplier,
        has_customer: !!processedJson.detected_invoices[0].customer,
        supplier_name: processedJson.detected_invoices[0].supplier?.name,
        customer_name: processedJson.detected_invoices[0].customer?.name
      } : null
    };
    
    // Intentar procesar las relaciones con este documento
    let relationProcessingResult = null;
    try {
      if (processedJson?.detected_invoices) {
        relationProcessingResult = await suppliersCustomersManager.processInvoiceRelations(
          { detected_invoices: processedJson.detected_invoices },
          specificJobId
        );
      }
    } catch (relationError) {
      relationProcessingResult = {
        error: relationError instanceof Error ? relationError.message : 'Error desconocido',
        stack: relationError instanceof Error ? relationError.stack : null
      };
    }
    
    return NextResponse.json({
      success: true,
      document_analysis: analysis,
      relation_processing_result: relationProcessingResult,
      recommendations: [
        'Verificar si detected_invoices es el formato correcto',
        'Revisar si processInvoiceRelations maneja la estructura { detected_invoices: [...] }',
        'Comprobar si los proveedores se están creando en PostgreSQL o memory-db'
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