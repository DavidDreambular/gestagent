// API Route para gestión de Clientes
// /app/api/customers/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Configurar Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Datos de ejemplo para testing
const mockCustomers = [
  {
    customer_id: '1',
    name: 'Empresa Cliente Principal S.A.',
    nif_cif: 'A98765432',
    address: 'Gran Vía 123',
    city: 'Madrid',
    province: 'Madrid',
    customer_type: 'company',
    status: 'active',
    total_invoices: 25,
    total_amount: 78000.00,
    last_invoice_date: '2024-05-28',
    activity_status: 'reciente',
    volume_category: 'alto'
  },
  {
    customer_id: '2',
    name: 'Juan Pérez García',
    nif_cif: '12345678Z',
    address: 'Calle Valencia 45',
    city: 'Barcelona',
    province: 'Barcelona',
    customer_type: 'individual',
    status: 'active',
    total_invoices: 12,
    total_amount: 15000.00,
    last_invoice_date: '2024-05-22',
    activity_status: 'activo',
    volume_category: 'medio'
  },
  {
    customer_id: '3',
    name: 'Freelancer Digital María L.',
    nif_cif: '87654321X',
    address: 'Avenida Libertad 78',
    city: 'Valencia',
    province: 'Valencia',
    customer_type: 'freelancer',
    status: 'active',
    total_invoices: 8,
    total_amount: 9500.00,
    last_invoice_date: '2024-05-15',
    activity_status: 'activo',
    volume_category: 'bajo'
  },
  {
    customer_id: '4',
    name: 'Ayuntamiento de Sevilla',
    nif_cif: 'P4100000A',
    address: 'Plaza Nueva 1',
    city: 'Sevilla',
    province: 'Sevilla',
    customer_type: 'public',
    status: 'active',
    total_invoices: 6,
    total_amount: 45000.00,
    last_invoice_date: '2024-04-10',
    activity_status: 'inactivo',
    volume_category: 'alto'
  }
];

const mockCustomerTypes = ['company', 'individual', 'freelancer', 'public'];

// Handler GET - Listar clientes con filtros y búsqueda
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'active';
    const customerType = searchParams.get('customerType') || '';
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    console.log(`🔍 [Customers API] Listando clientes - búsqueda: "${search}", estado: ${status}`);

    // Intentar conectar a Supabase primero
    let customersData = null;
    let usesMockData = false;

    try {
      console.log(`⚠️ [Customers API] Usando tabla base customers`);
      
      // Construir consulta base
      let query = supabase.from('customers').select('*');
      
      // Aplicar filtros
      if (search) {
        query = query.or(`name.ilike.%${search}%,nif_cif.ilike.%${search}%`);
      }
      
      if (status !== 'all') {
        query = query.eq('status', status);
      }
      
      if (customerType) {
        query = query.eq('customer_type', customerType);
      }
      
      // Aplicar ordenación y paginación
      const { data: realCustomers, error: customersError } = await query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range((page - 1) * limit, page * limit - 1);

      if (!customersError && realCustomers) {
        customersData = realCustomers;
        console.log(`✅ [Customers API] Datos reales obtenidos: ${realCustomers.length} clientes`);
      } else {
        throw new Error('Base de datos no disponible');
      }
    } catch (error) {
      console.log(`⚠️ [Customers API] Usando datos de ejemplo (BD no disponible)`);
      usesMockData = true;

      // Filtrar datos de ejemplo
      let filteredCustomers = mockCustomers.filter(customer => {
        const matchesSearch = search === '' || 
          customer.name.toLowerCase().includes(search.toLowerCase()) ||
          customer.nif_cif.toLowerCase().includes(search.toLowerCase());
        
        const matchesStatus = status === 'all' || customer.status === status;
        const matchesType = customerType === '' || customer.customer_type === customerType;
        
        return matchesSearch && matchesStatus && matchesType;
      });

      // Ordenar datos de ejemplo
      filteredCustomers.sort((a, b) => {
        let aValue = a[sortBy as keyof typeof a];
        let bValue = b[sortBy as keyof typeof b];
        
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();
        
        if (sortOrder === 'desc') {
          return bValue > aValue ? 1 : -1;
        } else {
          return aValue > bValue ? 1 : -1;
        }
      });

      // Paginar datos de ejemplo
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      customersData = filteredCustomers.slice(startIndex, endIndex);
    }

    // Obtener estadísticas (usar mock si es necesario)
    let totalActive = 0;
    let availableCustomerTypes = mockCustomerTypes;

    if (!usesMockData) {
      try {
        const { data: stats } = await supabase
          .from('customers')
          .select('status, customer_type')
          .eq('status', 'active');

        if (stats) {
          totalActive = stats.length;
          availableCustomerTypes = Array.from(new Set(stats.map(s => s.customer_type).filter(Boolean)));
        }
      } catch (error) {
        console.log('⚠️ [Customers API] Usando estadísticas de ejemplo');
        totalActive = mockCustomers.filter(s => s.status === 'active').length;
      }
    } else {
      totalActive = mockCustomers.filter(s => s.status === 'active').length;
    }

    const totalCustomers = usesMockData ? mockCustomers.length : customersData.length;
    const totalPages = Math.ceil(totalCustomers / limit);

    const response = {
      customers: customersData,
      pagination: {
        page,
        limit,
        total: totalCustomers,
        pages: totalPages
      },
      metadata: {
        total_active: totalActive,
        available_customer_types: availableCustomerTypes,
        using_mock_data: usesMockData
      }
    };

    console.log(`✅ [Customers API] Respuesta enviada: ${customersData.length} clientes`);
    
    return NextResponse.json({
      success: true,
      data: response,
      message: usesMockData ? 'Datos de ejemplo (BD no disponible)' : 'Datos obtenidos exitosamente'
    });

  } catch (error) {
    console.error('❌ [Customers API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    }, { status: 500 });
  }
}

