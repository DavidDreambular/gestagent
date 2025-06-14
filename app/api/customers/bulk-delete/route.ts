// API Route para borrado múltiple de clientes
// /app/api/customers/bulk-delete/route.ts

import { NextRequest, NextResponse } from 'next/server';
import pgClient from '@/lib/postgresql-client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AuditService, { AuditAction, AuditEntityType } from '@/services/audit.service';

export async function POST(request: NextRequest) {
  try {
    console.log('🗑️ [API] Iniciando borrado múltiple de clientes...');

    // Verificar autenticación (opcional para desarrollo)
    let userId = '00000000-0000-0000-0000-000000000000';
    try {
      const session = await getServerSession(authOptions);
      userId = session?.user?.id || '00000000-0000-0000-0000-000000000000';
    } catch (authError) {
      console.warn('⚠️ [API] Sin autenticación, usando usuario de desarrollo');
    }

    // Parsear datos de la request
    const { customer_ids, force_delete = false } = await request.json();

    // Validaciones
    if (!customer_ids || !Array.isArray(customer_ids) || customer_ids.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Se requiere un array de customer_ids válido',
        error_code: 'INVALID_CUSTOMER_IDS'
      }, { status: 400 });
    }

    if (customer_ids.length > 50) {
      return NextResponse.json({
        success: false,
        error: 'Máximo 50 clientes por operación',
        error_code: 'TOO_MANY_CUSTOMERS'
      }, { status: 400 });
    }

    console.log(`📋 [API] Solicitado borrado de ${customer_ids.length} clientes`);

    // Verificar que los clientes existen
    const { data: existingCustomers, error: checkError } = await pgClient.query(
      `SELECT customer_id, name, nif_cif, total_invoices 
       FROM customers 
       WHERE customer_id = ANY($1)`,
      [customer_ids]
    );

    if (checkError) {
      console.error('❌ [API] Error verificando clientes:', checkError);
      return NextResponse.json({
        success: false,
        error: 'Error verificando clientes en base de datos',
        error_code: 'DATABASE_CHECK_ERROR'
      }, { status: 500 });
    }

    const foundCustomers = existingCustomers || [];
    const notFoundIds = customer_ids.filter(id => !foundCustomers.find(c => c.customer_id === id));

    if (notFoundIds.length > 0) {
      console.warn(`⚠️ [API] Clientes no encontrados: ${notFoundIds.join(', ')}`);
    }

    // Verificar si hay facturas asociadas
    const customersWithInvoices = foundCustomers.filter(c => c.total_invoices > 0);
    
    if (customersWithInvoices.length > 0 && !force_delete) {
      console.warn('⚠️ [API] Algunos clientes tienen facturas asociadas');
      return NextResponse.json({
        success: false,
        error: 'Algunos clientes tienen facturas asociadas',
        error_code: 'CUSTOMERS_HAVE_INVOICES',
        details: {
          customers_with_invoices: customersWithInvoices.map(c => ({
            customer_id: c.customer_id,
            name: c.name,
            total_invoices: c.total_invoices
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

    for (const customer of foundCustomers) {
      try {
        // Si force_delete=true y tiene facturas, primero eliminar referencias
        if (force_delete && customer.total_invoices > 0) {
          console.log(`🔗 [API] Eliminando referencias de facturas para cliente ${customer.name}`);
          
          // Actualizar documentos para quitar la referencia del cliente
          await pgClient.query(
            'UPDATE documents SET customer_id = NULL WHERE customer_id = $1',
            [customer.customer_id]
          );
        }

        // Eliminar el cliente
        const { error: deleteError } = await pgClient.query(
          'DELETE FROM customers WHERE customer_id = $1',
          [customer.customer_id]
        );

        if (deleteError) {
          console.error(`❌ [API] Error eliminando cliente ${customer.name}:`, deleteError);
          results.errors.push({
            customer_id: customer.customer_id,
            name: customer.name,
            error: deleteError.message
          });
        } else {
          console.log(`✅ [API] Cliente eliminado: ${customer.name}`);
          results.deleted.push({
            customer_id: customer.customer_id,
            name: customer.name,
            nif_cif: customer.nif_cif,
            had_invoices: customer.total_invoices > 0
          });

          // Auditoría
          await AuditService.logFromRequest(request, {
            userId,
            action: AuditAction.DELETE,
            entityType: AuditEntityType.CUSTOMERS,
            entityId: customer.customer_id,
            oldValues: {
              name: customer.name,
              nif_cif: customer.nif_cif,
              total_invoices: customer.total_invoices
            },
            metadata: {
              operation: 'bulk_delete',
              force_delete: force_delete,
              source: 'bulk_delete_api'
            }
          });
        }
      } catch (error) {
        console.error(`❌ [API] Error procesando cliente ${customer.name}:`, error);
        results.errors.push({
          customer_id: customer.customer_id,
          name: customer.name,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    // Agregar warnings para IDs no encontrados
    notFoundIds.forEach(id => {
      results.warnings.push({
        customer_id: id,
        warning: 'Cliente no encontrado'
      });
    });

    const response = {
      success: true,
      message: `Operación completada: ${results.deleted.length} eliminados, ${results.errors.length} errores, ${results.warnings.length} advertencias`,
      results: {
        total_requested: customer_ids.length,
        deleted_count: results.deleted.length,
        error_count: results.errors.length,
        warning_count: results.warnings.length,
        deleted_customers: results.deleted,
        errors: results.errors,
        warnings: results.warnings
      },
      operation_details: {
        force_delete_used: force_delete,
        timestamp: new Date().toISOString(),
        user_id: userId
      }
    };

    console.log(`✅ [API] Borrado múltiple completado: ${results.deleted.length}/${customer_ids.length} eliminados`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [API] Error general en borrado múltiple de clientes:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      error_code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}