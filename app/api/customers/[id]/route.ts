// API Route para gestión individual de clientes
// /app/api/customers/[id]/route.ts
// Versión 2.0.0 - Migrado a PostgreSQL

import { NextRequest, NextResponse } from 'next/server';
import { PostgreSQLClient } from '@/lib/postgresql-client';
import { dbAdapter } from '@/lib/db-adapter';

// Inicializar cliente PostgreSQL
const pgClient = new PostgreSQLClient();

// Interfaces para tipado
interface Document {
  job_id: string;
  document_type: string;
  status: string;
  upload_timestamp: string;
  document_date: string;
  total_amount: string;
  emitter_name: string;
  receiver_name: string;
}

interface Customer {
  customer_id: string;
  name: string;
  commercial_name?: string;
  nif_cif: string;
  address?: string;
  postal_code?: string;
  city?: string;
  province?: string;
  phone?: string;
  email?: string;
  website?: string;
  customer_type?: string;
  status: string;
  payment_terms?: string;
  notes?: string;
  total_amount?: string;
  last_invoice_date?: string;
  activity_status?: string;
  volume_category?: string;
}

// GET: Obtener cliente específico con estadísticas y documentos relacionados
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    console.log(`🔍 [Customer Detail] Obteniendo cliente: ${id}`);

    // Validar que el ID sea válido
    if (!id || id === 'undefined' || id === 'null') {
      console.error(`❌ [Customer Detail] ID inválido recibido: ${id}`);
      return NextResponse.json(
        { error: 'ID de cliente inválido' },
        { status: 400 }
      );
    }

    // Validar formato UUID si es necesario
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.error(`❌ [Customer Detail] ID no es un UUID válido: ${id}`);
      return NextResponse.json(
        { error: 'Formato de ID inválido' },
        { status: 400 }
      );
    }

    // Obtener datos del cliente
    const customerQuery = `
      SELECT * FROM customers 
      WHERE customer_id = $1
    `;
    
    const customerResult = await pgClient.query<Customer>(customerQuery, [id]);
    
    if (customerResult.error || !customerResult.data || customerResult.data.length === 0) {
      console.error(`❌ [Customer Detail] Cliente no encontrado: ${id}`);
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    const customer = customerResult.data[0];

    // Obtener documentos relacionados a través de invoice_entities
    const documentsQuery = `
      SELECT DISTINCT
        d.job_id,
        d.document_type,
        d.status,
        d.upload_timestamp,
        d.document_date,
        d.total_amount,
        d.emitter_name,
        d.receiver_name,
        ie.invoice_number,
        ie.invoice_date,
        ie.total_amount as invoice_amount
      FROM documents d
      LEFT JOIN invoice_entities ie ON d.job_id = ie.document_id
      WHERE d.customer_id = $1 OR ie.customer_id = $1
      ORDER BY d.upload_timestamp DESC
      LIMIT 50
    `;

    const documentsResult = await pgClient.query<Document>(documentsQuery, [id]);
    const documents = documentsResult.data || [];

    // Calcular estadísticas adicionales
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const recentDocuments = documents?.filter((doc: Document) => 
      new Date(doc.upload_timestamp) > thirtyDaysAgo
    ).length || 0;

    const documentsLast90Days = documents?.filter((doc: Document) => 
      new Date(doc.upload_timestamp) > ninetyDaysAgo
    ).length || 0;

    const completedDocuments = documents?.filter((doc: Document) => 
      doc.status === 'completed'
    ).length || 0;

    const totalAmountLast90Days = documents
      ?.filter((doc: Document) => new Date(doc.upload_timestamp) > ninetyDaysAgo)
      ?.reduce((sum: number, doc: Document) => sum + (parseFloat(doc.total_amount) || 0), 0) || 0;

    const response = {
      customer: {
        ...customer,
        formatted_address: `${customer.address || ''}, ${customer.postal_code || ''} ${customer.city || ''}, ${customer.province || ''}`.trim().replace(/^,\s*/, ''),
        contact_info: {
          phone: customer.phone,
          email: customer.email,
          website: customer.website
        }
      },
      documents: documents || [],
      statistics: {
        total_documents: documents?.length || 0,
        completed_documents: completedDocuments,
        recent_documents: recentDocuments,
        documents_last_90_days: documentsLast90Days,
        total_amount: parseFloat(customer.total_amount || '0') || 0,
        total_amount_last_90_days: totalAmountLast90Days,
        average_document_amount: documents && documents.length > 0 
          ? (parseFloat(customer.total_amount || '0') || 0) / documents.length 
          : 0,
        last_activity: customer.last_invoice_date,
        activity_status: customer.activity_status,
        volume_category: customer.volume_category
      }
    };

    console.log(`✅ [Customer Detail] Cliente obtenido: ${customer.name} (${documents?.length || 0} documentos)`);

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('[Customer Detail] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT: Actualizar cliente
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    console.log(`📝 [Customer Update] Actualizando cliente: ${id}`);

    // Validar campos requeridos
    if (!body.name || !body.nif_cif) {
      return NextResponse.json(
        { error: 'Nombre y NIF/CIF son campos obligatorios' },
        { status: 400 }
      );
    }

    // Actualizar cliente
    const updateQuery = `
      UPDATE customers SET
        name = $2,
        commercial_name = $3,
        nif_cif = $4,
        address = $5,
        postal_code = $6,
        city = $7,
        province = $8,
        phone = $9,
        email = $10,
        website = $11,
        customer_type = $12,
        status = $13,
        payment_terms = $14,
        notes = $15,
        updated_at = NOW()
      WHERE customer_id = $1
      RETURNING *
    `;

    const updateResult = await pgClient.query<Customer>(updateQuery, [
      id,
      body.name,
      body.commercial_name,
      body.nif_cif,
      body.address,
      body.postal_code,
      body.city,
      body.province,
      body.phone,
      body.email,
      body.website,
      body.customer_type,
      body.status,
      body.payment_terms,
      body.notes
    ]);

    if (updateResult.error || !updateResult.data || updateResult.data.length === 0) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    const updatedCustomer = updateResult.data[0];

    console.log(`✅ [Customer Update] Cliente actualizado: ${updatedCustomer.name}`);

    return NextResponse.json({
      success: true,
      data: updatedCustomer,
      message: 'Cliente actualizado exitosamente'
    });

  } catch (error: any) {
    console.error('[Customer Update] Error:', error);
    
    // Manejar error de duplicado NIF/CIF
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'El NIF/CIF ya está registrado para otro cliente' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar cliente (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    console.log(`🗑️ [Customer Delete] Eliminando cliente: ${id}`);
    
    // Verificar que el ID sea válido
    if (!id || id === 'undefined') {
      console.log(`❌ [Customer Delete] ID inválido: ${id}`);
      return NextResponse.json(
        { error: 'ID de cliente inválido' },
        { status: 400 }
      );
    }

    // Verificar si hay documentos relacionados usando dbAdapter
    const documentsResult = await dbAdapter.query(
      'SELECT job_id FROM documents WHERE customer_id = $1 LIMIT 1',
      [id]
    );
    const relatedDocuments = documentsResult.rows || [];

    // Si hay documentos relacionados, hacer soft delete
    if (relatedDocuments && relatedDocuments.length > 0) {
      const softDeleteResult = await dbAdapter.query(
        `UPDATE customers SET
          status = 'inactive',
          updated_at = CURRENT_TIMESTAMP
        WHERE customer_id = $1
        RETURNING *`,
        [id]
      );

      if (!softDeleteResult.rows || softDeleteResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Cliente no encontrado' },
          { status: 404 }
        );
      }

      console.log(`✅ [Customer Delete] Cliente desactivado (tiene documentos relacionados)`);

      return NextResponse.json({
        success: true,
        message: 'Cliente desactivado exitosamente (tenía documentos relacionados)',
        type: 'soft_delete'
      });
    }

    // Si no hay documentos relacionados, eliminar completamente
    const deleteResult = await dbAdapter.query(
      'DELETE FROM customers WHERE customer_id = $1 RETURNING *',
      [id]
    );

    if (!deleteResult.rows || deleteResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    console.log(`✅ [Customer Delete] Cliente eliminado completamente`);

    return NextResponse.json({
      success: true,
      message: 'Cliente eliminado exitosamente',
      type: 'hard_delete'
    });

  } catch (error) {
    console.error('[Customer Delete] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 