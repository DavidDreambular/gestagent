// Servicio para gestionar notificaciones - PostgreSQL Compatible
console.log('📢 [NotificationService] Inicializando con PostgreSQL/SQLite compatible');

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
    try {
      // TODO: Implementar con PostgreSQL MCP tools cuando esté configurado
      const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`📢 [PostgreSQL Mock] Notification sent to user ${data.userId}: ${data.title}`);
      console.log(`📢 [PostgreSQL Mock] Notification data:`, {
        id: notificationId,
        user_id: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        metadata: data.metadata || {},
        created_at: new Date().toISOString(),
        read: false
      });
      
      return notificationId;
      
    } catch (error) {
      console.error('❌ [NotificationService] Error in notification service:', error);
      return null;
    }
  }

  /**
   * Enviar notificación de documento subido
   */
  async notifyDocumentUploaded(userId: string, documentName: string, jobId: string) {
    return this.send({
      userId,
      type: 'document_uploaded',
      title: 'Documento recibido',
      message: `El documento "${documentName}" se ha subido correctamente y está siendo procesado.`,
      metadata: {
        documentName,
        jobId,
        link: `/dashboard/documents/${jobId}`
      }
    });
  }

  /**
   * Enviar notificación de documento procesado exitosamente
   */
  async notifyDocumentProcessed(userId: string, documentName: string, jobId: string, processingTime?: number) {
    const timeMsg = processingTime 
      ? ` en ${(processingTime / 1000).toFixed(1)} segundos`
      : '';
      
    return this.send({
      userId,
      type: 'document_processed',
      title: 'Documento procesado exitosamente',
      message: `El documento "${documentName}" ha sido procesado correctamente${timeMsg}.`,
      metadata: {
        documentName,
        jobId,
        processingTime,
        link: `/dashboard/documents/${jobId}`
      }
    });
  }

  /**
   * Enviar notificación de error en procesamiento
   */
  async notifyDocumentError(userId: string, documentName: string, jobId: string, errorMessage?: string) {
    return this.send({
      userId,
      type: 'document_error',
      title: 'Error al procesar documento',
      message: `Ha ocurrido un error al procesar "${documentName}". ${errorMessage || 'Por favor, intenta nuevamente.'}`,
      metadata: {
        documentName,
        jobId,
        error: errorMessage,
        link: `/dashboard/documents/${jobId}`
      }
    });
  }

  /**
   * Enviar notificación de documento compartido
   */
  async notifyDocumentShared(userId: string, documentName: string, sharedBy: string, jobId: string) {
    return this.send({
      userId,
      type: 'document_shared',
      title: 'Documento compartido contigo',
      message: `${sharedBy} ha compartido el documento "${documentName}" contigo.`,
      metadata: {
        documentName,
        jobId,
        sharedBy,
        link: `/dashboard/documents/${jobId}`
      }
    });
  }

  /**
   * Enviar notificación de exportación completada
   */
  async notifyExportCompleted(userId: string, exportType: string, documentCount: number, downloadUrl?: string) {
    return this.send({
      userId,
      type: 'export_completed',
      title: 'Exportación completada',
      message: `Tu exportación de ${documentCount} documento(s) en formato ${exportType} está lista para descargar.`,
      metadata: {
        exportType,
        documentCount,
        downloadUrl,
        link: downloadUrl || '/dashboard/exports'
      }
    });
  }

  /**
   * Enviar notificación masiva a múltiples usuarios
   */
  async sendBulk(userIds: string[], notification: Omit<NotificationData, 'userId'>) {
    const promises = userIds.map(userId => 
      this.send({ ...notification, userId })
    );
    
    const results = await Promise.allSettled(promises);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`📢 [NotificationService] Bulk send: ${successful} successful, ${failed} failed`);
    
    return { successful, failed };
  }

  /**
   * Limpiar notificaciones antiguas
   */
  async cleanupOldNotifications(daysToKeepRead: number = 30, daysToKeepUnread: number = 90) {
    try {
      // TODO: Implementar con PostgreSQL MCP tools
      console.log(`🧹 [PostgreSQL Mock] Cleaning up notifications older than ${daysToKeepRead}/${daysToKeepUnread} days`);
      
      const readCutoff = new Date();
      readCutoff.setDate(readCutoff.getDate() - daysToKeepRead);
      
      const unreadCutoff = new Date();
      unreadCutoff.setDate(unreadCutoff.getDate() - daysToKeepUnread);
      
      console.log(`🧹 [PostgreSQL Mock] Cleanup completed`);
      
    } catch (error) {
      console.error('❌ [NotificationService] Error cleaning notifications:', error);
    }
  }

  /**
   * Obtener estadísticas de notificaciones
   */
  async getStats() {
    try {
      // TODO: Implementar con PostgreSQL MCP tools
      console.log('📊 [PostgreSQL Mock] Getting notification stats');
      
      return {
        total: 0,
        unread: 0,
        by_type: {}
      };
      
    } catch (error) {
      console.error('❌ [NotificationService] Error getting stats:', error);
      return { total: 0, unread: 0, by_type: {} };
    }
  }
}

// Instancia singleton
export const notificationService = new NotificationService();
