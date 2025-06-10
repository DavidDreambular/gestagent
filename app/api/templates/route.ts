import { NextRequest, NextResponse } from 'next/server';
import { memoryDB } from '@/lib/memory-db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    console.log('📋 [API] Obteniendo plantillas de extracción');

    const { searchParams } = new URL(request.url);
    const documentType = searchParams.get('documentType') || searchParams.get('document_type');
    const supplierId = searchParams.get('supplierId') || searchParams.get('supplier_id');
    const isActive = searchParams.get('active');

    // Construir filtros
    const filters: any = {};
    if (documentType) filters.document_type = documentType;
    if (supplierId) filters.supplier_id = supplierId;
    if (isActive !== null) filters.is_active = isActive === 'true';

    // Obtener plantillas
    const templates = await memoryDB.getAllExtractionTemplates(filters);

    // Calcular estadísticas
    const stats = {
      total: templates.length,
      active: templates.filter(t => t.is_active).length,
      by_type: templates.reduce((acc, t) => {
        acc[t.document_type] = (acc[t.document_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      average_success_rate: templates.length > 0
        ? (templates.reduce((sum, t) => sum + t.success_rate, 0) / templates.length).toFixed(1)
        : 0,
      most_used: templates.sort((a, b) => b.usage_count - a.usage_count)[0]
    };

    return NextResponse.json({
      success: true,
      templates,
      stats,
      total: templates.length
    });

  } catch (error: any) {
    console.error('❌ [API] Error obteniendo plantillas:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error obteniendo plantillas'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    console.log('🆕 [API] Creando nueva plantilla');

    const body = await request.json();
    const { 
      name,
      description,
      document_type,
      supplier_id,
      customer_id,
      extraction_rules,
      confidence_threshold
    } = body;

    if (!name || !document_type || !extraction_rules) {
      return NextResponse.json({
        success: false,
        error: 'Faltan campos requeridos: name, document_type, extraction_rules'
      }, { status: 400 });
    }

    // Crear nueva plantilla
    const newTemplate = await memoryDB.createExtractionTemplate({
      name,
      description,
      document_type,
      supplier_id,
      customer_id,
      extraction_rules,
      confidence_threshold: confidence_threshold || 0.8,
      created_by: session.user?.id || 'unknown'
    });

    // Registrar en auditoría
    await memoryDB.createAuditLog({
      entity_type: 'template',
      entity_id: newTemplate.template_id,
      action: 'created',
      user_id: session.user?.id || 'unknown',
      changes: newTemplate,
      notes: 'Plantilla de extracción creada'
    });

    console.log(`✅ [API] Plantilla creada: ${newTemplate.template_id}`);
    
    return NextResponse.json({
      success: true,
      message: 'Plantilla creada exitosamente',
      template: newTemplate
    });

  } catch (error: any) {
    console.error('❌ [API] Error creando plantilla:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error creando plantilla'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    console.log('✏️ [API] Actualizando plantilla');

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json({
        success: false,
        error: 'ID de plantilla requerido'
      }, { status: 400 });
    }

    const body = await request.json();

    // Obtener plantilla existente
    const existingTemplate = await memoryDB.getExtractionTemplateById(templateId);
    if (!existingTemplate) {
      return NextResponse.json({
        success: false,
        error: 'Plantilla no encontrada'
      }, { status: 404 });
    }

    // Actualizar plantilla
    const updatedTemplate = await memoryDB.updateExtractionTemplate(templateId, body);

    if (!updatedTemplate) {
      return NextResponse.json({
        success: false,
        error: 'Error al actualizar plantilla'
      }, { status: 500 });
    }

    // Registrar en auditoría
    await memoryDB.createAuditLog({
      entity_type: 'template',
      entity_id: templateId,
      action: 'updated',
      user_id: session.user?.id || 'unknown',
      changes: {
        before: existingTemplate,
        after: updatedTemplate
      },
      notes: 'Plantilla de extracción actualizada'
    });

    return NextResponse.json({
      success: true,
      message: 'Plantilla actualizada exitosamente',
      template: updatedTemplate
    });

  } catch (error: any) {
    console.error('❌ [API] Error actualizando plantilla:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error actualizando plantilla'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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

    console.log('🗑️ [API] Eliminando plantilla');

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json({
        success: false,
        error: 'ID de plantilla requerido'
      }, { status: 400 });
    }

    // Obtener plantilla antes de eliminar
    const template = await memoryDB.getExtractionTemplateById(templateId);
    if (!template) {
      return NextResponse.json({
        success: false,
        error: 'Plantilla no encontrada'
      }, { status: 404 });
    }

    // Eliminar plantilla
    const deleted = await memoryDB.deleteExtractionTemplate(templateId);

    if (deleted) {
      // Registrar en auditoría
      await memoryDB.createAuditLog({
        entity_type: 'template',
        entity_id: templateId,
        action: 'deleted',
        user_id: session.user?.id || 'unknown',
        changes: template,
        notes: 'Plantilla de extracción eliminada'
      });

      console.log(`✅ [API] Plantilla eliminada: ${templateId}`);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Plantilla eliminada exitosamente'
    });

  } catch (error: any) {
    console.error('❌ [API] Error eliminando plantilla:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error eliminando plantilla'
    }, { status: 500 });
  }
}