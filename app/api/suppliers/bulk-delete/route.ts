// API Route para borrado múltiple de proveedores
// /app/api/suppliers/bulk-delete/route.ts

import { NextRequest, NextResponse } from 'next/server';
import pgClient from '@/lib/postgresql-client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AuditService, { AuditAction, AuditEntityType } from '@/services/audit.service';

export async function POST(request: NextRequest) {
  try {
    console.log('🗑️ [API] Iniciando borrado múltiple de proveedores...');

    // Verificar autenticación (opcional para desarrollo)
    let userId = '00000000-0000-0000-0000-000000000000';
    try {
      const session = await getServerSession(authOptions);
      userId = session?.user?.id || '00000000-0000-0000-0000-000000000000';
    } catch (authError) {
      console.warn('⚠️ [API] Sin autenticación, usando usuario de desarrollo');
    }

    // Parsear datos de la request
    const { supplier_ids, force_delete = false } = await request.json();

    // Validaciones
    if (!supplier_ids || !Array.isArray(supplier_ids) || supplier_ids.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Se requiere un array de supplier_ids válido',
        error_code: 'INVALID_SUPPLIER_IDS'
      }, { status: 400 });
    }

    if (supplier_ids.length > 50) {
      return NextResponse.json({
        success: false,
        error: 'Máximo 50 proveedores por operación',
        error_code: 'TOO_MANY_SUPPLIERS'
      }, { status: 400 });
    }

    console.log(`📋 [API] Solicitado borrado de ${supplier_ids.length} proveedores`);

    // Verificar que los proveedores existen
    const { data: existingSuppliers, error: checkError } = await pgClient.query(
      `SELECT supplier_id, name, nif_cif, total_invoices 
       FROM suppliers 
       WHERE supplier_id = ANY($1)`,
      [supplier_ids]
    );

    if (checkError) {
      console.error('❌ [API] Error verificando proveedores:', checkError);
      return NextResponse.json({
        success: false,
        error: 'Error verificando proveedores en base de datos',
        error_code: 'DATABASE_CHECK_ERROR'
      }, { status: 500 });
    }

    const foundSuppliers = existingSuppliers || [];
    const notFoundIds = supplier_ids.filter(id => !foundSuppliers.find(s => s.supplier_id === id));

    if (notFoundIds.length > 0) {
      console.warn(`⚠️ [API] Proveedores no encontrados: ${notFoundIds.join(', ')}`);
    }

    // Verificar si hay facturas asociadas
    const suppliersWithInvoices = foundSuppliers.filter(s => s.total_invoices > 0);
    
    if (suppliersWithInvoices.length > 0 && !force_delete) {
      console.warn('⚠️ [API] Algunos proveedores tienen facturas asociadas');
      return NextResponse.json({
        success: false,
        error: 'Algunos proveedores tienen facturas asociadas',
        error_code: 'SUPPLIERS_HAVE_INVOICES',
        details: {
          suppliers_with_invoices: suppliersWithInvoices.map(s => ({
            supplier_id: s.supplier_id,
            name: s.name,
            total_invoices: s.total_invoices
          }))
        }
      }, { status: 409 });
    }

    // Proceder con el borrado
    const results = {
      deleted: [] as any[],
      errors: [] as any[],
      warnings: [] as any[]
    };

    for (const supplier of foundSuppliers) {
      try {
        // Si force_delete=true y tiene facturas, primero eliminar referencias
        if (force_delete && supplier.total_invoices > 0) {
          console.log(`🔗 [API] Eliminando referencias de facturas para proveedor ${supplier.name}`);
          
          // Actualizar documentos para quitar la referencia del proveedor
          await pgClient.query(
            'UPDATE documents SET supplier_id = NULL WHERE supplier_id = $1',
            [supplier.supplier_id]
          );
        }

        // Eliminar el proveedor
        const { error: deleteError } = await pgClient.query(
          'DELETE FROM suppliers WHERE supplier_id = $1',
          [supplier.supplier_id]
        );

        if (deleteError) {
          console.error(`❌ [API] Error eliminando proveedor ${supplier.name}:`, deleteError);
          results.errors.push({
            supplier_id: supplier.supplier_id,
            name: supplier.name,
            error: deleteError.message
          });
        } else {
          console.log(`✅ [API] Proveedor eliminado: ${supplier.name}`);
          results.deleted.push({
            supplier_id: supplier.supplier_id,
            name: supplier.name,
            nif_cif: supplier.nif_cif,
            had_invoices: supplier.total_invoices > 0
          });

          // Auditoría
          await AuditService.logFromRequest(request, {
            userId,
            action: AuditAction.DELETE,
            entityType: AuditEntityType.SUPPLIERS,
            entityId: supplier.supplier_id,
            oldValues: {
              name: supplier.name,
              nif_cif: supplier.nif_cif,
              total_invoices: supplier.total_invoices
            },
            metadata: {
              operation: 'bulk_delete',
              force_delete: force_delete,
              source: 'bulk_delete_api'
            }
          });
        }
      } catch (error) {
        console.error(`❌ [API] Error procesando proveedor ${supplier.name}:`, error);
        results.errors.push({
          supplier_id: supplier.supplier_id,
          name: supplier.name,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    // Agregar warnings para IDs no encontrados
    notFoundIds.forEach(id => {
      results.warnings.push({
        supplier_id: id,
        warning: 'Proveedor no encontrado'
      });
    });

    const response = {
      success: true,
      message: `Operación completada: ${results.deleted.length} eliminados, ${results.errors.length} errores, ${results.warnings.length} advertencias`,
      results: {
        total_requested: supplier_ids.length,
        deleted_count: results.deleted.length,
        error_count: results.errors.length,
        warning_count: results.warnings.length,
        deleted_suppliers: results.deleted,
        errors: results.errors,
        warnings: results.warnings
      },
      operation_details: {
        force_delete_used: force_delete,
        timestamp: new Date().toISOString(),
        user_id: userId
      }
    };

    console.log(`✅ [API] Borrado múltiple completado: ${results.deleted.length}/${supplier_ids.length} eliminados`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [API] Error general en borrado múltiple de proveedores:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      error_code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}