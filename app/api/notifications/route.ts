// API Route para gestionar notificaciones
// /app/api/notifications/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { memoryDB } from '@/lib/memory-db';
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
    
    // Obtener notificaciones del usuario
    const allNotifications = await memoryDB.getNotificationsByUserId(userId);
    
    // Filtrar notificaciones
    let filteredNotifications = allNotifications;
    
    if (unreadOnly) {
      filteredNotifications = filteredNotifications.filter(n => !n.read);
    }
    
    // Aplicar límite
    filteredNotifications = filteredNotifications.slice(0, limit);
    
    // Calcular no leídas
    const unreadCount = allNotifications.filter(n => !n.read).length;
    
    console.log(`✅ [API Notifications] Retornando ${filteredNotifications.length} notificaciones, ${unreadCount} no leídas`);
    
    return NextResponse.json({
      success: true,
      notifications: filteredNotifications,
      unreadCount,
      total: filteredNotifications.length,
      source: 'memory_db'
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
    const { type, title, message, data, targetUserId } = body;
    
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
    const newNotification = await memoryDB.createNotification({
      user_id: notificationUserId,
      type,
      title,
      message: message || '',
      data: data || {}
    });
    
    console.log('✅ [API Notifications] Notificación creada:', newNotification.id);
    
    return NextResponse.json({
      success: true,
      notificationId: newNotification.id,
      notification: newNotification
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
    
    if (markAll) {
      // Marcar todas las notificaciones del usuario como leídas
      const userNotifications = await memoryDB.getNotificationsByUserId(userId);
      const unreadNotifications = userNotifications.filter(n => !n.read);
      
      let updatedCount = 0;
      for (const notification of unreadNotifications) {
        const success = await memoryDB.markNotificationAsRead(notification.id);
        if (success) updatedCount++;
      }
      
      console.log(`✅ [API Notifications] Marcadas ${updatedCount} notificaciones como leídas`);
      
      return NextResponse.json({
        success: true,
        message: 'Todas las notificaciones marcadas como leídas',
        updated: updatedCount
      });
      
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Marcar notificaciones específicas como leídas
      let updatedCount = 0;
      
      for (const notificationId of notificationIds) {
        // Verificar que la notificación pertenece al usuario
        const userNotifications = await memoryDB.getNotificationsByUserId(userId);
        const notification = userNotifications.find(n => n.id === notificationId);
        
        if (notification && !notification.read) {
          const success = await memoryDB.markNotificationAsRead(notificationId);
          if (success) updatedCount++;
        }
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
    
    // Verificar que la notificación pertenece al usuario
    const userNotifications = await memoryDB.getNotificationsByUserId(userId);
    const notification = userNotifications.find(n => n.id === notificationId);
    
    if (!notification) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Notificación no encontrada o no autorizada' 
        },
        { status: 404 }
      );
    }
    
    // Por ahora solo marcamos como leída en lugar de eliminar
    // Podrías agregar un método deleteNotification en memoryDB si lo necesitas
    await memoryDB.markNotificationAsRead(notificationId);
    
    console.log(`✅ [API Notifications] Notificación ${notificationId} marcada como procesada`);
    
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