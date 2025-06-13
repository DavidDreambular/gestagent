import { NextRequest, NextResponse } from 'next/server';
import pgClient from '@/lib/postgresql-client';
import jwt from 'jsonwebtoken';

/**
 * GET /api/portal/notifications
 * Obtiene las notificaciones del proveedor logueado
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('portal-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Verificar y decodificar el token
    const decoded = jwt.verify(
      token,
      process.env.NEXTAUTH_SECRET || 'fallback-secret'
    ) as any

    if (!decoded || decoded.role !== 'provider') {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    const userId = decoded.userId;
    if (!userId) {
      return NextResponse.json(
        { error: 'ID de usuario no encontrado' },
        { status: 400 }
      );
    }

    // Parámetros de consulta
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const onlyUnread = searchParams.get('unread') === 'true';

    console.log('📢 [Portal Notifications] Obteniendo notificaciones para usuario:', userId);

    // Construir query
    let query = `
      SELECT 
        id,
        title,
        message,
        type,
        is_read,
        action_url,
        created_at,
        read_at
      FROM provider_notifications 
      WHERE provider_user_id = $1
    `;

    const params: any[] = [userId];
    let paramIndex = 2;

    if (onlyUnread) {
      query += ` AND is_read = false`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    // Ejecutar consulta
    const { data: result, error: queryError } = await pgClient.query(query, params);

    if (queryError) {
      console.error('❌ [Portal Notifications] Error obteniendo notificaciones:', queryError);
      return NextResponse.json(
        { error: 'Error obteniendo notificaciones' },
        { status: 500 }
      );
    }

    // Obtener conteo de no leídas
    const { data: unreadCountResult, error: countError } = await pgClient.query(
      'SELECT COUNT(*) as unread_count FROM provider_notifications WHERE provider_user_id = $1 AND is_read = false',
      [userId]
    );

    const unreadCount = parseInt(unreadCountResult?.[0]?.unread_count || '0');

    console.log('✅ [Portal Notifications] Notificaciones obtenidas:', result?.length || 0);

    return NextResponse.json({
      notifications: result || [],
      unreadCount,
      total: result?.length || 0,
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
    const token = request.cookies.get('portal-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Verificar y decodificar el token
    const decoded = jwt.verify(
      token,
      process.env.NEXTAUTH_SECRET || 'fallback-secret'
    ) as any

    if (!decoded || decoded.role !== 'provider') {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    const userId = decoded.userId;
    if (!userId) {
      return NextResponse.json(
        { error: 'ID de usuario no encontrado' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { notificationIds, markAllAsRead } = body;

    console.log('📢 [Portal Notifications] Marcando como leídas:', { notificationIds, markAllAsRead });

    let query: string;
    let params: any[];

    if (markAllAsRead) {
      // Marcar todas las notificaciones del usuario como leídas
      query = `
        UPDATE provider_notifications 
        SET is_read = true, read_at = NOW() 
        WHERE provider_user_id = $1 AND is_read = false
      `;
      params = [userId];
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Marcar notificaciones específicas como leídas
      const placeholders = notificationIds.map((_, i) => `$${i + 2}`).join(',');
      query = `
        UPDATE provider_notifications 
        SET is_read = true, read_at = NOW() 
        WHERE provider_user_id = $1 AND id IN (${placeholders}) AND is_read = false
      `;
      params = [userId, ...notificationIds];
    } else {
      return NextResponse.json(
        { error: 'Parámetros inválidos' },
        { status: 400 }
      );
    }

    const { data: result, error: updateError } = await pgClient.query(query, params);

    if (updateError) {
      console.error('❌ [Portal Notifications] Error marcando como leídas:', updateError);
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