import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { dbAdapter } from '@/lib/db-adapter';
import { SuppliersCustomersManager } from '@/services/suppliers-customers-manager';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    console.log('🔄 [Sync Entities] Iniciando sincronización de proveedores/clientes desde documentos');

    // Obtener todos los documentos procesados con éxito
    const documentsResult = await dbAdapter.query(`
      SELECT 
        job_id,
        processed_json,
        upload_timestamp,
        supplier_id,
        customer_id
      FROM documents 
      WHERE status = 'completed' 
      AND processed_json IS NOT NULL
      ORDER BY upload_timestamp DESC
    `);

    if (!documentsResult.rows || documentsResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay documentos procesados para sincronizar',
        processed: 0
      });
    }

    const manager = new SuppliersCustomersManager();
    let processedCount = 0;
    let suppliersCreated = 0;
    let customersCreated = 0;
    let errors = [];

    // Procesar cada documento
    for (const doc of documentsResult.rows) {
      try {
        // Solo procesar si no tiene proveedor o cliente asignado
        if (!doc.supplier_id || !doc.customer_id) {
          const processedData = doc.processed_json;
          
          if (processedData) {
            console.log(`📄 [Sync Entities] Procesando documento: ${doc.job_id}`);
            
            // Procesar relaciones comerciales
            const result = await manager.processInvoiceRelations(
              processedData,
              doc.job_id
            );

            // Actualizar referencias en el documento
            if (result.supplier_id || result.customer_id) {
              await dbAdapter.query(
                `UPDATE documents 
                 SET supplier_id = COALESCE($1, supplier_id),
                     customer_id = COALESCE($2, customer_id),
                     updated_at = CURRENT_TIMESTAMP
                 WHERE job_id = $3`,
                [result.supplier_id, result.customer_id, doc.job_id]
              );

              if (result.supplier_id && !doc.supplier_id) suppliersCreated++;
              if (result.customer_id && !doc.customer_id) customersCreated++;
              processedCount++;
            }
          }
        }
      } catch (error) {
        console.error(`❌ [Sync Entities] Error procesando documento ${doc.job_id}:`, error);
        errors.push({
          document: doc.job_id,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    console.log(`✅ [Sync Entities] Sincronización completada:`);
    console.log(`   📊 Documentos procesados: ${processedCount}`);
    console.log(`   🏢 Proveedores creados: ${suppliersCreated}`);
    console.log(`   👤 Clientes creados: ${customersCreated}`);
    console.log(`   ❌ Errores: ${errors.length}`);

    return NextResponse.json({
      success: true,
      message: 'Sincronización completada',
      stats: {
        documentsProcessed: processedCount,
        suppliersCreated,
        customersCreated,
        totalDocuments: documentsResult.rows.length,
        errors: errors.length
      },
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ [Sync Entities] Error en sincronización:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error en sincronización',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}