import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AuditService, { AuditAction, AuditEntityType } from '@/services/audit.service';

export const dynamic = 'force-dynamic';

// Datos mock para desarrollo
const mockAuditLogs = [
  {
    id: 1,
    user_id: 'demo-user',
    action: 'DOCUMENT_UPLOAD',
    resource_type: 'document',
    resource_id: 'doc-001',
    details: { filename: 'factura_ejemplo.pdf', size: 125340 },
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 Chrome/91.0',
    timestamp: '2025-06-06T10:30:00.000Z'
  },
  {
    id: 2,
    user_id: 'demo-user',
    action: 'DOCUMENT_PROCESSING',
    resource_type: 'document',
    resource_id: 'doc-001',
    details: { status: 'completed', processing_time: 1250, ocr_service: 'mistral' },
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 Chrome/91.0',
    timestamp: '2025-06-06T10:31:00.000Z'
  },
  {
    id: 3,
    user_id: 'demo-user',
    action: 'DATA_EXPORT',
    resource_type: 'export',
    details: { export_type: 'CSV', document_count: 5, format: 'csv' },
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 Chrome/91.0',
    timestamp: '2025-06-06T09:15:00.000Z'
  }
];

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
    const action = searchParams.get('action') as AuditAction || undefined;
    const entityType = searchParams.get('entityType') as AuditEntityType || undefined;
    const entityId = searchParams.get('entityId') || undefined;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const offset = (page - 1) * limit;

    // Obtener logs con filtros
    const logs = await AuditService.getLogs({
      userId,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
      limit,
      offset
    });

    // Obtener count total para paginación
    const totalLogs = await AuditService.getLogs({
      userId,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
      limit: 999999, // Para contar todos
      offset: 0
    });

    // Registrar acceso a logs de auditoría
    await AuditService.logFromRequest(request, {
      userId: session.user?.id || 'unknown',
      action: AuditAction.READ,
      entityType: AuditEntityType.SYSTEM,
      entityId: 'audit_logs',
      metadata: {
        filters: {
          userId,
          action,
          entityType,
          entityId,
          startDate,
          endDate
        },
        pagination: { page, limit },
        source: 'audit_viewer'
      }
    });

    return NextResponse.json({
      success: true,
      logs,
      total: totalLogs.length,
      page,
      limit,
      totalPages: Math.ceil(totalLogs.length / limit)
    });

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Endpoint para obtener estadísticas de auditoría
export async function POST(request: NextRequest) {
  try {
    console.log('📊 [API Audit] Obteniendo estadísticas de auditoría (modo desarrollo)');
    
    const mockStats = {
      total_actions: mockAuditLogs.length,
      unique_users: 1,
      actions_last_7_days: 3,
      action_breakdown: {
        'DOCUMENT_UPLOAD': 1,
        'DOCUMENT_PROCESSING': 1,
        'DATA_EXPORT': 1
      },
      most_common_action: 'DOCUMENT_UPLOAD',
      stats_period: 'last_30_days'
    };

    console.log('✅ [API Audit] Estadísticas calculadas exitosamente');

    return NextResponse.json({
      success: true,
      data: mockStats,
      source: 'mock_data',
      message: 'Datos de desarrollo (Supabase no configurado)'
    });

  } catch (error) {
    console.error('❌ [API Audit] Error obteniendo estadísticas:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    }, { status: 500 });
  }
} 