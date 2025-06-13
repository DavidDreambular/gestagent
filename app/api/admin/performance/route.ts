import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '@/lib/services/performance-monitor';

/**
 * GET /api/admin/performance
 * Obtener métricas de performance del sistema
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'current';
    const hours = parseInt(searchParams.get('hours') || '1');
    const minutes = parseInt(searchParams.get('minutes') || '60');

    console.log(`📊 [Admin Performance] Obteniendo métricas: ${action}`);

    // TODO: Verificar permisos de administrador
    // const session = await getAuthSession(request);
    // if (!session || session.role !== 'admin') {
    //   return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    // }

    let result;

    switch (action) {
      case 'current':
        result = performanceMonitor.getCurrentMetrics();
        break;

      case 'history':
        result = performanceMonitor.getMetricsHistory(minutes);
        break;

      case 'alerts':
        const activeOnly = searchParams.get('active') === 'true';
        result = activeOnly 
          ? performanceMonitor.getActiveAlerts()
          : performanceMonitor.getAllAlerts(hours);
        break;

      case 'report':
        result = performanceMonitor.getPerformanceReport(hours);
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Acción no reconocida: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Admin Performance] Error obteniendo métricas:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/performance
 * Configurar umbrales de performance o ejecutar acciones
 */
export async function POST(request: NextRequest) {
  try {
    const { action, thresholds, config } = await request.json();

    console.log(`⚙️ [Admin Performance] Ejecutando acción: ${action}`);

    // TODO: Verificar permisos de administrador
    // const session = await getAuthSession(request);
    // if (!session || session.role !== 'admin') {
    //   return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    // }

    let result;

    switch (action) {
      case 'setThresholds':
        if (!thresholds) {
          return NextResponse.json(
            { success: false, error: 'Umbrales requeridos' },
            { status: 400 }
          );
        }
        
        performanceMonitor.setThresholds(thresholds);
        result = { message: 'Umbrales actualizados correctamente' };
        break;

      case 'start':
        const interval = config?.interval || 30000;
        performanceMonitor.start(interval);
        result = { message: `Monitor iniciado con intervalo de ${interval}ms` };
        break;

      case 'stop':
        performanceMonitor.stop();
        result = { message: 'Monitor detenido' };
        break;

      case 'clearAlerts':
        // Marcar todas las alertas como resueltas
        const activeAlerts = performanceMonitor.getActiveAlerts();
        activeAlerts.forEach(alert => {
          alert.resolved = true;
          alert.resolvedAt = Date.now();
        });
        result = { message: `${activeAlerts.length} alertas marcadas como resueltas` };
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Acción no reconocida: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Admin Performance] Error ejecutando acción:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}