// Servicio para gestionar notificaciones
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Cliente de Supabase con service role para insertar notificaciones
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

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
      const { data: notification, error } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          metadata: data.metadata || {}
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error sending notification:', error);
        return null;
      }

      console.log(`[NotificationService] Notification sent to user ${data.userId}: ${data.title}`);
      return notification.id;
      
    } catch (error) {
      console.error('Error in notification service:', error);
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
    
    console.log(`[NotificationService] Bulk send: ${successful} successful, ${failed} failed`);
    
    return { successful, failed };
  }

  /**
   * Limpiar notificaciones antiguas
   */
  async cleanupOldNotifications(daysToKeepRead: number = 30, daysToKeepUnread: number = 90) {
    try {
      // Eliminar notificaciones leídas antiguas
      const readCutoff = new Date();
      readCutoff.setDate(readCutoff.getDate() - daysToKeepRead);
      
      const { error: readError } = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('read', true)
        .lt('read_at', readCutoff.toISOString());

      if (readError) {
        console.error('Error cleaning up read notifications:', readError);
      }

      // Eliminar notificaciones no leídas muy antiguas
      const unreadCutoff = new Date();
      unreadCutoff.setDate(unreadCutoff.getDate() - daysToKeepUnread);
      
      const { error: unreadError } = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('read', false)
        .lt('created_at', unreadCutoff.toISOString());

      if (unreadError) {
        console.error('Error cleaning up unread notifications:', unreadError);
      }

      console.log('[NotificationService] Cleanup completed');
      
    } catch (error) {
      console.error('Error in notification cleanup:', error);
    }
  }
}

// Singleton instance
export const notificationService = new NotificationService();
