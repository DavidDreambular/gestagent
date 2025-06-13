// API Route para obtener facturas de un cliente específico
// /app/api/customers/[id]/invoices/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PostgreSQLClient } from '@/lib/postgresql-client';

// Inicializar cliente PostgreSQL
const pgClient = new PostgreSQLClient();

interface InvoiceEntity {
  id: string;
  document_id: string;
  supplier_id?: string;
  customer_id?: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  tax_amount?: number;
  status: string;
  created_at: string;
  updated_at: string;
  // Datos del documento relacionado
  document_type?: string;
  upload_timestamp?: string;
  emitter_name?: string;
  receiver_name?: string;
  // Datos del proveedor
  supplier_name?: string;
  supplier_nif?: string;
}

// GET: Obtener todas las facturas de un cliente
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    
    // Parámetros de consulta
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || 'all';
    const sortBy = searchParams.get('sortBy') || 'invoice_date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const search = searchParams.get('search') || '';
    
    const offset = (page - 1) * limit;

    console.log(`📋 [Customer Invoices] Obteniendo facturas del cliente: ${id}`);

    // Validar que el ID sea válido
    if (!id || id === 'undefined' || id === 'null') {
      return NextResponse.json(
        { error: 'ID de cliente inválido' },
        { status: 400 }
      );
    }

    // Construir consulta base
    let whereClause = 'WHERE ie.customer_id = $1';
    let params: any[] = [id];
    let paramIndex = 2;

    // Filtros adicionales
    if (status !== 'all') {
      whereClause += ` AND ie.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (ie.invoice_number ILIKE $${paramIndex} OR s.name ILIKE $${paramIndex} OR d.emitter_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Consulta principal para obtener facturas del cliente
    const invoicesQuery = `
      SELECT 
        ie.*,
        d.document_type,
        d.upload_timestamp,
        d.emitter_name,
        d.receiver_name,
        d.file_path,
        s.name as supplier_name,
        s.nif_cif as supplier_nif
      FROM invoice_entities ie
      LEFT JOIN documents d ON ie.document_id = d.job_id
      LEFT JOIN suppliers s ON ie.supplier_id = s.supplier_id
      ${whereClause}
      ORDER BY ie.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const invoicesResult = await pgClient.query<InvoiceEntity>(invoicesQuery, params);
    
    if (invoicesResult.error) {
      throw new Error(`Error en consulta de facturas: ${invoicesResult.error}`);
    }

    const invoices = invoicesResult.data || [];

    // Consulta para contar total de facturas
    const countQuery = `
      SELECT COUNT(*) as total
      FROM invoice_entities ie
      LEFT JOIN documents d ON ie.document_id = d.job_id
      LEFT JOIN suppliers s ON ie.supplier_id = s.supplier_id
      ${whereClause}
    `;

    const countResult = await pgClient.query<{total: number}>(countQuery, params.slice(0, -2));
    const totalInvoices = countResult.data?.[0]?.total || 0;

    // Calcular estadísticas
    const statsQuery = `
      SELECT 
        COUNT(*) as total_invoices,
        SUM(ie.total_amount) as total_amount,
        AVG(ie.total_amount) as average_amount,
        COUNT(CASE WHEN ie.status = 'active' THEN 1 END) as active_invoices,
        COUNT(CASE WHEN ie.invoice_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_invoices,
        COUNT(CASE WHEN ie.invoice_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as invoices_90_days
      FROM invoice_entities ie
      WHERE ie.customer_id = $1
    `;

    const statsResult = await pgClient.query(statsQuery, [id]);
    const stats = statsResult.data?.[0] || {
      total_invoices: 0,
      total_amount: 0,
      average_amount: 0,
      active_invoices: 0,
      recent_invoices: 0,
      invoices_90_days: 0
    };

    console.log(`✅ [Customer Invoices] ${invoices.length} facturas encontradas para cliente ${id}`);

    // Mapear las facturas al formato esperado por InvoiceHistory
    const mappedInvoices = invoices.map(invoice => ({
      id: invoice.id || invoice.document_id,
      number: invoice.invoice_number || 'Sin número',
      date: invoice.invoice_date || invoice.upload_timestamp,
      amount: parseFloat(invoice.total_amount) || 0,
      status: invoice.status === 'active' ? 'processed' : 
              invoice.status === 'cancelled' ? 'error' : 'pending',
      documentType: invoice.document_type || 'factura',
      supplier: invoice.supplier_name,
      customer: invoice.receiver_name
    }));

    return NextResponse.json({
      success: true,
      invoices: mappedInvoices, // Formato esperado por InvoiceHistory
      data: {
        invoices,
        pagination: {
          page,
          limit,
          total: totalInvoices,
          pages: Math.ceil(totalInvoices / limit)
        },
        statistics: {
          total_invoices: parseInt(stats.total_invoices) || 0,
          total_amount: parseFloat(stats.total_amount) || 0,
          average_amount: parseFloat(stats.average_amount) || 0,
          active_invoices: parseInt(stats.active_invoices) || 0,
          recent_invoices: parseInt(stats.recent_invoices) || 0,
          invoices_90_days: parseInt(stats.invoices_90_days) || 0
        },
        filters: {
          status,
          search,
          sortBy,
          sortOrder
        }
      }
    });

  } catch (error) {
    console.error('[Customer Invoices] Error:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}