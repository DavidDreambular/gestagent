// API Route para gestión de clientes - MIGRADO A POSTGRESQL
// /app/api/customers/route.ts

import { NextRequest, NextResponse } from 'next/server';
import pgClient from '@/lib/postgresql-client';

export const dynamic = 'force-dynamic';

// GET - Obtener lista de clientes
export async function GET(request: NextRequest) {
  try {
    console.log('📋 [Customers API] Obteniendo lista de clientes desde PostgreSQL');

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'active';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log(`📋 [Customers API] Parámetros: search="${search}", status="${status}", limit=${limit}, offset=${offset}`);

    const { data: customers, error } = await pgClient.getCustomers({
      search: search || undefined,
      status: status === 'all' ? undefined : status,
      limit,
      offset
    });

    if (error) {
      console.error('❌ [Customers API] Error obteniendo clientes:', error);
      return NextResponse.json({
        success: false,
        error: 'Error obteniendo clientes',
        details: error.message
      }, { status: 500 });
    }

    console.log(`✅ [Customers API] ${customers?.length || 0} clientes encontrados`);

    // Obtener conteo total para paginación
    let totalCount = customers?.length || 0;
    try {
      const countQuery = await pgClient.query(
        'SELECT COUNT(*) as total FROM customers WHERE 1=1' +
        (status && status !== 'all' ? ' AND status = $1' : '') +
                 (search ? ` AND (name ILIKE $${status && status !== 'all' ? '2' : '1'} OR nif_cif ILIKE $${status && status !== 'all' ? '2' : '1'})` : ''),
        [
          ...(status && status !== 'all' ? [status] : []),
          ...(search ? [`%${search}%`] : [])
        ].filter(Boolean)
      );
      totalCount = parseInt(countQuery.data?.[0]?.total || '0');
    } catch (countError) {
      console.warn('⚠️ [Customers API] Error obteniendo conteo total:', countError);
    }

    return NextResponse.json({
      success: true,
      customers: customers || [],
      total: totalCount,
      pagination: {
        limit,
        offset,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      source: 'postgresql'
    });

  } catch (error) {
    console.error('❌ [Customers API] Error general:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// POST - Crear nuevo cliente
export async function POST(request: NextRequest) {
  try {
    console.log('➕ [Customers API] Creando nuevo cliente');

    const body = await request.json();
    const { name, tax_id, email, phone, address } = body;

    if (!name || !tax_id) {
      return NextResponse.json({
        success: false,
        error: 'Nombre y NIF/CIF son obligatorios'
      }, { status: 400 });
    }

    // Verificar si ya existe un cliente con ese NIF/CIF
    const { data: existingCustomer } = await pgClient.query(
      'SELECT customer_id FROM customers WHERE nif_cif = $1',
      [tax_id]
    );

    if (existingCustomer && existingCustomer.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Ya existe un cliente con ese NIF/CIF'
      }, { status: 409 });
    }

    // Crear cliente
    const { data: newCustomer, error } = await pgClient.query(
      `INSERT INTO customers (name, nif_cif, email, phone, address, status, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW()) 
       RETURNING *`,
      [name, tax_id, email || null, phone || null, address || null]
    );

    if (error) {
      console.error('❌ [Customers API] Error creando cliente:', error);
      return NextResponse.json({
        success: false,
        error: 'Error creando cliente',
        details: error.message
      }, { status: 500 });
    }

    console.log('✅ [Customers API] Cliente creado exitosamente:', newCustomer?.[0]?.id);

    return NextResponse.json({
      success: true,
      customer: newCustomer?.[0],
      message: 'Cliente creado exitosamente'
    });

  } catch (error) {
    console.error('❌ [Customers API] Error general:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 