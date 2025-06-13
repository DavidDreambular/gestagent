// API Route para gestionar notificaciones
// /app/api/notifications/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { unifiedNotificationService } from '@/lib/services/unified-notification.service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: Obtener notificaciones del usuario
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || request.headers.get('user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado. Por favor inicie sesión.' },
        { status: 401 }
      );
    }

    console.log('📬 [API Notifications] Obteniendo notificaciones para usuario:', userId);
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const unreadOnly = searchParams.get('unread') === 'true';
    
    console.log(`🔍 [API Notifications] Filtros: limit=${limit}, unreadOnly=${unreadOnly}`);
    
    // Obtener notificaciones del usuario desde PostgreSQL
    const notifications = await unifiedNotificationService.getUserNotifications(userId, { limit, unreadOnly });
    
    // Obtener contador de no leídas
    const unreadCount = await unifiedNotificationService.getUnreadCount(userId);
    
    console.log(`✅ [API Notifications] Retornando ${notifications.length} notificaciones, ${unreadCount} no leídas`);
    
    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
      total: notifications.length,
      source: 'postgresql'
    });
    
  } catch (error: any) {
    console.error('❌ [API Notifications] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener notificaciones',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// POST: Crear nueva notificación
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || request.headers.get('user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado. Por favor inicie sesión.' },
        { status: 401 }
      );
    }

    console.log('📨 [API Notifications] Creando notificación para usuario:', userId);
    
    const body = await request.json();
    const { type, title, message, metadata, targetUserId } = body;
    
    if (!type || !title) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Tipo y título son requeridos' 
        },
        { status: 400 }
      );
    }
    
    // Solo admin puede enviar notificaciones a otros usuarios
    const notificationUserId = targetUserId && session?.user?.role?.includes('admin') ? targetUserId : userId;
    
    // Crear notificación
    const notificationId = await unifiedNotificationService.send({
      user_id: notificationUserId,
      type,
      title,
      message: message || '',
      metadata: metadata || {}
    });
    
    if (!notificationId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Error al crear notificación' 
        },
        { status: 500 }
      );
    }
    
    console.log('✅ [API Notifications] Notificación creada:', notificationId);
    
    return NextResponse.json({
      success: true,
      notificationId,
      message: 'Notificación creada exitosamente'
    });
    
  } catch (error: any) {
    console.error('❌ [API Notifications] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al crear notificación',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// PATCH: Marcar notificaciones como leídas
export async function PATCH(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || request.headers.get('user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado. Por favor inicie sesión.' },
        { status: 401 }
      );
    }

    console.log('✅ [API Notifications] Marcando notificaciones como leídas para usuario:', userId);
    
    const body = await request.json();
    const { notificationIds, markAll } = body;
    
    let updatedCount = 0;
    
    if (markAll) {
      // Marcar todas las notificaciones del usuario como leídas
      const success = await unifiedNotificationService.markAllAsRead(userId);
      
      console.log(`✅ [API Notifications] Todas marcadas como leídas: ${success}`);
      
      return NextResponse.json({
        success: true,
        message: 'Todas las notificaciones marcadas como leídas',
        updated: success ? 1 : 0
      });
      
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Marcar notificaciones específicas como leídas
      for (const notId of notificationIds) {
        await unifiedNotificationService.markAsRead(notId);
        updatedCount++;
      }
      
      console.log(`✅ [API Notifications] Marcadas ${updatedCount} notificaciones específicas como leídas`);
      
      return NextResponse.json({
        success: true,
        updated: updatedCount,
        message: 'Notificaciones específicas marcadas como leídas'
      });
      
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: 'Se requiere notificationIds o markAll' 
        },
        { status: 400 }
      );
    }
    
  } catch (error: any) {
    console.error('❌ [API Notifications] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al actualizar notificaciones',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar notificación
export async function DELETE(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || request.headers.get('user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado. Por favor inicie sesión.' },
        { status: 401 }
      );
    }

    console.log('🗑️ [API Notifications] Eliminando notificación');
    
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');
    
    if (!notificationId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'ID de notificación requerido' 
        },
        { status: 400 }
      );
    }
    
    // Eliminar notificación (soft delete)
    const success = await unifiedNotificationService.deleteNotification(notificationId);
    
    if (!success) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Notificación no encontrada o no autorizada' 
        },
        { status: 404 }
      );
    }
    
    console.log(`✅ [API Notifications] Notificación ${notificationId} eliminada`);
    
    return NextResponse.json({
      success: true,
      message: 'Notificación procesada',
      deletedId: notificationId
    });
    
  } catch (error: any) {
    console.error('❌ [API Notifications] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al eliminar notificación',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}