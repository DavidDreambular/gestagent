// API Route para gestionar notificaciones
// /app/api/notifications/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/app/api/middleware/auth';
import { notificationService } from '@/services/notification.service';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// GET: Obtener notificaciones del usuario
export async function GET(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      const supabase = createServerComponentClient({ cookies });
      
      // Obtener parámetros de consulta
      const { searchParams } = new URL(req.url);
      const limit = parseInt(searchParams.get('limit') || '50');
      const unreadOnly = searchParams.get('unread') === 'true';
      
      // Construir query
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', req.userId!)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (unreadOnly) {
        query = query.eq('read', false);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Obtener contador de no leídas
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', req.userId!)
        .eq('read', false);
      
      return NextResponse.json({
        notifications: data || [],
        unreadCount: count || 0,
        total: data?.length || 0
      });
      
    } catch (error: any) {
      console.error('[Notifications API] Error:', error);
      return NextResponse.json(
        { error: 'Error al obtener notificaciones' },
        { status: 500 }
      );
    }
  });
}

// POST: Enviar notificación (solo para pruebas/admin)
export async function POST(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      const body = await req.json();
      const { type, title, message, metadata } = body;
      
      if (!type || !title) {
        return NextResponse.json(
          { error: 'Tipo y título son requeridos' },
          { status: 400 }
        );
      }
      
      // Enviar notificación
      const notificationId = await notificationService.send({
        userId: req.userId!,
        type,
        title,
        message,
        metadata
      });
      
      if (!notificationId) {
        throw new Error('No se pudo crear la notificación');
      }
      
      return NextResponse.json({
        success: true,
        notificationId
      });
      
    } catch (error: any) {
      console.error('[Notifications API] Error:', error);
      return NextResponse.json(
        { error: 'Error al enviar notificación' },
        { status: 500 }
      );
    }
  });
}

// PATCH: Marcar notificaciones como leídas
export async function PATCH(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      const body = await req.json();
      const { notificationIds, markAll } = body;
      
      const supabase = createServerComponentClient({ cookies });
      
      if (markAll) {
        // Marcar todas como leídas
        const { error } = await supabase
          .from('notifications')
          .update({ read: true, read_at: new Date().toISOString() })
          .eq('user_id', req.userId!)
          .eq('read', false);
          
        if (error) throw error;
        
        return NextResponse.json({
          success: true,
          message: 'Todas las notificaciones marcadas como leídas'
        });
        
      } else if (notificationIds && Array.isArray(notificationIds)) {
        // Marcar específicas como leídas
        const { error } = await supabase
          .from('notifications')
          .update({ read: true, read_at: new Date().toISOString() })
          .in('id', notificationIds)
          .eq('user_id', req.userId!);
          
        if (error) throw error;
        
        return NextResponse.json({
          success: true,
          updated: notificationIds.length
        });
        
      } else {
        return NextResponse.json(
          { error: 'Se requiere notificationIds o markAll' },
          { status: 400 }
        );
      }
      
    } catch (error: any) {
      console.error('[Notifications API] Error:', error);
      return NextResponse.json(
        { error: 'Error al actualizar notificaciones' },
        { status: 500 }
      );
    }
  });
}

// DELETE: Eliminar notificación
export async function DELETE(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url);
      const notificationId = searchParams.get('id');
      
      if (!notificationId) {
        return NextResponse.json(
          { error: 'ID de notificación requerido' },
          { status: 400 }
        );
      }
      
      const supabase = createServerComponentClient({ cookies });
      
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', req.userId!);
        
      if (error) throw error;
      
      return NextResponse.json({
        success: true,
        message: 'Notificación eliminada'
      });
      
    } catch (error: any) {
      console.error('[Notifications API] Error:', error);
      return NextResponse.json(
        { error: 'Error al eliminar notificación' },
        { status: 500 }
      );
    }
  });
}