// Handler POST - Crear o actualizar cliente manualmente
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || '00000000-0000-0000-0000-000000000000';

    const body = await request.json();
    console.log('✨ [Customers API] Creando/actualizando cliente...');

    const {
      customer_id,
      name,
      nif_cif,
      commercial_name,
      address,
      postal_code,
      city,
      province,
      phone,
      email,
      customer_type,
      payment_terms,
      credit_limit,
      status,
      notes
    } = body;

    // Validaciones básicas
    if (!name) {
      return NextResponse.json({
        success: false,
        error: 'El nombre del cliente es obligatorio'
      }, { status: 400 });
    }

    if (customer_id) {
      // Actualizar cliente existente
      const { data: updated, error } = await supabase
        .from('customers')
        .update({
          name,
          nif_cif: nif_cif || null,
          commercial_name: commercial_name || null,
          address: address || null,
          postal_code: postal_code || null,
          city: city || null,
          province: province || null,
          phone: phone || null,
          email: email || null,
          customer_type: customer_type || 'company',
          payment_terms: payment_terms || null,
          credit_limit: credit_limit || null,
          status: status || 'active',
          notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('customer_id', customer_id)
        .select()
        .single();

      if (error) {
        console.error('❌ [Customers API] Error actualizando cliente:', error);
        return NextResponse.json({
          success: false,
          error: 'Error actualizando cliente',
          details: error.message
        }, { status: 500 });
      }

      console.log(`✅ [Customers API] Cliente actualizado: ${updated.name}`);
      return NextResponse.json({
        success: true,
        data: updated,
        action: 'updated'
      });

    } else {
      // Crear nuevo cliente
      const { data: created, error } = await supabase
        .from('customers')
        .insert({
          name,
          nif_cif: nif_cif || null,
          commercial_name: commercial_name || null,
          address: address || null,
          postal_code: postal_code || null,
          city: city || null,
          province: province || null,
          phone: phone || null,
          email: email || null,
          customer_type: customer_type || 'company',
          payment_terms: payment_terms || null,
          credit_limit: credit_limit || null,
          status: status || 'active',
          notes: notes || null,
          first_detected_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [Customers API] Error creando cliente:', error);
        return NextResponse.json({
          success: false,
          error: 'Error creando cliente',
          details: error.message
        }, { status: 500 });
      }

      console.log(`✨ [Customers API] Nuevo cliente creado: ${created.name}`);
      return NextResponse.json({
        success: true,
        data: created,
        action: 'created'
      });
    }

  } catch (error: any) {
    console.error('❌ [Customers API] Error general:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      message: error?.message || 'Error desconocido'
    }, { status: 500 });
  }
} 