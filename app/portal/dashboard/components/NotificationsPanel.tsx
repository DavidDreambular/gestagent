'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Clock, AlertCircle, FileText, X } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  is_read: boolean;
  action_url?: string;
  created_at: string;
  read_at: string | null;
}

interface NotificationsPanelProps {
  supplierId?: string;
  compact?: boolean;
}

const NOTIFICATION_ICONS = {
  success: CheckCheck,
  info: FileText,
  warning: Clock,
  error: AlertCircle
};

const NOTIFICATION_COLORS = {
  success: 'text-green-600 bg-green-100',
  info: 'text-blue-600 bg-blue-100',
  warning: 'text-yellow-600 bg-yellow-100',
  error: 'text-red-600 bg-red-100'
};

export function NotificationsPanel({ supplierId, compact = false }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [markingAsRead, setMarkingAsRead] = useState<string[]>([]);

  // Cargar notificaciones
  const loadNotifications = async (unreadOnly = false) => {
    try {
      const params = new URLSearchParams({
        limit: compact ? '5' : '20',
        offset: '0'
      });

      if (unreadOnly) {
        params.append('unread', 'true');
      }

      const response = await fetch(`/api/portal/notifications?${params}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  // Marcar como leída
  const markAsRead = async (notificationIds: string[]) => {
    try {
      setMarkingAsRead(prev => [...prev, ...notificationIds]);

      const response = await fetch('/api/portal/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ notificationIds })
      });

      if (response.ok) {
        // Actualizar estado local
        setNotifications(prev => 
          prev.map(notif => 
            notificationIds.includes(notif.id) 
              ? { ...notif, read_at: new Date().toISOString(), is_read: true }
              : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
      }
    } catch (error) {
      console.error('Error marcando como leída:', error);
    } finally {
      setMarkingAsRead(prev => prev.filter(id => !notificationIds.includes(id)));
    }
  };

  // Marcar todas como leídas
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/portal/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ markAllAsRead: true })
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => ({ 
            ...notif, 
            read_at: new Date().toISOString(), 
            is_read: true 
          }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marcando todas como leídas:', error);
    }
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString('es-ES');
  };

  useEffect(() => {
    loadNotifications();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(() => loadNotifications(), 30000);
    return () => clearInterval(interval);
  }, []);

  if (compact) {
    // Vista compacta para el header
    return (
      <div className="relative">
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 rounded-full transition-all duration-200 hover:scale-110"
        >
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center pulse-dot">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {showPanel && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowPanel(false)}
            />
            <div className="absolute right-0 mt-2 w-80 glass-card rounded-lg border border-white/20 z-20 max-h-96 overflow-hidden fade-in">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Notificaciones</h3>
                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Marcar todas
                    </button>
                  )}
                  <button
                    onClick={() => setShowPanel(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="max-h-64 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center text-gray-500">
                    Cargando...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No hay notificaciones
                  </div>
                ) : (
                  notifications.slice(0, 5).map((notification, index) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      isMarking={markingAsRead.includes(notification.id)}
                      formatDate={formatDate}
                      compact
                      index={index}
                    />
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Vista completa
  return (
    <div className="glass-card rounded-lg border border-white/20 fade-in">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Notificaciones
          </h2>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Marcar todas como leídas</span>
            </button>
          )}
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {loading ? (
          <div className="p-6 text-center text-gray-500">
            Cargando notificaciones...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No hay notificaciones</p>
          </div>
        ) : (
          notifications.map((notification, index) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={markAsRead}
              isMarking={markingAsRead.includes(notification.id)}
              formatDate={formatDate}
              index={index}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (ids: string[]) => void;
  isMarking: boolean;
  formatDate: (dateString: string) => string;
  compact?: boolean;
  index?: number;
}

function NotificationItem({ notification, onMarkAsRead, isMarking, formatDate, compact = false, index = 0 }: NotificationItemProps) {
  const Icon = NOTIFICATION_ICONS[notification.type];
  const colorClass = NOTIFICATION_COLORS[notification.type];

  return (
    <div 
      className={`p-4 hover:bg-white/20 transition-all duration-200 hover-lift fade-in ${
        !notification.is_read ? 'bg-blue-50/50 border-l-4 border-cyan-500' : ''
      }`}
      style={{animationDelay: `${index * 0.1}s`}}
    >
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-full ${colorClass}`}>
          <Icon className="w-4 h-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <h4 className={`text-sm font-medium ${
              !notification.is_read ? 'text-gray-900' : 'text-gray-600'
            }`}>
              {notification.title}
            </h4>
            
            {!notification.is_read && (
              <button
                onClick={() => onMarkAsRead([notification.id])}
                disabled={isMarking}
                className="ml-2 text-cyan-600 hover:text-cyan-700 disabled:opacity-50 transition-all duration-200 hover:scale-110"
                title="Marcar como leída"
              >
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <p className={`text-sm mt-1 ${
            compact ? 'line-clamp-2' : ''
          } ${!notification.is_read ? 'text-gray-700' : 'text-gray-500'}`}>
            {notification.message}
          </p>
          
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {formatDate(notification.created_at)}
            </span>
            
            {notification.action_url && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                Ver detalles
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotificationsPanel; 