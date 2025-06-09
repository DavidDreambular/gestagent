'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Clock, AlertCircle, FileText, X } from 'lucide-react';

interface Notification {
  id: string;
  document_id: string;
  type: 'document_received' | 'document_validated' | 'document_error' | 'information_required';
  title: string;
  message: string;
  metadata: any;
  created_at: string;
  read_at: string | null;
  unread: boolean;
}

interface NotificationsPanelProps {
  supplierId?: string;
  compact?: boolean;
}

const NOTIFICATION_ICONS = {
  document_received: FileText,
  document_validated: CheckCheck,
  document_error: AlertCircle,
  information_required: Clock
};

const NOTIFICATION_COLORS = {
  document_received: 'text-blue-600 bg-blue-100',
  document_validated: 'text-green-600 bg-green-100',
  document_error: 'text-red-600 bg-red-100',
  information_required: 'text-yellow-600 bg-yellow-100'
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
      const token = localStorage.getItem('portal_token');
      if (!token) return;

      const params = new URLSearchParams({
        limit: compact ? '5' : '20',
        offset: '0'
      });

      if (unreadOnly) {
        params.append('unread', 'true');
      }

      const response = await fetch(`/api/portal/notifications?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
      
      const token = localStorage.getItem('portal_token');
      if (!token) return;

      const response = await fetch('/api/portal/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notificationIds })
      });

      if (response.ok) {
        // Actualizar estado local
        setNotifications(prev => 
          prev.map(notif => 
            notificationIds.includes(notif.id) 
              ? { ...notif, read_at: new Date().toISOString(), unread: false }
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
      const token = localStorage.getItem('portal_token');
      if (!token) return;

      const response = await fetch('/api/portal/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ markAllAsRead: true })
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => ({ 
            ...notif, 
            read_at: new Date().toISOString(), 
            unread: false 
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
          className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
        >
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
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
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-96 overflow-hidden">
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
                  notifications.slice(0, 5).map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      isMarking={markingAsRead.includes(notification.id)}
                      formatDate={formatDate}
                      compact
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
    <div className="bg-white rounded-lg shadow border border-gray-200">
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
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={markAsRead}
              isMarking={markingAsRead.includes(notification.id)}
              formatDate={formatDate}
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
}

function NotificationItem({ notification, onMarkAsRead, isMarking, formatDate, compact = false }: NotificationItemProps) {
  const Icon = NOTIFICATION_ICONS[notification.type];
  const colorClass = NOTIFICATION_COLORS[notification.type];

  return (
    <div 
      className={`p-4 hover:bg-gray-50 transition-colors ${
        notification.unread ? 'bg-blue-50 border-l-4 border-blue-500' : ''
      }`}
    >
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-full ${colorClass}`}>
          <Icon className="w-4 h-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <h4 className={`text-sm font-medium ${
              notification.unread ? 'text-gray-900' : 'text-gray-600'
            }`}>
              {notification.title}
            </h4>
            
            {notification.unread && (
              <button
                onClick={() => onMarkAsRead([notification.id])}
                disabled={isMarking}
                className="ml-2 text-blue-600 hover:text-blue-700 disabled:opacity-50"
                title="Marcar como leída"
              >
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <p className={`text-sm mt-1 ${
            compact ? 'line-clamp-2' : ''
          } ${notification.unread ? 'text-gray-700' : 'text-gray-500'}`}>
            {notification.message}
          </p>
          
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {formatDate(notification.created_at)}
            </span>
            
            {notification.metadata?.documentNumber && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                {notification.metadata.documentNumber}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotificationsPanel; 