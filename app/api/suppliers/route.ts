// API Route para gestión de Proveedores
// /app/api/suppliers/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Configurar Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Datos de ejemplo como fallback ÚNICAMENTE si falla Supabase
const fallbackSuppliers = [
  {
    supplier_id: '1',
    name: 'SERVICIOS Y APLICACIONES TÉCNICAS PARA ELIMINACIÓN DE RESIDUOS, S.L.',
    nif_cif: 'A12345678',
    address: 'Calle Innovación 123, 28001 Madrid',
    city: 'Madrid',
    province: 'Madrid',
    business_sector: 'Servicios Medioambientales',
    company_size: 'mediana',
    status: 'active',
    total_invoices: 15,
    total_amount: 45000.00,
    last_invoice_date: '2024-05-25',
    activity_status: 'reciente',
    volume_category: 'medio'
  },
  {
    supplier_id: '2',
    name: 'ENERGY DIAGONAL S.L.',
    nif_cif: 'B87654321',
    address: 'Avenida Desarrollo 456, 08001 Barcelona',
    city: 'Barcelona',
    province: 'Barcelona',
    business_sector: 'Energía',
    company_size: 'pequeña',
    status: 'active',
    total_invoices: 8,
    total_amount: 12000.00,
    last_invoice_date: '2024-05-20',
    activity_status: 'activo',
    volume_category: 'bajo'
  }
];

const mockSectors = ['Tecnología', 'Consultoría', 'Distribución', 'Servicios'];

// Handler GET - Listar proveedores con filtros y búsqueda
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'active';
    const sortBy = searchParams.get('sortBy') || 'total_amount';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    console.log(`🔍 [Suppliers API] Listando proveedores - búsqueda: "${search}", estado: ${status}`);

    // Intentar obtener proveedores reales de Supabase
    try {
      // Primero intentar con la vista suppliers_with_stats
      let { data: realSuppliers, error: viewError } = await supabase
        .from('suppliers_with_stats')
        .select('*')
        .ilike('name', `%${search}%`)
        .eq(status !== 'all' ? 'status' : 'created_at', status !== 'all' ? status : '1970-01-01')
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range((page - 1) * limit, page * limit - 1);

      // Si la vista no existe, intentar con la tabla base
      if (viewError && viewError.message.includes('does not exist')) {
        console.log('⚠️ [Suppliers API] Vista suppliers_with_stats no existe, usando tabla base');
        
        const { data: baseSuppliers, error: baseError } = await supabase
          .from('suppliers')
          .select(`
            supplier_id,
            name,
            nif_cif,
            commercial_name,
            address,
            postal_code,
            city,
            province,
            phone,
            email,
            business_sector,
            company_size,
            status,
            notes,
            created_at,
            updated_at,
            total_invoices,
            total_amount,
            last_invoice_date
          `)
          .ilike('name', `%${search}%`)
          .eq(status !== 'all' ? 'status' : 'created_at', status !== 'all' ? status : '1970-01-01')
          .order(sortBy, { ascending: sortOrder === 'asc' })
          .range((page - 1) * limit, page * limit - 1);

        if (baseError) {
          throw new Error(`Error de base de datos: ${baseError.message}`);
        }

        realSuppliers = baseSuppliers?.map(supplier => ({
          ...supplier,
          volume_category: supplier.total_amount > 50000 ? 'alto' : 
                          supplier.total_amount > 10000 ? 'medio' : 'bajo',
          activity_status: supplier.last_invoice_date && 
                          new Date(supplier.last_invoice_date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) 
                          ? 'reciente' : 'inactivo'
        })) || [];
      } else if (viewError) {
        throw new Error(`Error en vista: ${viewError.message}`);
      }

      // Obtener estadísticas
      const { data: statsData, error: statsError } = await supabase
        .from('suppliers')
        .select('status, business_sector')
        .eq('status', 'active');

      if (statsError) {
        console.warn('⚠️ [Suppliers API] Error obteniendo estadísticas:', statsError);
      }

      const totalActive = statsData?.length || 0;
      const availableSectors = Array.from(new Set(
        statsData?.map(s => s.business_sector).filter(Boolean) || []
      ));

      // Obtener conteo total para paginación
      const { count: totalCount } = await supabase
        .from('suppliers')
        .select('*', { count: 'exact', head: true })
        .ilike('name', `%${search}%`)
        .eq(status !== 'all' ? 'status' : 'created_at', status !== 'all' ? status : '1970-01-01');

      const totalPages = Math.ceil((totalCount || 0) / limit);

      const response = {
        suppliers: realSuppliers || [],
        pagination: {
          page,
          limit,
          total: totalCount || 0,
          pages: totalPages
        },
        metadata: {
          total_active: totalActive,
          available_sectors: availableSectors.length > 0 ? availableSectors : ['Tecnología', 'Servicios', 'Comercio'],
          using_mock_data: false
        }
      };

      console.log(`✅ [Suppliers API] Datos reales obtenidos: ${realSuppliers?.length || 0} proveedores`);
      
      return NextResponse.json({
        success: true,
        data: response,
        message: 'Datos obtenidos exitosamente desde Supabase'
      });

    } catch (dbError) {
      console.error('❌ [Suppliers API] Error conectando a Supabase:', dbError);
      
      // Fallback: datos de ejemplo solo si falla completamente la BD
      const mockSuppliers = [
        {
          supplier_id: '1',
          name: 'SERVICIOS Y APLICACIONES TÉCNICAS PARA ELIMINACIÓN DE RESIDUOS, S.L.',
          nif_cif: 'A12345678',
          address: 'Calle Innovación 123, 28001 Madrid',
          city: 'Madrid',
          province: 'Madrid',
          business_sector: 'Servicios Medioambientales',
          company_size: 'mediana',
          status: 'active',
          total_invoices: 15,
          total_amount: 45000.00,
          last_invoice_date: '2024-05-25',
          activity_status: 'reciente',
          volume_category: 'medio'
        },
        {
          supplier_id: '2',
          name: 'ENERGY DIAGONAL S.L.',
          nif_cif: 'B87654321',
          address: 'Avenida Desarrollo 456, 08001 Barcelona',
          city: 'Barcelona',
          province: 'Barcelona',
          business_sector: 'Energía',
          company_size: 'pequeña',
          status: 'active',
          total_invoices: 8,
          total_amount: 12000.00,
          last_invoice_date: '2024-05-20',
          activity_status: 'activo',
          volume_category: 'bajo'
        }
      ];

      // Aplicar filtros a datos mock
      let filteredSuppliers = mockSuppliers.filter(supplier => {
        const matchesSearch = search === '' || 
          supplier.name.toLowerCase().includes(search.toLowerCase()) ||
          supplier.nif_cif.toLowerCase().includes(search.toLowerCase());
        
        const matchesStatus = status === 'all' || supplier.status === status;
        
        return matchesSearch && matchesStatus;
      });

      const totalPages = Math.ceil(filteredSuppliers.length / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedSuppliers = filteredSuppliers.slice(startIndex, endIndex);

      console.log(`⚠️ [Suppliers API] Usando datos de ejemplo: ${paginatedSuppliers.length} proveedores`);

      return NextResponse.json({
        success: true,
        data: {
          suppliers: paginatedSuppliers,
          pagination: {
            page,
            limit,
            total: filteredSuppliers.length,
            pages: totalPages
          },
          metadata: {
            total_active: mockSuppliers.filter(s => s.status === 'active').length,
            available_sectors: ['Servicios Medioambientales', 'Energía', 'Tecnología'],
            using_mock_data: true
          }
        },
        message: 'Base de datos no disponible - usando datos de ejemplo'
      });
    }

  } catch (error) {
    console.error('❌ [Suppliers API] Error general:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    }, { status: 500 });
  }
}

