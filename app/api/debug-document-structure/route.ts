// API Route para debugear estructura de documentos
import { NextRequest, NextResponse } from 'next/server';
import pgClient from '@/lib/postgresql-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('🔍 [DEBUG] Analizando estructura de documentos...');
    
    // Obtener un documento de ejemplo que tenga facturas detectadas
    const { data: documents } = await pgClient.query(`
      SELECT job_id, processed_json, emitter_name
      FROM documents 
      WHERE processed_json IS NOT NULL 
      AND status = 'completed'
      ORDER BY upload_timestamp DESC 
      LIMIT 3
    `);
    
    if (!documents || documents.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No se encontraron documentos para analizar'
      });
    }
    
    const analysis = documents.map(doc => {
      const json = doc.processed_json;
      
      return {
        job_id: doc.job_id,
        emitter_name: doc.emitter_name,
        structure_analysis: {
          has_detected_invoices: !!json?.detected_invoices,
          detected_invoices_count: json?.detected_invoices?.length || 0,
          detected_invoices_sample: json?.detected_invoices ? json.detected_invoices.slice(0, 2) : null,
          has_direct_invoice_data: !!(json?.invoice_number || json?.supplier || json?.customer),
          direct_supplier: json?.supplier || null,
          direct_customer: json?.customer || null,
          raw_keys: Object.keys(json || {}),
          structure_type: json?.detected_invoices ? 'multi_invoice_array' : 
                         (json?.invoice_number ? 'single_invoice' : 'unknown')
        }
      };
    });
    
    // Obtener ejemplo de la primera factura del primer documento con facturas
    const firstDocWithInvoices = analysis.find(doc => doc.structure_analysis.detected_invoices_count > 0);
    let sampleInvoice = null;
    
    if (firstDocWithInvoices) {
      const docData = documents.find(d => d.job_id === firstDocWithInvoices.job_id);
      if (docData?.processed_json?.detected_invoices?.[0]) {
        sampleInvoice = {
          full_structure: docData.processed_json.detected_invoices[0],
          supplier_structure: docData.processed_json.detected_invoices[0]?.supplier || null,
          customer_structure: docData.processed_json.detected_invoices[0]?.customer || null
        };
      }
    }
    
    return NextResponse.json({
      success: true,
      total_documents_analyzed: documents.length,
      documents_analysis: analysis,
      sample_invoice_structure: sampleInvoice,
      recommendations: [
        'Verificar si processInvoiceRelations puede manejar la estructura detected_invoices',
        'Los documentos parecen usar la estructura { detected_invoices: [...] }',
        'Cada factura individual debería tener campos supplier y customer'
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