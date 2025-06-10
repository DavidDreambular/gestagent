// API Route para gestión de proveedores - MIGRADO A POSTGRESQL
// /app/api/suppliers/route.ts

import { NextRequest, NextResponse } from 'next/server';
import pgClient from '@/lib/postgresql-client';

export const dynamic = 'force-dynamic';

// GET - Obtener lista de proveedores
export async function GET(request: NextRequest) {
  try {
    console.log('📋 [Suppliers API] Obteniendo lista de proveedores desde PostgreSQL');

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'active';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log(`📋 [Suppliers API] Parámetros: search="${search}", status="${status}", limit=${limit}, offset=${offset}`);

    const { data: suppliers, error } = await pgClient.getSuppliers({
      search: search || undefined,
      status: status === 'all' ? undefined : status,
      limit,
      offset
    });

    if (error) {
      console.error('❌ [Suppliers API] Error obteniendo proveedores:', error);
      return NextResponse.json({
        success: false,
        error: 'Error obteniendo proveedores',
        details: error.message
      }, { status: 500 });
    }

    console.log(`✅ [Suppliers API] ${suppliers?.length || 0} proveedores encontrados`);

    // Obtener conteo total para paginación
    let totalCount = suppliers?.length || 0;
    try {
      const countQuery = await pgClient.query(
        'SELECT COUNT(*) as total FROM suppliers WHERE 1=1' +
        (status && status !== 'all' ? ' AND status = $1' : '') +
                 (search ? ` AND (name ILIKE $${status && status !== 'all' ? '2' : '1'} OR nif_cif ILIKE $${status && status !== 'all' ? '2' : '1'})` : ''),
        [
          ...(status && status !== 'all' ? [status] : []),
          ...(search ? [`%${search}%`] : [])
        ].filter(Boolean)
      );
      totalCount = parseInt(countQuery.data?.[0]?.total || '0');
    } catch (countError) {
      console.warn('⚠️ [Suppliers API] Error obteniendo conteo total:', countError);
    }

    return NextResponse.json({
      success: true,
      data: {
        suppliers: suppliers || [],
        metadata: {
          total: totalCount,
          total_active: suppliers?.filter((s: any) => s.status === 'active').length || 0,
          available_sectors: [...new Set(suppliers?.map((s: any) => s.business_sector).filter(Boolean) || [])]
        }
      },
      pagination: {
        limit,
        offset,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      source: 'postgresql'
    });

  } catch (error) {
    console.error('❌ [Suppliers API] Error general:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// POST - Crear nuevo proveedor
export async function POST(request: NextRequest) {
  try {
    console.log('➕ [Suppliers API] Creando nuevo proveedor');

    const body = await request.json();
    const { name, tax_id, email, phone, address } = body;

    if (!name || !tax_id) {
      return NextResponse.json({
        success: false,
        error: 'Nombre y NIF/CIF son obligatorios'
      }, { status: 400 });
    }

    // Verificar si ya existe un proveedor con ese NIF/CIF
    const { data: existingSupplier } = await pgClient.query(
      'SELECT supplier_id FROM suppliers WHERE nif_cif = $1',
      [tax_id]
    );

    if (existingSupplier && existingSupplier.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Ya existe un proveedor con ese NIF/CIF'
      }, { status: 409 });
    }

    // Crear proveedor
    const { data: newSupplier, error } = await pgClient.query(
      `INSERT INTO suppliers (name, nif_cif, email, phone, address, status, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW()) 
       RETURNING *`,
      [name, tax_id, email || null, phone || null, address || null]
    );

    if (error) {
      console.error('❌ [Suppliers API] Error creando proveedor:', error);
      return NextResponse.json({
        success: false,
        error: 'Error creando proveedor',
        details: error.message
      }, { status: 500 });
    }

    console.log('✅ [Suppliers API] Proveedor creado exitosamente:', newSupplier?.[0]?.id);

    return NextResponse.json({
      success: true,
      supplier: newSupplier?.[0],
      message: 'Proveedor creado exitosamente'
    });

  } catch (error) {
    console.error('❌ [Suppliers API] Error general:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 