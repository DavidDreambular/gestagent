// API Route para procesar proveedores de documentos existentes
import { NextRequest, NextResponse } from 'next/server';
import pgClient from '@/lib/postgresql-client';
import { suppliersCustomersManager } from '@/services/suppliers-customers-manager';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    console.log('🚀 [PROCESS-SUPPLIERS] Iniciando procesamiento de proveedores existentes...');
    
    // 1. Obtener documentos con datos procesados
    const { data: documents } = await pgClient.query(`
      SELECT job_id, processed_json, emitter_name, receiver_name
      FROM documents 
      WHERE processed_json IS NOT NULL 
      AND status = 'completed'
      ORDER BY upload_timestamp DESC 
      LIMIT 10
    `);
    
    if (!documents || documents.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No se encontraron documentos para procesar'
      });
    }
    
    console.log(`📄 [PROCESS-SUPPLIERS] Encontrados ${documents.length} documentos para procesar`);
    
    let totalSuppliersCreated = 0;
    let totalCustomersCreated = 0;
    let processedDocuments = [];
    let allOperations: string[] = [];
    
    // 2. Procesar cada documento
    for (const doc of documents) {
      try {
        console.log(`📋 [PROCESS-SUPPLIERS] Procesando documento: ${doc.job_id}`);
        
        // Verificar que tiene datos de facturas
        if (!doc.processed_json || !doc.processed_json.detected_invoices) {
          console.log(`⚠️ [PROCESS-SUPPLIERS] Documento ${doc.job_id} no tiene facturas detectadas`);
          continue;
        }
        
        const invoicesData = doc.processed_json.detected_invoices;
        console.log(`📊 [PROCESS-SUPPLIERS] Documento ${doc.job_id} tiene ${invoicesData.length} facturas`);
        
        // Procesar relaciones comerciales para este documento
        const relations = await suppliersCustomersManager.processInvoiceRelations(
          { detected_invoices: invoicesData },
          doc.job_id
        );
        
        if (relations.supplier_id) totalSuppliersCreated++;
        if (relations.customer_id) totalCustomersCreated++;
        
        allOperations.push(...relations.operations);
        
        processedDocuments.push({
          job_id: doc.job_id,
          emitter_name: doc.emitter_name,
          invoices_count: invoicesData.length,
          supplier_id: relations.supplier_id,
          customer_id: relations.customer_id,
          operations: relations.operations
        });
        
        console.log(`✅ [PROCESS-SUPPLIERS] Documento ${doc.job_id} procesado: Proveedor=${relations.supplier_id}, Cliente=${relations.customer_id}`);
        
      } catch (docError) {
        console.error(`❌ [PROCESS-SUPPLIERS] Error procesando documento ${doc.job_id}:`, docError);
        allOperations.push(`Error en documento ${doc.job_id}: ${docError}`);
      }
    }
    
    // 3. Verificar proveedores creados
    const { data: allSuppliers } = await pgClient.query(
      'SELECT name, nif_cif, created_at FROM suppliers ORDER BY created_at DESC LIMIT 20'
    );
    
    const { data: allCustomers } = await pgClient.query(
      'SELECT name, nif_cif, created_at FROM customers ORDER BY created_at DESC LIMIT 20'
    );
    
    console.log(`🎉 [PROCESS-SUPPLIERS] Procesamiento completado: ${totalSuppliersCreated} proveedores, ${totalCustomersCreated} clientes`);
    
    return NextResponse.json({
      success: true,
      summary: {
        documents_processed: processedDocuments.length,
        documents_found: documents.length,
        suppliers_created: totalSuppliersCreated,
        customers_created: totalCustomersCreated,
        total_operations: allOperations.length
      },
      processed_documents: processedDocuments,
      all_operations: allOperations,
      current_suppliers: allSuppliers || [],
      current_customers: allCustomers || [],
      next_steps: [
        'Verifica que los proveedores aparezcan en /dashboard/suppliers',
        'Verifica que los clientes aparezcan en /dashboard/customers',
        'Los proveedores se crean automáticamente en futuros uploads'
      ]
    });
    
  } catch (error: any) {
    console.error('❌ [PROCESS-SUPPLIERS] Error general:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}