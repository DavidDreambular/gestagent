// Servicio para gestionar notificaciones - Usando PostgreSQL Real
import { unifiedNotificationService } from '@/lib/services/unified-notification.service';

console.log('📢 [NotificationService] Inicializando con PostgreSQL real');

export type NotificationType = 
  | 'document_uploaded'
  | 'document_processed'
  | 'document_error'
  | 'document_shared'
  | 'system_update'
  | 'payment_reminder'
  | 'export_completed';

interface NotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  /**
   * Enviar una notificación a un usuario
   */
  async send(data: NotificationData): Promise<string | null> {
    // Usar el servicio unificado que guarda en PostgreSQL real
    return unifiedNotificationService.send(data);
  }

  /**
   * Enviar notificación de documento subido
   */
  async notifyDocumentUploaded(userId: string, documentName: string, jobId: string) {
    return unifiedNotificationService.notifyDocumentUploaded(userId, documentName, jobId);
  }

  /**
   * Enviar notificación de documento procesado exitosamente
   */
  async notifyDocumentProcessed(userId: string, documentName: string, jobId: string, processingTime?: number) {
    return unifiedNotificationService.notifyDocumentProcessed(userId, documentName, jobId, processingTime);
  }

  /**
   * Enviar notificación de error en procesamiento
   */
  async notifyDocumentError(userId: string, documentName: string, jobId: string, errorMessage?: string) {
    return unifiedNotificationService.notifyDocumentError(userId, documentName, jobId, errorMessage);
  }

  /**
   * Enviar notificación de documento compartido
   */
  async notifyDocumentShared(userId: string, documentName: string, sharedBy: string, jobId: string) {
    return unifiedNotificationService.notifyDocumentShared(userId, documentName, sharedBy, jobId);
  }

  /**
   * Enviar notificación de exportación completada
   */
  async notifyExportCompleted(userId: string, exportType: string, documentCount: number, downloadUrl?: string) {
    return unifiedNotificationService.notifyExportCompleted(userId, exportType, documentCount, downloadUrl);
  }

  /**
   * Enviar notificación masiva a múltiples usuarios
   */
  async sendBulk(userIds: string[], notification: Omit<NotificationData, 'userId'>) {
    return unifiedNotificationService.sendBulk(userIds, notification);
  }

  /**
   * Limpiar notificaciones antiguas
   */
  async cleanupOldNotifications(daysToKeepRead: number = 30, daysToKeepUnread: number = 90) {
    return unifiedNotificationService.cleanupOldNotifications(daysToKeepRead, daysToKeepUnread);
  }

  /**
   * Obtener estadísticas de notificaciones
   */
  async getStats() {
    return unifiedNotificationService.getStats();
  }
}

// Instancia singleton
export const notificationService = new NotificationService();
