import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { memoryDB } from '@/lib/memory-db';

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

    // Solo administradores pueden ver logs de auditoría
    if (session.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acceso denegado. Solo administradores pueden acceder a los logs de auditoría.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Extraer parámetros de filtrado
    const userId = searchParams.get('userId') || undefined;
    const action = searchParams.get('action') || undefined;
    const entityType = searchParams.get('entityType') || undefined;
    const entityId = searchParams.get('entityId') || undefined;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const offset = (page - 1) * limit;

    console.log('🔍 [API Audit] Obteniendo logs de auditoría con filtros:', {
      userId,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
      page,
      limit
    });

    // Obtener logs con filtros
    const filters: any = {};
    if (entityType) filters.entity_type = entityType;
    if (entityId) filters.entity_id = entityId;

    let allLogs = await memoryDB.getAuditLogs(filters);

    // Aplicar filtros adicionales
    if (userId) {
      allLogs = allLogs.filter(log => log.user_id === userId);
    }
    if (action) {
      allLogs = allLogs.filter(log => log.action === action);
    }
    if (startDate) {
      allLogs = allLogs.filter(log => new Date(log.timestamp) >= startDate);
    }
    if (endDate) {
      allLogs = allLogs.filter(log => new Date(log.timestamp) <= endDate);
    }

    // Calcular paginación
    const total = allLogs.length;
    const paginatedLogs = allLogs.slice(offset, offset + limit);

    // Formatear logs para la respuesta
    const formattedLogs = paginatedLogs.map(log => ({
      id: log.log_id,
      user_id: log.user_id,
      action: log.action,
      resource_type: log.entity_type,
      resource_id: log.entity_id,
      details: log.changes,
      timestamp: log.timestamp,
      notes: log.notes
    }));

    // Registrar acceso a logs de auditoría
    await memoryDB.createAuditLog({
      entity_type: 'system',
      entity_id: 'audit_logs',
      action: 'read',
      user_id: session.user?.id || 'unknown',
      changes: {
        filters: {
          userId,
          action,
          entityType,
          entityId,
          startDate,
          endDate
        },
        pagination: { page, limit }
      },
      notes: 'Acceso a logs de auditoría'
    });

    console.log(`✅ [API Audit] Retornando ${formattedLogs.length} logs de ${total} totales`);

    return NextResponse.json({
      success: true,
      logs: formattedLogs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error: any) {
    console.error('❌ [API Audit] Error obteniendo logs:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// Endpoint para obtener estadísticas de auditoría
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

    // Solo administradores pueden ver estadísticas
    if (session.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      );
    }

    console.log('📊 [API Audit] Obteniendo estadísticas de auditoría');
    
    const body = await request.json();
    const { period = 'last_30_days' } = body;

    // Obtener todos los logs
    const allLogs = await memoryDB.getAuditLogs();

    // Calcular fecha límite según el período
    const now = new Date();
    const periodStart = new Date();
    
    switch (period) {
      case 'last_7_days':
        periodStart.setDate(now.getDate() - 7);
        break;
      case 'last_30_days':
        periodStart.setDate(now.getDate() - 30);
        break;
      case 'last_90_days':
        periodStart.setDate(now.getDate() - 90);
        break;
      default:
        periodStart.setFullYear(now.getFullYear() - 1);
    }

    // Filtrar logs por período
    const periodLogs = allLogs.filter(log => new Date(log.timestamp) >= periodStart);

    // Calcular estadísticas
    const actionBreakdown: Record<string, number> = {};
    const userActivity: Record<string, number> = {};
    const entityBreakdown: Record<string, number> = {};

    periodLogs.forEach(log => {
      // Contar por acción
      actionBreakdown[log.action] = (actionBreakdown[log.action] || 0) + 1;
      
      // Contar por usuario
      if (log.user_id) {
        userActivity[log.user_id] = (userActivity[log.user_id] || 0) + 1;
      }
      
      // Contar por tipo de entidad
      entityBreakdown[log.entity_type] = (entityBreakdown[log.entity_type] || 0) + 1;
    });

    // Encontrar la acción más común
    const mostCommonAction = Object.entries(actionBreakdown)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'none';

    const stats = {
      total_actions: periodLogs.length,
      unique_users: Object.keys(userActivity).length,
      actions_last_7_days: allLogs.filter(log => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return new Date(log.timestamp) >= sevenDaysAgo;
      }).length,
      action_breakdown: actionBreakdown,
      entity_breakdown: entityBreakdown,
      most_common_action: mostCommonAction,
      stats_period: period,
      user_activity: userActivity
    };

    console.log('✅ [API Audit] Estadísticas calculadas exitosamente');

    return NextResponse.json({
      success: true,
      data: stats,
      source: 'memory_db'
    });

  } catch (error: any) {
    console.error('❌ [API Audit] Error obteniendo estadísticas:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error interno del servidor'
    }, { status: 500 });
  }
}