/**
 * Servicio Unificado de Notificaciones
 * Maneja todas las notificaciones del sistema usando PostgreSQL
 */

import { PostgreSQLClient } from '@/lib/postgresql-client';

export type NotificationType = 
  | 'document_uploaded'
  | 'document_processed'
  | 'document_error'
  | 'document_shared'
  | 'export_completed'
  | 'supplier_created'
  | 'customer_created'
  | 'entity_updated'
  | 'system_warning'
  | 'system_error'
  | 'system_info';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  read_at?: string;
  metadata?: Record<string, any>;
}

export interface NotificationCreateData {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

class UnifiedNotificationService {
  private pgClient: PostgreSQLClient;

  constructor() {
    this.pgClient = new PostgreSQLClient();
  }

  /**
   * Envía una notificación (la guarda en la base de datos)
   */
  async send(data: NotificationCreateData): Promise<string | null> {
    try {
      console.log(`📬 [Notifications] Enviando notificación: ${data.type} para usuario ${data.user_id}`);
      
      const result = await this.pgClient.query(
        `INSERT INTO notifications (user_id, type, title, message, metadata)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [
          data.user_id,
          data.type,
          data.title,
          data.message,
          JSON.stringify(data.metadata || {})
        ]
      );

      if (result.error || !result.data?.length) {
        console.error('❌ [Notifications] Error guardando notificación:', result.error);
        return null;
      }

      const notificationId = result.data[0].id;
      console.log(`✅ [Notifications] Notificación creada: ${notificationId}`);
      return notificationId;
    } catch (error) {
      console.error('❌ [Notifications] Error en send:', error);
      return null;
    }
  }

  /**
   * Obtiene notificaciones de un usuario
   */
  async getUserNotifications(
    userId: string, 
    options: { 
      limit?: number; 
      unreadOnly?: boolean; 
      type?: NotificationType 
    } = {}
  ): Promise<Notification[]> {
    try {
      const { limit = 50, unreadOnly = false, type } = options;
      
      let whereClause = 'WHERE user_id = $1';
      const params: any[] = [userId];
      let paramIndex = 2;

      if (unreadOnly) {
        whereClause += ` AND read = false`;
      }

      if (type) {
        whereClause += ` AND type = $${paramIndex}`;
        params.push(type);
        paramIndex++;
      }

      const result = await this.pgClient.query<Notification>(
        `SELECT * FROM notifications 
         ${whereClause}
         ORDER BY created_at DESC 
         LIMIT $${paramIndex}`,
        [...params, limit]
      );

      if (result.error) {
        console.error('❌ [Notifications] Error obteniendo notificaciones:', result.error);
        return [];
      }

      return result.data || [];
    } catch (error) {
      console.error('❌ [Notifications] Error en getUserNotifications:', error);
      return [];
    }
  }

  /**
   * Obtiene el conteo de notificaciones no leídas
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const result = await this.pgClient.query<{count: number}>(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false',
        [userId]
      );

      if (result.error || !result.data?.length) {
        return 0;
      }

      return parseInt(result.data[0].count.toString()) || 0;
    } catch (error) {
      console.error('❌ [Notifications] Error en getUnreadCount:', error);
      return 0;
    }
  }

  /**
   * Marca una notificación como leída
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const result = await this.pgClient.query(
        'UPDATE notifications SET read = true, read_at = CURRENT_TIMESTAMP WHERE id = $1',
        [notificationId]
      );

      return !result.error;
    } catch (error) {
      console.error('❌ [Notifications] Error en markAsRead:', error);
      return false;
    }
  }

  /**
   * Marca todas las notificaciones de un usuario como leídas
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const result = await this.pgClient.query(
        'UPDATE notifications SET read = true, read_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND read = false',
        [userId]
      );

      return !result.error;
    } catch (error) {
      console.error('❌ [Notifications] Error en markAllAsRead:', error);
      return false;
    }
  }

  /**
   * Elimina una notificación
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const result = await this.pgClient.query(
        'DELETE FROM notifications WHERE id = $1',
        [notificationId]
      );

      return !result.error;
    } catch (error) {
      console.error('❌ [Notifications] Error en deleteNotification:', error);
      return false;
    }
  }

  // Métodos específicos para tipos de notificaciones

  /**
   * Notifica cuando se sube un documento
   */
  async notifyDocumentUploaded(userId: string, filename: string, jobId: string): Promise<string | null> {
    return this.send({
      user_id: userId,
      type: 'document_uploaded',
      title: 'Documento recibido',
      message: `El documento "${filename}" ha sido recibido y está siendo procesado.`,
      metadata: { filename, jobId, category: 'document' }
    });
  }

  /**
   * Notifica cuando se procesa exitosamente un documento
   */
  async notifyDocumentProcessed(
    userId: string, 
    filename: string, 
    jobId: string, 
    invoicesDetected: number
  ): Promise<string | null> {
    return this.send({
      user_id: userId,
      type: 'document_processed',
      title: 'Documento procesado exitosamente',
      message: `"${filename}" ha sido procesado. Se detectaron ${invoicesDetected} facturas.`,
      metadata: { filename, jobId, invoicesDetected, category: 'document' }
    });
  }

  /**
   * Notifica errores en el procesamiento de documentos
   */
  async notifyDocumentError(userId: string, filename: string, error: string): Promise<string | null> {
    return this.send({
      user_id: userId,
      type: 'document_error',
      title: 'Error al procesar documento',
      message: `Error procesando "${filename}": ${error}`,
      metadata: { filename, error, category: 'document' }
    });
  }

  /**
   * Notifica cuando se crea un nuevo proveedor
   */
  async notifySupplierCreated(
    userId: string, 
    supplierName: string, 
    supplierId: string,
    source?: string
  ): Promise<string | null> {
    const message = source 
      ? `Se ha registrado un nuevo proveedor: "${supplierName}" desde ${source}`
      : `Se ha registrado un nuevo proveedor: "${supplierName}"`;
      
    return this.send({
      user_id: userId,
      type: 'supplier_created',
      title: 'Nuevo proveedor detectado',
      message,
      metadata: { supplierName, supplierId, source: source || 'unknown', category: 'entity' }
    });
  }

  /**
   * Notifica cuando se crea un nuevo cliente
   */
  async notifyCustomerCreated(
    userId: string, 
    customerName: string, 
    customerId: string,
    source?: string
  ): Promise<string | null> {
    const message = source 
      ? `Se ha registrado un nuevo cliente: "${customerName}" desde ${source}`
      : `Se ha registrado un nuevo cliente: "${customerName}"`;
      
    return this.send({
      user_id: userId,
      type: 'customer_created',
      title: 'Nuevo cliente detectado',
      message,
      metadata: { customerName, customerId, source: source || 'unknown', category: 'entity' }
    });
  }

  /**
   * Notifica cuando se completa una exportación
   */
  async notifyExportCompleted(
    userId: string, 
    exportType: string, 
    filename: string
  ): Promise<string | null> {
    return this.send({
      user_id: userId,
      type: 'export_completed',
      title: 'Exportación completada',
      message: `Tu exportación de ${exportType} está lista: "${filename}"`,
      metadata: { exportType, filename, category: 'export' }
    });
  }

  /**
   * Notifica advertencias del sistema
   */
  async notifySystemWarning(userId: string, title: string, message: string): Promise<string | null> {
    return this.send({
      user_id: userId,
      type: 'system_warning',
      title,
      message,
      metadata: { category: 'system' }
    });
  }

  /**
   * Notifica cuando se actualiza una entidad (proveedor o cliente)
   */
  async notifyEntityUpdated(
    userId: string, 
    entityType: 'supplier' | 'customer',
    entityName: string, 
    entityId: string,
    changes: string,
    source?: string
  ): Promise<string | null> {
    const entityTypeSpanish = entityType === 'supplier' ? 'proveedor' : 'cliente';
    
    return this.send({
      user_id: userId,
      type: 'entity_updated',
      title: `${entityTypeSpanish.charAt(0).toUpperCase() + entityTypeSpanish.slice(1)} actualizado`,
      message: `Se ha actualizado la información de ${entityTypeSpanish} "${entityName}": ${changes}`,
      metadata: { 
        entityType, 
        entityName, 
        entityId, 
        changes, 
        source: source || 'automatic',
        category: 'entity' 
      }
    });
  }
}

// Exportar instancia singleton
export const unifiedNotificationService = new UnifiedNotificationService();
export default unifiedNotificationService;