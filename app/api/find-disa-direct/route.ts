// API Route para buscar DISA directamente
import { NextRequest, NextResponse } from 'next/server';
import pgClient from '@/lib/postgresql-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Buscar documento específico que sabemos que tiene DISA
    const specificJobId = '9c9ec49a-b092-4de5-96a7-8af7754625df';
    const { data: specificDoc } = await pgClient.query(`
      SELECT job_id, emitter_name, processed_json
      FROM documents 
      WHERE job_id = $1
    `, [specificJobId]);
    
    // 2. Buscar todos los documentos con emitter_name = DISA
    const { data: disaDocs } = await pgClient.query(`
      SELECT job_id, emitter_name, status
      FROM documents 
      WHERE emitter_name = 'DISA PENINSULA S.L.U.'
    `);
    
    // 3. Procesar el JSON del documento específico para extraer proveedores
    let providersInDoc = [];
    if (specificDoc && specificDoc[0]) {
      try {
        const processed = specificDoc[0].processed_json;
        if (processed && processed.detected_invoices) {
          processed.detected_invoices.forEach((invoice: any, idx: number) => {
            if (invoice.supplier?.name) {
              providersInDoc.push({
                invoice_index: idx,
                supplier_name: invoice.supplier.name,
                supplier_nif: invoice.supplier.nif || invoice.supplier.nif_cif || 'No NIF'
              });
            }
          });
        }
      } catch (e) {
        console.error('Error procesando JSON:', e);
      }
    }
    
    // 4. Verificar si estos proveedores existen en la tabla suppliers
    const uniqueSuppliers = [...new Set(providersInDoc.map(p => p.supplier_name))];
    let existingSuppliers = [];
    
    for (const supplierName of uniqueSuppliers) {
      const { data: supplier } = await pgClient.query(`
        SELECT name, nif_cif, created_at 
        FROM suppliers 
        WHERE name ILIKE $1
      `, [`%${supplierName}%`]);
      
      if (supplier && supplier.length > 0) {
        existingSuppliers.push({
          name: supplierName,
          found: true,
          database_record: supplier[0]
        });
      } else {
        existingSuppliers.push({
          name: supplierName,
          found: false,
          database_record: null
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      specific_document: {
        job_id: specificJobId,
        found: specificDoc && specificDoc.length > 0,
        emitter_name: specificDoc?.[0]?.emitter_name,
        has_processed_json: !!(specificDoc?.[0]?.processed_json)
      },
      disa_documents_by_emitter: {
        count: disaDocs?.length || 0,
        documents: disaDocs || []
      },
      providers_in_specific_doc: providersInDoc,
      supplier_registration_check: existingSuppliers,
      summary: {
        total_providers_found: providersInDoc.length,
        unique_providers: uniqueSuppliers.length,
        providers_registered: existingSuppliers.filter(s => s.found).length,
        providers_missing: existingSuppliers.filter(s => !s.found).length
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}