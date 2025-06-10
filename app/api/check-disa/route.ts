// API Route para verificar DISA PENINSULA
import { NextRequest, NextResponse } from 'next/server';
import pgClient from '@/lib/postgresql-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Buscar todos los documentos que contengan DISA
    const { data: documents } = await pgClient.query(`
      SELECT job_id, emitter_name, upload_timestamp, 
             processed_json::text as json_text
      FROM documents 
      WHERE processed_json::text ILIKE '%DISA%'
      OR emitter_name ILIKE '%DISA%'
      ORDER BY upload_timestamp DESC
    `);
    
    console.log('🔍 DISA search - documents found:', documents?.length);
    console.log('📋 Emitter names:', documents?.map(d => d.emitter_name));
    
    // 2. Buscar proveedores DISA
    const { data: suppliers } = await pgClient.query(`
      SELECT * FROM suppliers 
      WHERE name ILIKE '%DISA%' 
      OR commercial_name ILIKE '%DISA%'
      OR nif_cif = 'B98765432'
    `);
    
    // 3. Procesar documentos para encontrar proveedores DISA
    const disaInDocuments: any[] = [];
    documents?.forEach((doc: any) => {
      try {
        const processed = JSON.parse(doc.json_text);
        if (processed.detected_invoices && Array.isArray(processed.detected_invoices)) {
          processed.detected_invoices.forEach((invoice: any, idx: number) => {
            if (invoice.supplier?.name?.includes('DISA') || 
                invoice.supplier?.name?.includes('PENINSULA')) {
              disaInDocuments.push({
                document_id: doc.job_id,
                invoice_index: idx,
                supplier_name: invoice.supplier.name,
                supplier_nif: invoice.supplier.nif_cif || invoice.supplier.nif,
                upload_date: doc.upload_timestamp
              });
            }
          });
        }
      } catch (e) {
        console.error('Error parseando documento:', doc.job_id, e);
      }
    });
    
    // 4. Verificar si se está ejecutando el processInvoiceRelations
    const { data: auditLogs } = await pgClient.query(`
      SELECT * FROM audit_logs 
      WHERE entity_type IN ('SUPPLIERS', 'CUSTOMERS')
      AND action IN ('CREATED', 'UPDATED')
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    return NextResponse.json({
      success: true,
      disa_in_documents: {
        count: documents?.length || 0,
        documents: documents?.map((d: any) => ({
          job_id: d.job_id,
          emitter_name: d.emitter_name,
          upload_date: d.upload_timestamp
        }))
      },
      disa_suppliers: {
        count: suppliers?.length || 0,
        suppliers: suppliers || []
      },
      disa_found_in_json: disaInDocuments,
      recent_supplier_audits: auditLogs || [],
      analysis: {
        disa_in_documents: disaInDocuments.length > 0,
        disa_in_suppliers: (suppliers?.length || 0) > 0,
        supplier_creation_working: (auditLogs?.length || 0) > 0
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error verificando DISA:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}