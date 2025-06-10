import { NextRequest, NextResponse } from 'next/server';
import { memoryDB } from '@/lib/memory-db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: Obtener plantilla específica
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de plantilla no proporcionado' },
        { status: 400 }
      );
    }

    console.log(`📋 [API] Obteniendo plantilla: ${id}`);

    // Obtener plantilla
    const template = await memoryDB.getExtractionTemplateById(id);

    if (!template) {
      return NextResponse.json(
        { error: 'Plantilla no encontrada' },
        { status: 404 }
      );
    }

    // Obtener estadísticas de uso
    const usage_stats = {
      total_uses: template.usage_count,
      success_rate: template.success_rate,
      last_used: template.last_used_at,
      performance: template.success_rate >= 90 ? 'excellent' : 
                   template.success_rate >= 75 ? 'good' :
                   template.success_rate >= 50 ? 'moderate' : 'needs_improvement'
    };

    return NextResponse.json({
      success: true,
      template,
      usage_stats
    });

  } catch (error: any) {
    console.error('❌ [API] Error obteniendo plantilla:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener plantilla',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// PUT: Actualizar plantilla específica
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'ID de plantilla no proporcionado' },
        { status: 400 }
      );
    }

    console.log(`✏️ [API] Actualizando plantilla: ${id}`);

    // Obtener plantilla existente
    const existingTemplate = await memoryDB.getExtractionTemplateById(id);
    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Plantilla no encontrada' },
        { status: 404 }
      );
    }

    // Actualizar plantilla
    const updatedTemplate = await memoryDB.updateExtractionTemplate(id, body);

    if (!updatedTemplate) {
      return NextResponse.json(
        { error: 'Error al actualizar plantilla' },
        { status: 500 }
      );
    }

    // Registrar en auditoría
    await memoryDB.createAuditLog({
      entity_type: 'template',
      entity_id: id,
      action: 'updated',
      user_id: session.user?.id || 'unknown',
      changes: {
        before: existingTemplate,
        after: updatedTemplate
      },
      notes: 'Plantilla actualizada vía API'
    });

    console.log(`✅ [API] Plantilla ${id} actualizada exitosamente`);

    return NextResponse.json({
      success: true,
      message: 'Plantilla actualizada correctamente',
      template: updatedTemplate
    });

  } catch (error: any) {
    console.error('❌ [API] Error actualizando plantilla:', error);
    return NextResponse.json(
      { 
        error: 'Error al actualizar plantilla',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar plantilla específica
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Solo administradores pueden eliminar plantillas
    if (session.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Solo administradores pueden eliminar plantillas' },
        { status: 403 }
      );
    }

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de plantilla no proporcionado' },
        { status: 400 }
      );
    }

    console.log(`🗑️ [API] Eliminando plantilla: ${id}`);

    // Obtener plantilla antes de eliminar
    const template = await memoryDB.getExtractionTemplateById(id);
    if (!template) {
      return NextResponse.json(
        { error: 'Plantilla no encontrada' },
        { status: 404 }
      );
    }

    // Eliminar plantilla
    const deleted = await memoryDB.deleteExtractionTemplate(id);

    if (deleted) {
      // Registrar en auditoría
      await memoryDB.createAuditLog({
        entity_type: 'template',
        entity_id: id,
        action: 'deleted',
        user_id: session.user?.id || 'unknown',
        changes: template,
        notes: 'Plantilla eliminada permanentemente'
      });

      console.log(`✅ [API] Plantilla ${id} eliminada permanentemente`);
    }

    return NextResponse.json({
      success: true,
      message: 'Plantilla eliminada correctamente',
      templateId: id
    });

  } catch (error: any) {
    console.error('❌ [API] Error eliminando plantilla:', error);
    return NextResponse.json(
      { 
        error: 'Error al eliminar plantilla',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// PATCH: Registrar uso de plantilla
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { success, document_id, feedback } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de plantilla no proporcionado' },
        { status: 400 }
      );
    }

    if (success === undefined) {
      return NextResponse.json(
        { error: 'El parámetro "success" es requerido' },
        { status: 400 }
      );
    }

    console.log(`📊 [API] Registrando uso de plantilla: ${id}`);

    // Verificar que la plantilla existe
    const template = await memoryDB.getExtractionTemplateById(id);
    if (!template) {
      return NextResponse.json(
        { error: 'Plantilla no encontrada' },
        { status: 404 }
      );
    }

    // Registrar uso
    await memoryDB.recordTemplateUsage(id, success);

    // Registrar en auditoría
    await memoryDB.createAuditLog({
      entity_type: 'template',
      entity_id: id,
      action: 'used',
      user_id: session.user?.id || 'unknown',
      document_id: document_id,
      changes: {
        success,
        feedback,
        previous_success_rate: template.success_rate,
        previous_usage_count: template.usage_count
      },
      notes: `Plantilla utilizada con ${success ? 'éxito' : 'fallo'}`
    });

    // Obtener plantilla actualizada
    const updatedTemplate = await memoryDB.getExtractionTemplateById(id);

    console.log(`✅ [API] Uso registrado. Nueva tasa de éxito: ${updatedTemplate?.success_rate}%`);

    return NextResponse.json({
      success: true,
      message: 'Uso de plantilla registrado',
      template_stats: {
        usage_count: updatedTemplate?.usage_count,
        success_rate: updatedTemplate?.success_rate,
        last_used_at: updatedTemplate?.last_used_at
      }
    });

  } catch (error: any) {
    console.error('❌ [API] Error registrando uso:', error);
    return NextResponse.json(
      { 
        error: 'Error al registrar uso de plantilla',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}