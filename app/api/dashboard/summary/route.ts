// API Route para obtener resumen del dashboard
// /app/api/dashboard/summary/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { sqliteClient } from '@/lib/sqlite-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [DASHBOARD API] Obteniendo resumen del dashboard');

    // Obtener estadísticas básicas
    const totalDocsResult = sqliteClient.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM documents'
    );

    const completedDocsResult = sqliteClient.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM documents WHERE status = ?',
      ['completed']
    );

    const processingDocsResult = sqliteClient.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM documents WHERE status = ?',
      ['processing']
    );

    const errorDocsResult = sqliteClient.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM documents WHERE status = ?',
      ['error']
    );

    // Documentos recientes (últimos 7 días)
    const recentDocsResult = sqliteClient.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM documents 
       WHERE upload_timestamp >= datetime('now', '-7 days')`
    );

    // Documentos este mes
    const thisMonthResult = sqliteClient.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM documents 
       WHERE upload_timestamp >= datetime('now', 'start of month')`
    );

    // Documentos mes pasado
    const lastMonthResult = sqliteClient.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM documents 
       WHERE upload_timestamp >= datetime('now', 'start of month', '-1 month')
       AND upload_timestamp < datetime('now', 'start of month')`
    );

    // Calcular estadísticas
    const totalDocuments = totalDocsResult.data?.[0]?.count || 0;
    const completedDocuments = completedDocsResult.data?.[0]?.count || 0;
    const processingDocuments = processingDocsResult.data?.[0]?.count || 0;
    const errorDocuments = errorDocsResult.data?.[0]?.count || 0;
    const recentDocuments = recentDocsResult.data?.[0]?.count || 0;
    const documentsThisMonth = thisMonthResult.data?.[0]?.count || 0;
    const documentsLastMonth = lastMonthResult.data?.[0]?.count || 0;

    // Calcular tasa de éxito
    const successRate = totalDocuments > 0 
      ? Math.round((completedDocuments / totalDocuments) * 100 * 100) / 100
      : 0;

    // Calcular tasa de crecimiento
    const growthRate = documentsLastMonth > 0
      ? Math.round(((documentsThisMonth - documentsLastMonth) / documentsLastMonth) * 100 * 100) / 100
      : 0;

    const summary = {
      totalDocuments,
      completedDocuments,
      processingDocuments,
      errorDocuments,
      recentDocuments,
      successRate,
      avgProcessingTime: 2.4, // Mock value
      documentsThisMonth,
      documentsLastMonth,
      growthRate,
      // Datos adicionales
      statusBreakdown: {
        completed: completedDocuments,
        processing: processingDocuments,
        error: errorDocuments,
        pending: Math.max(0, totalDocuments - completedDocuments - processingDocuments - errorDocuments)
      },
      // Actividad reciente mock
      recentActivity: [
        {
          id: '1',
          type: 'document_processed',
          title: 'Documento procesado',
          description: 'Factura procesada exitosamente',
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          user: 'admin'
        },
        {
          id: '2',
          type: 'document_uploaded',
          title: 'Documento subido',
          description: 'Nueva nómina subida al sistema',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          user: 'operador'
        }
      ]
    };

    console.log('✅ [DASHBOARD API] Resumen generado:', {
      total: totalDocuments,
      completed: completedDocuments,
      successRate: `${successRate}%`
    });

    return NextResponse.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [DASHBOARD API] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
