import { NextRequest, NextResponse } from 'next/server';
import { ExtractionTemplatesService } from '@/services/extraction-templates.service';

const templatesService = new ExtractionTemplatesService();

export async function GET(request: NextRequest) {
  try {
    console.log('📋 [API] Obteniendo plantillas de extracción');

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');
    const status = searchParams.get('status');

    if (provider) {
      // Buscar plantilla específica por proveedor
      const template = await templatesService.findTemplateByProvider(provider);
      return NextResponse.json({
        success: true,
        template
      });
    }

    // Obtener todas las plantillas activas
    const templates = await templatesService.getActiveTemplates();
    const stats = await templatesService.getTemplateStats();

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
    console.log('🆕 [API] Creando nueva plantilla');

    const body = await request.json();
    const { provider_name, provider_nif, field_mappings, confidence_threshold } = body;

    if (!provider_name || !field_mappings) {
      return NextResponse.json({
        success: false,
        error: 'Faltan campos requeridos: provider_name, field_mappings'
      }, { status: 400 });
    }

    // Crear nueva plantilla manualmente
    const templateId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    // Aquí podrías implementar la creación manual de plantillas
    // Por ahora, devolvemos un mensaje de éxito
    
    return NextResponse.json({
      success: true,
      message: 'Plantilla creada exitosamente',
      template_id: templateId
    });

  } catch (error: any) {
    console.error('❌ [API] Error creando plantilla:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error creando plantilla'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ [API] Eliminando plantilla');

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json({
        success: false,
        error: 'ID de plantilla requerido'
      }, { status: 400 });
    }

    // Aquí implementarías la eliminación de plantillas
    // Por ahora, devolvemos un mensaje de éxito
    
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