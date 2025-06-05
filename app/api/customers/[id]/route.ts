// API Route para gestión individual de clientes
// /app/api/customers/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configurar Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Obtener cliente específico con estadísticas y documentos relacionados
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    console.log(`🔍 [Customer Detail] Obteniendo cliente: ${id}`);

    // Obtener datos del cliente
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('customer_id', id)
      .single();

    if (customerError) {
      console.error(`❌ [Customer Detail] Error obteniendo cliente:`, customerError);
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    // Obtener documentos relacionados
    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select(`
        job_id,
        document_type,
        status,
        upload_timestamp,
        document_date,
        total_amount,
        emitter_name,
        receiver_name
      `)
      .eq('customer_id', id)
      .order('upload_timestamp', { ascending: false })
      .limit(50);

    if (documentsError) {
      console.warn(`⚠️ [Customer Detail] Error obteniendo documentos:`, documentsError);
    }

    // Calcular estadísticas adicionales
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const recentDocuments = documents?.filter(doc => 
      new Date(doc.upload_timestamp) > thirtyDaysAgo
    ).length || 0;

    const documentsLast90Days = documents?.filter(doc => 
      new Date(doc.upload_timestamp) > ninetyDaysAgo
    ).length || 0;

    const completedDocuments = documents?.filter(doc => 
      doc.status === 'completed'
    ).length || 0;

    const totalAmountLast90Days = documents
      ?.filter(doc => new Date(doc.upload_timestamp) > ninetyDaysAgo)
      ?.reduce((sum, doc) => sum + (doc.total_amount || 0), 0) || 0;

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
        total_amount: customer.total_amount || 0,
        total_amount_last_90_days: totalAmountLast90Days,
        average_document_amount: documents && documents.length > 0 
          ? (customer.total_amount || 0) / documents.length 
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
    const { data: updatedCustomer, error: updateError } = await supabase
      .from('customers')
      .update({
        name: body.name,
        commercial_name: body.commercial_name,
        nif_cif: body.nif_cif,
        address: body.address,
        postal_code: body.postal_code,
        city: body.city,
        province: body.province,
        phone: body.phone,
        email: body.email,
        website: body.website,
        customer_type: body.customer_type,
        status: body.status,
        payment_terms: body.payment_terms,
        notes: body.notes,
        updated_at: new Date().toISOString()
      })
      .eq('customer_id', id)
      .select()
      .single();

    if (updateError) {
      console.error(`❌ [Customer Update] Error:`, updateError);
      
      if (updateError.code === '23505') {
        return NextResponse.json(
          { error: 'El NIF/CIF ya está registrado para otro cliente' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Error al actualizar el cliente' },
        { status: 500 }
      );
    }

    console.log(`✅ [Customer Update] Cliente actualizado: ${updatedCustomer.name}`);

    return NextResponse.json({
      success: true,
      data: updatedCustomer,
      message: 'Cliente actualizado exitosamente'
    });

  } catch (error) {
    console.error('[Customer Update] Error:', error);
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

    // Verificar si hay documentos relacionados
    const { data: relatedDocuments, error: documentsError } = await supabase
      .from('documents')
      .select('job_id')
      .eq('customer_id', id)
      .limit(1);

    if (documentsError) {
      console.error(`❌ [Customer Delete] Error verificando documentos:`, documentsError);
      return NextResponse.json(
        { error: 'Error al verificar documentos relacionados' },
        { status: 500 }
      );
    }

    // Si hay documentos relacionados, hacer soft delete
    if (relatedDocuments && relatedDocuments.length > 0) {
      const { error: softDeleteError } = await supabase
        .from('customers')
        .update({ 
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('customer_id', id);

      if (softDeleteError) {
        console.error(`❌ [Customer Delete] Error en soft delete:`, softDeleteError);
        return NextResponse.json(
          { error: 'Error al desactivar el cliente' },
          { status: 500 }
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
    const { error: deleteError } = await supabase
      .from('customers')
      .delete()
      .eq('customer_id', id);

    if (deleteError) {
      console.error(`❌ [Customer Delete] Error en eliminación:`, deleteError);
      return NextResponse.json(
        { error: 'Error al eliminar el cliente' },
        { status: 500 }
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