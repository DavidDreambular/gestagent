import { NextRequest, NextResponse } from 'next/server';
import { ExtractionTemplatesService } from '@/services/extraction-templates.service';

const templatesService = new ExtractionTemplatesService();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`📋 [API] Obteniendo plantilla ${params.id}`);
    
    const template = await templatesService.getTemplateById(params.id);
    
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Plantilla no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      template
    });

  } catch (error) {
    console.error('❌ [API] Error obteniendo plantilla:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`📝 [API] Actualizando plantilla ${params.id}`);
    
    const data = await request.json();
    
    const updatedTemplate = await templatesService.updateTemplate(params.id, data);
    
    if (!updatedTemplate) {
      return NextResponse.json(
        { success: false, error: 'Plantilla no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      template: updatedTemplate,
      message: 'Plantilla actualizada correctamente'
    });

  } catch (error) {
    console.error('❌ [API] Error actualizando plantilla:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`🗑️ [API] Eliminando plantilla ${params.id}`);
    
    const deleted = await templatesService.deleteTemplate(params.id);
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Plantilla no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Plantilla eliminada correctamente'
    });

  } catch (error) {
    console.error('❌ [API] Error eliminando plantilla:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 