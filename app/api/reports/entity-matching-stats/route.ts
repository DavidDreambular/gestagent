// API Route para estadísticas de Entity Matching System
// /app/api/reports/entity-matching-stats/route.ts

import { NextRequest, NextResponse } from 'next/server';
import pgClient from '@/lib/postgresql-client';
import { invoiceEntityLinkerService } from '@/services/invoice-entity-linker.service';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [API] Obteniendo estadísticas de Entity Matching...');

    // Obtener estadísticas básicas del linker service
    const linkingStats = await invoiceEntityLinkerService.getLinkingStatistics();

    // Obtener estadísticas de calidad desde la función PostgreSQL
    let qualityStats: any = {};
    try {
      const { data: qualityData } = await pgClient.query('SELECT * FROM get_matching_quality_stats()');
      qualityData?.forEach((row: any) => {
        qualityStats[row.metric_name] = {
          value: row.metric_value,
          description: row.description
        };
      });
    } catch (qualityError) {
      console.warn('⚠️ [API] Error obteniendo estadísticas de calidad:', qualityError);
    }

    // Obtener estadísticas de matching por método
    let matchingMethodStats: any[] = [];
    try {
      const { data: methodData } = await pgClient.query(`
        SELECT 
          entity_type,
          match_method,
          COUNT(*) as total_matches,
          AVG(confidence) as avg_confidence,
          COUNT(CASE WHEN created_new THEN 1 END) as new_entities_created
        FROM entity_matching_logs
        WHERE match_method != 'none'
        GROUP BY entity_type, match_method
        ORDER BY entity_type, total_matches DESC
      `);
      matchingMethodStats = methodData || [];
    } catch (methodError) {
      console.warn('⚠️ [API] Error obteniendo estadísticas por método:', methodError);
    }

    // Obtener documentos con información de confianza
    let confidenceDistribution: any[] = [];
    try {
      const { data: confData } = await pgClient.query(`
        SELECT 
          CASE 
            WHEN supplier_match_confidence >= 95 OR customer_match_confidence >= 95 THEN 'Alto (95-100%)'
            WHEN supplier_match_confidence >= 80 OR customer_match_confidence >= 80 THEN 'Medio (80-94%)'
            WHEN supplier_match_confidence > 0 OR customer_match_confidence > 0 THEN 'Bajo (1-79%)'
            ELSE 'Sin matching'
          END as confidence_level,
          COUNT(*) as document_count
        FROM documents 
        WHERE status = 'completed'
        GROUP BY 
          CASE 
            WHEN supplier_match_confidence >= 95 OR customer_match_confidence >= 95 THEN 'Alto (95-100%)'
            WHEN supplier_match_confidence >= 80 OR customer_match_confidence >= 80 THEN 'Medio (80-94%)'
            WHEN supplier_match_confidence > 0 OR customer_match_confidence > 0 THEN 'Bajo (1-79%)'
            ELSE 'Sin matching'
          END
        ORDER BY 
          CASE 
            WHEN CASE 
              WHEN supplier_match_confidence >= 95 OR customer_match_confidence >= 95 THEN 'Alto (95-100%)'
              WHEN supplier_match_confidence >= 80 OR customer_match_confidence >= 80 THEN 'Medio (80-94%)'
              WHEN supplier_match_confidence > 0 OR customer_match_confidence > 0 THEN 'Bajo (1-79%)'
              ELSE 'Sin matching'
            END = 'Alto (95-100%)' THEN 1
            WHEN CASE 
              WHEN supplier_match_confidence >= 95 OR customer_match_confidence >= 95 THEN 'Alto (95-100%)'
              WHEN supplier_match_confidence >= 80 OR customer_match_confidence >= 80 THEN 'Medio (80-94%)'
              WHEN supplier_match_confidence > 0 OR customer_match_confidence > 0 THEN 'Bajo (1-79%)'
              ELSE 'Sin matching'
            END = 'Medio (80-94%)' THEN 2
            WHEN CASE 
              WHEN supplier_match_confidence >= 95 OR customer_match_confidence >= 95 THEN 'Alto (95-100%)'
              WHEN supplier_match_confidence >= 80 OR customer_match_confidence >= 80 THEN 'Medio (80-94%)'
              WHEN supplier_match_confidence > 0 OR customer_match_confidence > 0 THEN 'Bajo (1-79%)'
              ELSE 'Sin matching'
            END = 'Bajo (1-79%)' THEN 3
            ELSE 4
          END
      `);
      confidenceDistribution = confData || [];
    } catch (confError) {
      console.warn('⚠️ [API] Error obteniendo distribución de confianza:', confError);
    }

    // Obtener entidades auto-creadas recientes
    let recentAutoCreated: any[] = [];
    try {
      const { data: autoData } = await pgClient.query(`
        SELECT 
          s.name as entity_name,
          s.nif_cif,
          'supplier' as entity_type,
          s.created_at,
          s.total_invoices,
          s.total_amount
        FROM suppliers s
        WHERE s.notes LIKE '%automáticamente%'
        
        UNION ALL
        
        SELECT 
          c.name as entity_name,
          c.nif_cif,
          'customer' as entity_type,
          c.created_at,
          c.total_invoices,
          c.total_amount
        FROM customers c
        WHERE c.notes LIKE '%automáticamente%'
        
        ORDER BY created_at DESC
        LIMIT 10
      `);
      recentAutoCreated = autoData || [];
    } catch (autoError) {
      console.warn('⚠️ [API] Error obteniendo entidades auto-creadas:', autoError);
    }

    // Calcular porcentajes de mejora
    const improvementMetrics = {
      automation_rate: qualityStats.linking_rate?.value || 0,
      accuracy_improvement: Math.min(
        (qualityStats.avg_supplier_confidence?.value || 0) + 
        (qualityStats.avg_customer_confidence?.value || 0),
        100
      ),
      manual_work_reduction: Math.max(0, (qualityStats.linking_rate?.value || 0) - 20), // Estimación
      processing_efficiency: linkingStats.matching_accuracy || 0
    };

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      
      // Estadísticas básicas de linking
      linking_statistics: linkingStats,
      
      // Estadísticas de calidad desde PostgreSQL
      quality_metrics: qualityStats,
      
      // Distribución por método de matching
      matching_methods: matchingMethodStats,
      
      // Distribución de confianza
      confidence_distribution: confidenceDistribution,
      
      // Entidades auto-creadas recientemente
      recent_auto_created: recentAutoCreated,
      
      // Métricas de mejora del sistema
      improvement_metrics: improvementMetrics,
      
      // Resumen ejecutivo
      executive_summary: {
        total_documents_processed: linkingStats.total_documents,
        automation_success_rate: `${(qualityStats.linking_rate?.value || 0).toFixed(1)}%`,
        entities_auto_created: linkingStats.auto_created_suppliers + linkingStats.auto_created_customers,
        average_confidence: `${((qualityStats.avg_supplier_confidence?.value || 0) + (qualityStats.avg_customer_confidence?.value || 0) / 2).toFixed(1)}%`,
        manual_review_needed: linkingStats.unlinked_documents,
        system_efficiency: improvementMetrics.processing_efficiency >= 80 ? 'Excelente' : 
                          improvementMetrics.processing_efficiency >= 60 ? 'Buena' : 'Mejorable'
      }
    };

    console.log('✅ [API] Estadísticas de Entity Matching obtenidas exitosamente');
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [API] Error obteniendo estadísticas de Entity Matching:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}