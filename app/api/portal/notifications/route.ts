import { NextRequest, NextResponse } from 'next/server';
import { postgresqlClient } from '@/lib/postgresql-client';
import { getToken } from 'next-auth/jwt';

/**
 * GET /api/portal/notifications
 * Obtiene las notificaciones del proveedor logueado
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const token = await getToken({ req: request });
    if (!token || token.role !== 'provider') {
      return NextResponse.json(
        { error: 'No autorizado - Solo para proveedores' },
        { status: 401 }
      );
    }

    const supplierId = token.supplier_id as string;
    if (!supplierId) {
      return NextResponse.json(
        { error: 'ID de proveedor no encontrado' },
        { status: 400 }
      );
    }

    // Parámetros de consulta
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const onlyUnread = searchParams.get('unread') === 'true';

    console.log('📢 [Portal Notifications] Obteniendo notificaciones para proveedor:', supplierId);

    // Construir query
    let query = `
      SELECT 
        id,
        document_id,
        type,
        title,
        message,
        metadata,
        created_at,
        read_at,
        CASE WHEN read_at IS NULL THEN true ELSE false END as unread
      FROM provider_notifications 
      WHERE supplier_id = $1
    `;

    const params: any[] = [supplierId];
    let paramIndex = 2;

    if (onlyUnread) {
      query += ` AND read_at IS NULL`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    // Ejecutar consulta
    const result = await postgresqlClient.query(query, params);

    if (result.error) {
      console.error('❌ [Portal Notifications] Error obteniendo notificaciones:', result.error);
      return NextResponse.json(
        { error: 'Error obteniendo notificaciones' },
        { status: 500 }
      );
    }

    // Obtener conteo de no leídas
    const unreadCountResult = await postgresqlClient.query(
      'SELECT COUNT(*) as unread_count FROM provider_notifications WHERE supplier_id = $1 AND read_at IS NULL',
      [supplierId]
    );

    const unreadCount = parseInt(unreadCountResult.data?.[0]?.unread_count || '0');

    console.log('✅ [Portal Notifications] Notificaciones obtenidas:', result.data?.length || 0);

    return NextResponse.json({
      notifications: result.data || [],
      unreadCount,
      total: result.count || 0,
      limit,
      offset
    });

  } catch (error) {
    console.error('❌ [Portal Notifications] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/portal/notifications
 * Marca notificaciones como leídas
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const token = await getToken({ req: request });
    if (!token || token.role !== 'provider') {
      return NextResponse.json(
        { error: 'No autorizado - Solo para proveedores' },
        { status: 401 }
      );
    }

    const supplierId = token.supplier_id as string;
    if (!supplierId) {
      return NextResponse.json(
        { error: 'ID de proveedor no encontrado' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { notificationIds, markAllAsRead } = body;

    console.log('📢 [Portal Notifications] Marcando como leídas:', { notificationIds, markAllAsRead });

    let query: string;
    let params: any[];

    if (markAllAsRead) {
      // Marcar todas las notificaciones del proveedor como leídas
      query = `
        UPDATE provider_notifications 
        SET read_at = NOW() 
        WHERE supplier_id = $1 AND read_at IS NULL
      `;
      params = [supplierId];
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Marcar notificaciones específicas como leídas
      const placeholders = notificationIds.map((_, i) => `$${i + 2}`).join(',');
      query = `
        UPDATE provider_notifications 
        SET read_at = NOW() 
        WHERE supplier_id = $1 AND id IN (${placeholders}) AND read_at IS NULL
      `;
      params = [supplierId, ...notificationIds];
    } else {
      return NextResponse.json(
        { error: 'Parámetros inválidos' },
        { status: 400 }
      );
    }

    const result = await postgresqlClient.query(query, params);

    if (result.error) {
      console.error('❌ [Portal Notifications] Error marcando como leídas:', result.error);
      return NextResponse.json(
        { error: 'Error marcando notificaciones como leídas' },
        { status: 500 }
      );
    }

    console.log('✅ [Portal Notifications] Notificaciones marcadas como leídas');

    return NextResponse.json({
      success: true,
      message: 'Notificaciones marcadas como leídas'
    });

  } catch (error) {
    console.error('❌ [Portal Notifications] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 