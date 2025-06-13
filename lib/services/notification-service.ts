import pgClient from '@/lib/postgresql-client'
import { emailService } from './email-service'

export interface NotificationData {
  userId: string
  title: string
  message: string
  type: 'success' | 'info' | 'warning' | 'error'
  actionUrl?: string
  metadata?: any
}

export interface EmailNotificationData {
  email: string
  name?: string
  documentType?: string
  documentNumber?: string
  documentId?: string
  status?: string
  timestamp?: string
}

export class NotificationService {
  
  /**
   * Crear notificación en base de datos
   */
  async createNotification(data: NotificationData): Promise<boolean> {
    try {
      const { error } = await pgClient.query(
        `INSERT INTO provider_notifications (
          provider_user_id, 
          title, 
          message, 
          type, 
          action_url,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          data.userId,
          data.title,
          data.message,
          data.type,
          data.actionUrl || null
        ]
      )

      if (error) {
        console.error('❌ [NotificationService] Error creating notification:', error)
        return false
      }

      console.log('✅ [NotificationService] Notification created successfully')
      return true

    } catch (error) {
      console.error('❌ [NotificationService] Error creating notification:', error)
      return false
    }
  }

  /**
   * Obtener información del usuario proveedor para notificaciones
   */
  async getProviderUserInfo(userId: string): Promise<{
    email: string
    name: string
    companyName: string
    providerName: string
  } | null> {
    try {
      const { data, error } = await pgClient.query(`
        SELECT 
          pu.email,
          pu.name,
          pu.company_name,
          s.name as provider_name
        FROM provider_users pu
        LEFT JOIN suppliers s ON pu.supplier_id = s.supplier_id
        WHERE pu.id = $1 AND pu.active = true
      `, [userId])

      if (error || !data || data.length === 0) {
        console.error('❌ [NotificationService] Provider user not found:', userId)
        return null
      }

      const user = data[0]
      return {
        email: user.email,
        name: user.name || user.email,
        companyName: user.company_name || user.provider_name,
        providerName: user.provider_name || user.company_name
      }

    } catch (error) {
      console.error('❌ [NotificationService] Error getting user info:', error)
      return null
    }
  }

  /**
   * Notificación de documento subido
   */
  async notifyDocumentUploaded(data: {
    userId: string
    documentId: string
    documentType: string
    documentNumber: string
    uploadTimestamp: string
  }): Promise<void> {
    try {
      // Crear notificación en base de datos
      await this.createNotification({
        userId: data.userId,
        title: 'Documento subido exitosamente',
        message: `Tu documento "${data.documentType} - ${data.documentNumber}" ha sido recibido y está siendo procesado.`,
        type: 'success',
        actionUrl: `/portal/documents/${data.documentId}`
      })

      // Obtener información del usuario para email
      const userInfo = await this.getProviderUserInfo(data.userId)
      if (!userInfo) return

      // Enviar email
      const template = emailService.getDocumentUploadedTemplate({
        providerName: userInfo.providerName,
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        uploadTimestamp: data.uploadTimestamp
      })

      await emailService.sendEmail(
        { email: userInfo.email, name: userInfo.name },
        template
      )

      console.log('✅ [NotificationService] Document uploaded notification sent')

    } catch (error) {
      console.error('❌ [NotificationService] Error sending document uploaded notification:', error)
    }
  }

  /**
   * Notificación de documento procesado
   */
  async notifyDocumentProcessed(data: {
    userId: string
    documentId: string
    documentType: string
    documentNumber: string
    status: string
    processedTimestamp: string
  }): Promise<void> {
    try {
      const isSuccess = data.status === 'completed' || data.status === 'processed'
      const notificationType = isSuccess ? 'success' : 'error'
      
      // Crear notificación en base de datos
      await this.createNotification({
        userId: data.userId,
        title: isSuccess ? 'Documento procesado exitosamente' : 'Error procesando documento',
        message: isSuccess 
          ? `Tu documento "${data.documentType} - ${data.documentNumber}" ha sido procesado correctamente.`
          : `Ha ocurrido un error al procesar tu documento "${data.documentType} - ${data.documentNumber}".`,
        type: notificationType,
        actionUrl: `/portal/documents/${data.documentId}`
      })

      // Obtener información del usuario para email
      const userInfo = await this.getProviderUserInfo(data.userId)
      if (!userInfo) return

      // Enviar email
      const template = emailService.getDocumentProcessedTemplate({
        providerName: userInfo.providerName,
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        status: data.status,
        processedTimestamp: data.processedTimestamp,
        documentId: data.documentId
      })

      await emailService.sendEmail(
        { email: userInfo.email, name: userInfo.name },
        template
      )

      console.log('✅ [NotificationService] Document processed notification sent')

    } catch (error) {
      console.error('❌ [NotificationService] Error sending document processed notification:', error)
    }
  }

  /**
   * Enviar resumen semanal a todos los proveedores activos
   */
  async sendWeeklyReports(): Promise<void> {
    try {
      console.log('📊 [NotificationService] Starting weekly reports generation')

      // Obtener todos los usuarios proveedores activos
      const { data: users, error: usersError } = await pgClient.query(`
        SELECT 
          pu.id,
          pu.email,
          pu.name,
          pu.company_name,
          s.name as provider_name,
          s.supplier_id
        FROM provider_users pu
        LEFT JOIN suppliers s ON pu.supplier_id = s.supplier_id
        WHERE pu.active = true
      `)

      if (usersError || !users) {
        console.error('❌ [NotificationService] Error getting users for weekly reports:', usersError)
        return
      }

      // Fechas de la semana pasada
      const weekEnd = new Date()
      const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000)

      for (const user of users) {
        await this.generateWeeklyReportForUser(user, weekStart, weekEnd)
      }

      console.log('✅ [NotificationService] Weekly reports sent successfully')

    } catch (error) {
      console.error('❌ [NotificationService] Error sending weekly reports:', error)
    }
  }

  private async generateWeeklyReportForUser(user: any, weekStart: Date, weekEnd: Date): Promise<void> {
    try {
      // Obtener documentos de la semana
      const { data: documents, error: docsError } = await pgClient.query(`
        SELECT 
          job_id,
          document_type,
          status,
          upload_timestamp,
          processed_json
        FROM document_processing 
        WHERE upload_timestamp >= $1 
        AND upload_timestamp <= $2
        AND (
          processed_json->>'supplier'->>'id' = $3
          OR processed_json->>'supplier'->>'name' ILIKE $4
        )
        ORDER BY upload_timestamp DESC
      `, [
        weekStart.toISOString(),
        weekEnd.toISOString(),
        user.supplier_id,
        `%${user.provider_name}%`
      ])

      if (docsError) {
        console.error('❌ [NotificationService] Error getting documents for weekly report:', docsError)
        return
      }

      const documentsData = documents || []
      
      // Calcular estadísticas
      const totalDocuments = documentsData.length
      const processedDocuments = documentsData.filter(d => d.status === 'completed' || d.status === 'processed').length
      const pendingDocuments = documentsData.filter(d => d.status === 'pending' || d.status === 'processing').length
      const errorDocuments = documentsData.filter(d => d.status === 'error').length

      // Solo enviar si hay actividad
      if (totalDocuments === 0) {
        console.log(`ℹ️ [NotificationService] No activity for user ${user.email}, skipping weekly report`)
        return
      }

      // Preparar datos para el template
      const reportData = {
        providerName: user.provider_name || user.company_name || user.name,
        weekStart: weekStart.toLocaleDateString('es-ES'),
        weekEnd: weekEnd.toLocaleDateString('es-ES'),
        totalDocuments,
        processedDocuments,
        pendingDocuments,
        errorDocuments,
        documents: documentsData.slice(0, 10).map(doc => ({
          id: doc.job_id,
          type: doc.document_type,
          number: doc.processed_json?.document_number || 'N/A',
          status: doc.status,
          uploadDate: doc.upload_timestamp
        }))
      }

      // Generar y enviar email
      const template = emailService.getWeeklyReportTemplate(reportData)
      
      await emailService.sendEmail(
        { email: user.email, name: user.name || user.email },
        template
      )

      // Crear notificación en base de datos
      await this.createNotification({
        userId: user.id,
        title: '📊 Resumen semanal disponible',
        message: `Tu resumen semanal de documentos ha sido enviado. Se procesaron ${processedDocuments} de ${totalDocuments} documentos.`,
        type: 'info'
      })

      console.log(`✅ [NotificationService] Weekly report sent to ${user.email}`)

    } catch (error) {
      console.error('❌ [NotificationService] Error generating weekly report for user:', error)
    }
  }

  /**
   * Notificación de bienvenida para nuevos usuarios
   */
  async notifyWelcomeUser(userId: string): Promise<void> {
    try {
      const userInfo = await this.getProviderUserInfo(userId)
      if (!userInfo) return

      // Crear notificación en base de datos
      await this.createNotification({
        userId: userId,
        title: '🎉 ¡Bienvenido al Portal de Proveedores!',
        message: `Hola ${userInfo.name}, tu cuenta ha sido activada. Ya puedes subir y gestionar tus documentos.`,
        type: 'success',
        actionUrl: '/portal/upload'
      })

      console.log('✅ [NotificationService] Welcome notification sent')

    } catch (error) {
      console.error('❌ [NotificationService] Error sending welcome notification:', error)
    }
  }

  /**
   * Limpiar notificaciones antiguas (más de 90 días)
   */
  async cleanupOldNotifications(): Promise<void> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - 90)

      const { error } = await pgClient.query(
        'DELETE FROM provider_notifications WHERE created_at < $1',
        [cutoffDate.toISOString()]
      )

      if (error) {
        console.error('❌ [NotificationService] Error cleaning up notifications:', error)
        return
      }

      console.log('✅ [NotificationService] Old notifications cleaned up successfully')

    } catch (error) {
      console.error('❌ [NotificationService] Error cleaning up notifications:', error)
    }
  }
}

// Instancia singleton del servicio de notificaciones
export const notificationService = new NotificationService()