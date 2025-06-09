import { NextRequest, NextResponse } from 'next/server';
import { extractionTemplatesService } from '@/services/extraction-templates.service';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [API] Obteniendo métricas individuales de plantillas');
    
    // Obtener todas las plantillas activas
    const templates = await extractionTemplatesService.getActiveTemplates();
    
    if (!templates || templates.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No hay plantillas activas'
      });
    }

    // Enriquecer con métricas calculadas
    const templateMetrics = templates.map(template => {
      const successRate = template.usage_count > 0 ? 
        template.success_rate : 0;

      return {
        id: template.id,
        provider_name: template.provider_name,
        provider_nif: template.provider_nif,
        confidence_threshold: template.confidence_threshold,
        usage_count: template.usage_count,
        success_rate: successRate,
        status: template.status,
        field_mappings_count: template.field_mappings ? 
          Object.keys(template.field_mappings).length : 0,
        patterns_count: template.field_mappings ? 
          (template.field_mappings.invoice_number_patterns?.length || 0) +
          (template.field_mappings.date_patterns?.length || 0) +
          (template.field_mappings.total_amount_patterns?.length || 0) +
          (template.field_mappings.tax_patterns?.length || 0) : 0,
        created_at: template.created_at,
        updated_at: template.updated_at,
        last_used: template.updated_at,
        performance_category: successRate >= 0.8 ? 'excellent' : 
                             successRate >= 0.6 ? 'good' : 
                             successRate >= 0.4 ? 'average' : 'poor',
        efficiency_score: Math.round((successRate * 100 + 
          Math.min(template.usage_count / 10, 10)) / 2)
      };
    });

    // Ordenar por tasa de éxito y uso
    templateMetrics.sort((a, b) => {
      if (a.success_rate !== b.success_rate) {
        return b.success_rate - a.success_rate;
      }
      return b.usage_count - a.usage_count;
    });

    return NextResponse.json({
      success: true,
      data: templateMetrics,
      summary: {
        total_templates: templates.length,
        avg_success_rate: templateMetrics.reduce((sum, t) => sum + t.success_rate, 0) / templates.length,
        total_usage: templateMetrics.reduce((sum, t) => sum + t.usage_count, 0),
        high_performers: templateMetrics.filter(t => t.success_rate >= 0.8).length,
        low_performers: templateMetrics.filter(t => t.success_rate < 0.4).length
      }
    });

  } catch (error) {
    console.error('❌ [API] Error obteniendo métricas individuales:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 