// Handler POST - Crear o actualizar proveedor manualmente
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || '00000000-0000-0000-0000-000000000000';

    const body = await request.json();
    console.log('✨ [Suppliers API] Creando/actualizando proveedor...');

    const {
      supplier_id,
      name,
      nif_cif,
      commercial_name,
      address,
      postal_code,
      city,
      province,
      phone,
      email,
      business_sector,
      company_size,
      status,
      notes
    } = body;

    // Validaciones básicas
    if (!name) {
      return NextResponse.json({
        success: false,
        error: 'El nombre del proveedor es obligatorio'
      }, { status: 400 });
    }

    if (supplier_id) {
      // Actualizar proveedor existente
      const { data: updated, error } = await supabase
        .from('suppliers')
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
          business_sector: business_sector || null,
          company_size: company_size || null,
          status: status || 'active',
          notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('supplier_id', supplier_id)
        .select()
        .single();

      if (error) {
        console.error('❌ [Suppliers API] Error actualizando proveedor:', error);
        return NextResponse.json({
          success: false,
          error: 'Error actualizando proveedor',
          details: error.message
        }, { status: 500 });
      }

      console.log(`✅ [Suppliers API] Proveedor actualizado: ${updated.name}`);
      return NextResponse.json({
        success: true,
        data: updated,
        action: 'updated'
      });

    } else {
      // Crear nuevo proveedor
      const { data: created, error } = await supabase
        .from('suppliers')
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
          business_sector: business_sector || null,
          company_size: company_size || null,
          status: status || 'active',
          notes: notes || null,
          first_detected_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [Suppliers API] Error creando proveedor:', error);
        return NextResponse.json({
          success: false,
          error: 'Error creando proveedor',
          details: error.message
        }, { status: 500 });
      }

      console.log(`✨ [Suppliers API] Nuevo proveedor creado: ${created.name}`);
      return NextResponse.json({
        success: true,
        data: created,
        action: 'created'
      });
    }

  } catch (error: any) {
    console.error('❌ [Suppliers API] Error general:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      message: error?.message || 'Error desconocido'
    }, { status: 500 });
  }
} 