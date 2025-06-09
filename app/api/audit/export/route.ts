import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AuditService, { AuditAction, AuditEntityType } from '@/services/audit.service';

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

    // Solo administradores pueden exportar logs
    if (session.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acceso denegado' },
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
    const format = searchParams.get('format') || 'csv';

    // Obtener todos los logs con filtros (sin límite para export)
    const logs = await AuditService.getLogs({
      userId,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
      limit: 10000, // Límite alto para export
      offset: 0
    });

    if (format === 'csv') {
      // Generar CSV
      const csvHeaders = [
        'ID',
        'Fecha/Hora',
        'Usuario',
        'Email',
        'Acción',
        'Tipo de Entidad',
        'ID de Entidad',
        'IP',
        'User Agent',
        'Valores Anteriores',
        'Valores Nuevos',
        'Metadata'
      ].join(',');

      const csvRows = logs.map(log => [
        log.id,
        log.created_at,
        `"${log.username}"`,
        `"${log.email}"`,
        log.action_display,
        log.entity_type_display,
        log.entity_id || '',
        log.ip_address || '',
        `"${(log.user_agent || '').replace(/"/g, '""')}"`,
        `"${log.old_values ? JSON.stringify(log.old_values).replace(/"/g, '""') : ''}"`,
        `"${log.new_values ? JSON.stringify(log.new_values).replace(/"/g, '""') : ''}"`,
        `"${log.metadata ? JSON.stringify(log.metadata).replace(/"/g, '""') : ''}"`
      ].join(','));

      const csvContent = [csvHeaders, ...csvRows].join('\n');

      // Registrar exportación
      await AuditService.logFromRequest(request, {
        userId: session.user?.id || 'unknown',
        action: AuditAction.EXPORT,
        entityType: AuditEntityType.SYSTEM,
        entityId: 'audit_logs',
        metadata: {
          format,
          recordCount: logs.length,
          filters: {
            userId,
            action,
            entityType,
            entityId,
            startDate,
            endDate
          },
          source: 'audit_export'
        }
      });

      const response = new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });

      return response;
    }

    return NextResponse.json(
      { error: 'Formato no soportado' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error exporting audit logs:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 