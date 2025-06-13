'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Bell, 
  CheckCircle, 
  AlertCircle, 
  Building2, 
  Users, 
  FileText,
  X,
  Clock,
  FileCheck,
  FileX,
  Share2,
  Download,
  Package
} from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { toast } from 'sonner';

interface NotificationsSystemProps {
  className?: string;
}

export function NotificationsSystem({ className }: NotificationsSystemProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, refresh } = useNotifications();
  const [showPanel, setShowPanel] = useState(false);

  // Refrescar notificaciones al abrir el panel
  useEffect(() => {
    if (showPanel) {
      refresh();
    }
  }, [showPanel, refresh]);

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead([notificationId]);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleRemoveNotification = async (notificationId: string) => {
    await deleteNotification(notificationId);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'supplier_created':
        return <Building2 className="h-4 w-4 text-blue-600" />;
      case 'customer_created':
        return <Users className="h-4 w-4 text-green-600" />;
      case 'document_uploaded':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'document_processed':
        return <FileCheck className="h-4 w-4 text-green-600" />;
      case 'document_error':
        return <FileX className="h-4 w-4 text-red-600" />;
      case 'document_shared':
        return <Share2 className="h-4 w-4 text-purple-600" />;
      case 'export_completed':
        return <Download className="h-4 w-4 text-indigo-600" />;
      case 'entity_updated':
        return <Package className="h-4 w-4 text-orange-600" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - notificationTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Ahora mismo';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
    if (diffInMinutes < 1440) return `Hace ${Math.floor(diffInMinutes / 60)} horas`;
    return `Hace ${Math.floor(diffInMinutes / 1440)} días`;
  };

  const handleNotificationClick = (notification: any) => {
    handleMarkAsRead(notification.id);
    
    // Navegar según el tipo de notificación
    if (notification.metadata?.link) {
      window.location.href = notification.metadata.link;
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Botón de notificaciones */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowPanel(!showPanel)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Panel de notificaciones */}
      {showPanel && (
        <Card className="absolute right-0 top-12 w-96 max-h-96 overflow-hidden z-50 shadow-lg border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notificaciones</CardTitle>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={handleMarkAllAsRead}
                    className="text-xs"
                  >
                    Marcar todas como leídas
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setShowPanel(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardDescription>
              Actividad reciente del sistema de procesamiento
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No hay notificaciones</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-medium text-gray-900 truncate">
                                {notification.title}
                              </h4>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-400">
                                {formatTimeAgo(notification.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveNotification(notification.id);
                          }}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overlay para cerrar panel */}
      {showPanel && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowPanel(false)}
        />
      )}
    </div>
  );
}

export default NotificationsSystem; 