// Contexto para el sistema de notificaciones en tiempo real
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message?: string;
  read: boolean;
  metadata?: any;
  created_at: string;
  read_at?: string;
}

export type NotificationType = 
  | 'document_uploaded'
  | 'document_processed'
  | 'document_error'
  | 'document_shared'
  | 'system_update'
  | 'payment_reminder'
  | 'export_completed';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (notificationIds: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  
  const { user } = useAuth();
  const supabase = createClientComponentClient();

  // Función para cargar notificaciones
  const loadNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Cargar notificaciones del usuario
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      
      // Calcular no leídas
      const unread = (data || []).filter(n => !n.read).length;
      setUnreadCount(unread);
      
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  }, [user?.id, supabase]);

  // Función para marcar como leídas
  const markAsRead = useCallback(async (notificationIds: string[]) => {
    if (!user?.id || notificationIds.length === 0) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .in('id', notificationIds)
        .eq('user_id', user.id);

      if (error) throw error;

      // Actualizar estado local
      setNotifications(prev => 
        prev.map(n => 
          notificationIds.includes(n.id) 
            ? { ...n, read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      
      // Actualizar contador
      setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
      
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      toast.error('Error al marcar notificaciones como leídas');
    }
  }, [user?.id, supabase]);

  // Función para marcar todas como leídas
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      // Actualizar estado local
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() }))
      );
      
      setUnreadCount(0);
      toast.success('Todas las notificaciones marcadas como leídas');
      
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Error al marcar todas las notificaciones');
    }
  }, [user?.id, supabase]);

  // Función para eliminar notificación
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Actualizar estado local
      setNotifications(prev => {
        const notification = prev.find(n => n.id === notificationId);
        if (notification && !notification.read) {
          setUnreadCount(count => Math.max(0, count - 1));
        }
        return prev.filter(n => n.id !== notificationId);
      });
      
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Error al eliminar notificación');
    }
  }, [user?.id, supabase]);

  // Configurar suscripción realtime
  useEffect(() => {
    if (!user?.id) return;

    // Cargar notificaciones iniciales
    loadNotifications();

    // Crear canal de suscripción
    const newChannel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload: RealtimePostgresChangesPayload<Notification>) => {
          console.log('Nueva notificación recibida:', payload);
          
          if (payload.new) {
            const newNotification = payload.new as Notification;
            
            // Añadir al inicio de la lista
            setNotifications(prev => [newNotification, ...prev]);
            
            // Incrementar contador si no está leída
            if (!newNotification.read) {
              setUnreadCount(prev => prev + 1);
            }
            
            // Mostrar toast según el tipo
            showNotificationToast(newNotification);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload: RealtimePostgresChangesPayload<Notification>) => {
          if (payload.new) {
            const updatedNotification = payload.new as Notification;
            
            setNotifications(prev => 
              prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
            );
            
            // Actualizar contador si cambió el estado de lectura
            if (payload.old && !(payload.old as any).read && updatedNotification.read) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
          }
        }
      )
      .subscribe();

    setChannel(newChannel);

    // Cleanup
    return () => {
      if (newChannel) {
        supabase.removeChannel(newChannel);
      }
    };
  }, [user?.id, supabase, loadNotifications]);

  // Función para mostrar toast según tipo de notificación
  const showNotificationToast = (notification: Notification) => {
    const options = {
      description: notification.message,
      duration: 5000,
    };

    switch (notification.type) {
      case 'document_processed':
        toast.success(notification.title, options);
        break;
      case 'document_error':
        toast.error(notification.title, options);
        break;
      case 'document_shared':
        toast.info(notification.title, options);
        break;
      default:
        toast(notification.title, options);
    }
  };

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: loadNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
