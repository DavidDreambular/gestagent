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

// Datos mock temporales
const mockNotifications: Notification[] = [
  {
    id: '1',
    user_id: 'mock-user',
    type: 'document_processed',
    title: 'Documento procesado',
    message: 'Tu factura ha sido procesada exitosamente con Mistral AI',
    read: false,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    user_id: 'mock-user',
    type: 'document_uploaded',
    title: 'Documento subido',
    message: 'Se ha subido un nuevo documento PDF',
    read: false,
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  },
  {
    id: '3',
    user_id: 'mock-user',
    type: 'system_update',
    title: 'Migración completada',
    message: 'Sistema migrado exitosamente de Supabase a PostgreSQL',
    read: true,
    read_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString()
  }
];

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
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
    
    // Simular carga asíncrona
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setNotifications(mockNotifications);
    setLoading(false);
    
    console.log('🔔 [NOTIFICATIONS] Notificaciones mock cargadas');
  }, []);

  // Función para marcar como leídas
  const markAsRead = useCallback(async (notificationIds: string[]) => {
    if (notificationIds.length === 0) return;

    console.log('🔔 [NOTIFICATIONS] Marcando como leídas:', notificationIds);

    // Actualizar estado local
    setNotifications(prev => 
      prev.map(n => 
        notificationIds.includes(n.id) 
          ? { ...n, read: true, read_at: new Date().toISOString() }
          : n
      )
    );
    
    toast.success(`${notificationIds.length} notificación(es) marcada(s) como leída(s)`);
  }, []);

  // Función para marcar todas como leídas
  const markAllAsRead = useCallback(async () => {
    console.log('🔔 [NOTIFICATIONS] Marcando todas como leídas');

    // Actualizar estado local
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() }))
    );
    
    toast.success('Todas las notificaciones marcadas como leídas');
  }, []);

  // Función para eliminar notificación
  const deleteNotification = useCallback(async (notificationId: string) => {
    console.log('🔔 [NOTIFICATIONS] Eliminando notificación:', notificationId);

    // Actualizar estado local
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    
    toast.success('Notificación eliminada');
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
