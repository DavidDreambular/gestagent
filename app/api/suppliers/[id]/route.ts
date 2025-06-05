// API Route para gestión individual de proveedores
// /app/api/suppliers/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Obtener proveedor específico con estadísticas y documentos relacionados
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    console.log(`🔍 [Supplier Detail] Obteniendo proveedor: ${id}`);

    // Obtener datos del proveedor
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('*')
      .eq('supplier_id', id)
      .single();

    if (supplierError) {
      console.error(`❌ [Supplier Detail] Error obteniendo proveedor:`, supplierError);
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
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
      .eq('supplier_id', id)
      .order('upload_timestamp', { ascending: false })
      .limit(50);

    if (documentsError) {
      console.warn(`⚠️ [Supplier Detail] Error obteniendo documentos:`, documentsError);
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
      supplier: {
        ...supplier,
        formatted_address: `${supplier.address || ''}, ${supplier.postal_code || ''} ${supplier.city || ''}, ${supplier.province || ''}`.trim().replace(/^,\s*/, ''),
        contact_info: {
          phone: supplier.phone,
          email: supplier.email,
          website: supplier.website
        }
      },
      documents: documents || [],
      statistics: {
        total_documents: documents?.length || 0,
        completed_documents: completedDocuments,
        recent_documents: recentDocuments,
        documents_last_90_days: documentsLast90Days,
        total_amount: supplier.total_amount || 0,
        total_amount_last_90_days: totalAmountLast90Days,
        average_document_amount: documents && documents.length > 0 
          ? (supplier.total_amount || 0) / documents.length 
          : 0,
        last_activity: supplier.last_invoice_date,
        activity_status: supplier.activity_status,
        volume_category: supplier.volume_category
      }
    };

    console.log(`✅ [Supplier Detail] Proveedor obtenido: ${supplier.name} (${documents?.length || 0} documentos)`);

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('[Supplier Detail] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT: Actualizar proveedor
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    console.log(`📝 [Supplier Update] Actualizando proveedor: ${id}`);

    // Validar campos requeridos
    if (!body.name || !body.nif_cif) {
      return NextResponse.json(
        { error: 'Nombre y NIF/CIF son campos obligatorios' },
        { status: 400 }
      );
    }

    // Actualizar proveedor
    const { data: updatedSupplier, error: updateError } = await supabase
      .from('suppliers')
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
        business_sector: body.business_sector,
        company_size: body.company_size,
        status: body.status,
        payment_terms: body.payment_terms,
        notes: body.notes,
        updated_at: new Date().toISOString()
      })
      .eq('supplier_id', id)
      .select()
      .single();

    if (updateError) {
      console.error(`❌ [Supplier Update] Error:`, updateError);
      
      if (updateError.code === '23505') {
        return NextResponse.json(
          { error: 'El NIF/CIF ya está registrado para otro proveedor' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Error al actualizar el proveedor' },
        { status: 500 }
      );
    }

    console.log(`✅ [Supplier Update] Proveedor actualizado: ${updatedSupplier.name}`);

    return NextResponse.json({
      success: true,
      data: updatedSupplier,
      message: 'Proveedor actualizado exitosamente'
    });

  } catch (error) {
    console.error('[Supplier Update] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar proveedor (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    console.log(`🗑️ [Supplier Delete] Eliminando proveedor: ${id}`);

    // Verificar si hay documentos relacionados
    const { data: relatedDocuments, error: documentsError } = await supabase
      .from('documents')
      .select('job_id')
      .eq('supplier_id', id)
      .limit(1);

    if (documentsError) {
      console.error(`❌ [Supplier Delete] Error verificando documentos:`, documentsError);
      return NextResponse.json(
        { error: 'Error al verificar documentos relacionados' },
        { status: 500 }
      );
    }

    // Si hay documentos relacionados, hacer soft delete
    if (relatedDocuments && relatedDocuments.length > 0) {
      const { error: softDeleteError } = await supabase
        .from('suppliers')
        .update({ 
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('supplier_id', id);

      if (softDeleteError) {
        console.error(`❌ [Supplier Delete] Error en soft delete:`, softDeleteError);
        return NextResponse.json(
          { error: 'Error al desactivar el proveedor' },
          { status: 500 }
        );
      }

      console.log(`✅ [Supplier Delete] Proveedor desactivado (tiene documentos relacionados)`);

      return NextResponse.json({
        success: true,
        message: 'Proveedor desactivado exitosamente (tenía documentos relacionados)',
        type: 'soft_delete'
      });
    }

    // Si no hay documentos relacionados, eliminar completamente
    const { error: deleteError } = await supabase
      .from('suppliers')
      .delete()
      .eq('supplier_id', id);

    if (deleteError) {
      console.error(`❌ [Supplier Delete] Error en eliminación:`, deleteError);
      return NextResponse.json(
        { error: 'Error al eliminar el proveedor' },
        { status: 500 }
      );
    }

    console.log(`✅ [Supplier Delete] Proveedor eliminado completamente`);

    return NextResponse.json({
      success: true,
      message: 'Proveedor eliminado exitosamente',
      type: 'hard_delete'
    });

  } catch (error) {
    console.error('[Supplier Delete] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 