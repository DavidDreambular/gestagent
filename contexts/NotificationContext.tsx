// Contexto de notificaciones con PostgreSQL - Versión Mock Temporal
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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

// Las notificaciones se cargarán desde la API en tiempo real

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Calcular notificaciones no leídas
  useEffect(() => {
    const unread = notifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

  // Función para cargar notificaciones (mock)
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.notifications) {
          setNotifications(data.notifications);
          console.log('🔔 [NOTIFICATIONS] Notificaciones cargadas desde la API');
        }
      }
    } catch (error) {
      console.error('❌ [NOTIFICATIONS] Error cargando notificaciones:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para marcar como leídas
  const markAsRead = useCallback(async (notificationIds: string[]) => {
    if (notificationIds.length === 0) return;

    console.log('🔔 [NOTIFICATIONS] Marcando como leídas:', notificationIds);

    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationIds }),
      });

      if (response.ok) {
        // Actualizar estado local solo si la API responde correctamente
        setNotifications(prev => 
          prev.map(n => 
            notificationIds.includes(n.id) 
              ? { ...n, read: true, read_at: new Date().toISOString() }
              : n
          )
        );
        
        toast.success(`${notificationIds.length} notificación(es) marcada(s) como leída(s)`);
      } else {
        toast.error('Error al marcar notificaciones como leídas');
      }
    } catch (error) {
      console.error('❌ [NOTIFICATIONS] Error marcando como leídas:', error);
      toast.error('Error de conexión');
    }
  }, []);

  // Función para marcar todas como leídas
  const markAllAsRead = useCallback(async () => {
    console.log('🔔 [NOTIFICATIONS] Marcando todas como leídas');

    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markAll: true }),
      });

      if (response.ok) {
        // Actualizar estado local
        setNotifications(prev => 
          prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() }))
        );
        
        toast.success('Todas las notificaciones marcadas como leídas');
      } else {
        toast.error('Error al marcar todas las notificaciones');
      }
    } catch (error) {
      console.error('❌ [NOTIFICATIONS] Error marcando todas como leídas:', error);
      toast.error('Error de conexión');
    }
  }, []);

  // Función para eliminar notificación
  const deleteNotification = useCallback(async (notificationId: string) => {
    console.log('🔔 [NOTIFICATIONS] Eliminando notificación:', notificationId);

    try {
      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Actualizar estado local
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        
        toast.success('Notificación eliminada');
      } else {
        toast.error('Error al eliminar notificación');
      }
    } catch (error) {
      console.error('❌ [NOTIFICATIONS] Error eliminando notificación:', error);
      toast.error('Error de conexión');
    }
  }, []);

  // Función para refrescar notificaciones
  const refresh = useCallback(async () => {
    console.log('🔔 [NOTIFICATIONS] Refrescando notificaciones');
    await loadNotifications();
  }, [loadNotifications]);

  // Cargar notificaciones al montar el componente
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh
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
