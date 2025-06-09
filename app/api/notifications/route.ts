// API Route para gestionar notificaciones - MODO FREE ACCESS
// /app/api/notifications/route.ts

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Datos mock para desarrollo
const mockNotifications = [
  {
    id: 1,
    user_id: 'demo-user',
    type: 'success',
    title: 'Documento procesado',
    message: 'La factura demo-001.pdf ha sido procesada exitosamente',
    read: false,
    created_at: '2025-06-06T12:00:00.000Z',
    read_at: null,
    metadata: { document_id: 'demo-001', processing_time: 1250 }
  },
  {
    id: 2,
    user_id: 'demo-user',
    type: 'info',
    title: 'Nuevo proveedor creado',
    message: 'Se ha registrado automáticamente un nuevo proveedor: Empresa Demo S.L.',
    read: true,
    created_at: '2025-06-06T11:30:00.000Z',
    read_at: '2025-06-06T11:35:00.000Z',
    metadata: { supplier_id: 'supp-001', source: 'automatic' }
  },
  {
    id: 3,
    user_id: 'demo-user',
    type: 'warning',
    title: 'Documento con errores menores',
    message: 'El documento factura-002.pdf fue procesado pero con algunas advertencias',
    read: false,
    created_at: '2025-06-06T10:15:00.000Z',
    read_at: null,
    metadata: { document_id: 'demo-002', warnings: ['fecha_dudosa', 'total_aproximado'] }
  },
  {
    id: 4,
    user_id: 'demo-user',
    type: 'error',
    title: 'Error en procesamiento',
    message: 'No se pudo procesar el documento scan-error.pdf debido a calidad insuficiente',
    read: false,
    created_at: '2025-06-06T09:45:00.000Z',
    read_at: null,
    metadata: { document_id: 'error-001', error_code: 'POOR_QUALITY' }
  }
];

// GET: Obtener notificaciones
export async function GET(request: NextRequest) {
  try {
    console.log('📬 [API Notifications] Obteniendo notificaciones (modo desarrollo)');
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const unreadOnly = searchParams.get('unread') === 'true';
    
    console.log(`🔍 [API Notifications] Filtros: limit=${limit}, unreadOnly=${unreadOnly}`);
    
    // Filtrar notificaciones
    let filteredNotifications = [...mockNotifications];
    
    if (unreadOnly) {
      filteredNotifications = filteredNotifications.filter(n => !n.read);
    }
    
    // Aplicar límite
    filteredNotifications = filteredNotifications.slice(0, limit);
    
    // Calcular no leídas
    const unreadCount = mockNotifications.filter(n => !n.read).length;
    
    console.log(`✅ [API Notifications] Retornando ${filteredNotifications.length} notificaciones, ${unreadCount} no leídas`);
    
    return NextResponse.json({
      success: true,
      notifications: filteredNotifications,
      unreadCount,
      total: filteredNotifications.length,
      source: 'mock_data',
      message: 'Datos de desarrollo (modo FREE ACCESS)'
    });
    
  } catch (error: any) {
    console.error('❌ [API Notifications] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener notificaciones',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// POST: Enviar notificación (mock)
export async function POST(request: NextRequest) {
  try {
    console.log('📨 [API Notifications] Enviando notificación (modo desarrollo)');
    
    const body = await request.json();
    const { type, title, message, metadata } = body;
    
    if (!type || !title) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Tipo y título son requeridos' 
        },
        { status: 400 }
      );
    }
    
    // Simular creación de notificación
    const newNotification = {
      id: Date.now(),
      user_id: 'demo-user',
      type,
      title,
      message: message || '',
      read: false,
      created_at: new Date().toISOString(),
      read_at: null,
      metadata: metadata || {}
    };
    
    console.log('✅ [API Notifications] Notificación mock creada:', newNotification.id);
    
    return NextResponse.json({
      success: true,
      notificationId: newNotification.id,
      notification: newNotification,
      source: 'mock_data',
      message: 'Notificación mock creada (modo desarrollo)'
    });
    
  } catch (error: any) {
    console.error('❌ [API Notifications] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al enviar notificación',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// PATCH: Marcar notificaciones como leídas (mock)
export async function PATCH(request: NextRequest) {
  try {
    console.log('✅ [API Notifications] Marcando notificaciones como leídas (modo desarrollo)');
    
    const body = await request.json();
    const { notificationIds, markAll } = body;
    
    if (markAll) {
      const unreadCount = mockNotifications.filter(n => !n.read).length;
      console.log(`✅ [API Notifications] Marcando todas (${unreadCount}) como leídas`);
      
      return NextResponse.json({
        success: true,
        message: 'Todas las notificaciones marcadas como leídas (mock)',
        updated: unreadCount,
        source: 'mock_data'
      });
      
    } else if (notificationIds && Array.isArray(notificationIds)) {
      console.log(`✅ [API Notifications] Marcando ${notificationIds.length} específicas como leídas`);
      
      return NextResponse.json({
        success: true,
        updated: notificationIds.length,
        source: 'mock_data',
        message: 'Notificaciones específicas marcadas como leídas (mock)'
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
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar notificación (mock)
export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ [API Notifications] Eliminando notificación (modo desarrollo)');
    
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
    
    console.log(`✅ [API Notifications] Notificación ${notificationId} eliminada (mock)`);
    
    return NextResponse.json({
      success: true,
      message: 'Notificación eliminada (mock)',
      deletedId: notificationId,
      source: 'mock_data'
    });
    
  } catch (error: any) {
    console.error('❌ [API Notifications] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al eliminar notificación',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
