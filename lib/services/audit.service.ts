import { PostgreSQLClient } from '@/lib/postgresql-client'

export interface AuditAction {
  action: string
  entityType: string
  entityId?: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  userId?: string
  ipAddress?: string
  userAgent?: string
  details?: Record<string, any>
}

export class AuditService {
  /**
   * Registra una acción en el log de auditoría
   */
  static async logAction(auditData: AuditAction): Promise<void> {
    try {
      const pgClient = new PostgreSQLClient()
      
      // Insertar usando la estructura actual de la tabla audit_logs
      const result = await pgClient.query(
        `INSERT INTO audit_logs (user_id, action, details) 
         VALUES ($1, $2, $3)`,
        [
          auditData.userId || null,
          auditData.action,
          JSON.stringify({
            entity_type: auditData.entityType,
            entity_id: auditData.entityId,
            old_values: auditData.oldValues,
            new_values: auditData.newValues,
            ip_address: auditData.ipAddress,
            user_agent: auditData.userAgent,
            ...auditData.details
          })
        ]
      )

      if (result.error) {
        console.error('Error al registrar auditoría:', result.error)
      }
    } catch (error) {
      console.error('Error en servicio de auditoría:', error)
    }
  }

  /**
   * Registra el login de un usuario
   */
  static async logUserLogin(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logAction({
      action: 'user_login',
      entityType: 'user',
      entityId: userId,
      userId,
      ipAddress,
      userAgent
    })
  }

  /**
   * Registra el logout de un usuario
   */
  static async logUserLogout(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logAction({
      action: 'user_logout',
      entityType: 'user',
      entityId: userId,
      userId,
      ipAddress,
      userAgent
    })
  }

  /**
   * Registra la creación de un documento
   */
  static async logDocumentCreated(
    documentId: string, 
    userId: string, 
    documentData: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAction({
      action: 'document_created',
      entityType: 'document',
      entityId: documentId,
      userId,
      newValues: documentData,
      ipAddress,
      userAgent
    })
  }

  /**
   * Registra la actualización de un documento
   */
  static async logDocumentUpdated(
    documentId: string,
    userId: string,
    oldData: any,
    newData: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAction({
      action: 'document_updated',
      entityType: 'document',
      entityId: documentId,
      userId,
      oldValues: oldData,
      newValues: newData,
      ipAddress,
      userAgent
    })
  }

  /**
   * Registra la eliminación de un documento
   */
  static async logDocumentDeleted(
    documentId: string,
    userId: string,
    documentData: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAction({
      action: 'document_deleted',
      entityType: 'document',
      entityId: documentId,
      userId,
      oldValues: documentData,
      ipAddress,
      userAgent
    })
  }

  /**
   * Registra la exportación de documentos
   */
  static async logDocumentExported(
    documentIds: string[],
    userId: string,
    exportFormat: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAction({
      action: 'documents_exported',
      entityType: 'document',
      userId,
      details: {
        document_ids: documentIds,
        export_format: exportFormat,
        document_count: documentIds.length
      },
      ipAddress,
      userAgent
    })
  }

  /**
   * Registra cambios en la configuración
   */
  static async logConfigurationChanged(
    configSection: string,
    userId: string,
    oldConfig: any,
    newConfig: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAction({
      action: 'configuration_changed',
      entityType: 'configuration',
      entityId: configSection,
      userId,
      oldValues: oldConfig,
      newValues: newConfig,
      ipAddress,
      userAgent
    })
  }

  /**
   * Registra acciones de gestión de usuarios
   */
  static async logUserManagement(
    action: 'user_created' | 'user_updated' | 'user_deleted' | 'user_role_changed',
    targetUserId: string,
    adminUserId: string,
    oldData?: any,
    newData?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAction({
      action,
      entityType: 'user',
      entityId: targetUserId,
      userId: adminUserId,
      oldValues: oldData,
      newValues: newData,
      ipAddress,
      userAgent
    })
  }

  /**
   * Registra errores del sistema
   */
  static async logSystemError(
    errorType: string,
    errorMessage: string,
    userId?: string,
    additionalData?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAction({
      action: 'system_error',
      entityType: 'system',
      userId,
      details: {
        error_type: errorType,
        error_message: errorMessage,
        additional_data: additionalData
      },
      ipAddress,
      userAgent
    })
  }

  /**
   * Obtiene logs de auditoría con filtros
   */
  static async getAuditLogs(filters: {
    userId?: string
    action?: string
    entityType?: string
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
  } = {}) {
    try {
      const pgClient = new PostgreSQLClient()
      
      let query = `
        SELECT 
          log_id,
          user_id,
          action,
          details,
          timestamp
        FROM audit_logs 
        WHERE 1=1
      `
      const params: any[] = []
      let paramCount = 0

      if (filters.userId) {
        paramCount++
        query += ` AND user_id = $${paramCount}`
        params.push(filters.userId)
      }

      if (filters.action) {
        paramCount++
        query += ` AND action = $${paramCount}`
        params.push(filters.action)
      }

      if (filters.startDate) {
        paramCount++
        query += ` AND timestamp >= $${paramCount}`
        params.push(filters.startDate)
      }

      if (filters.endDate) {
        paramCount++
        query += ` AND timestamp <= $${paramCount}`
        params.push(filters.endDate)
      }

      query += ` ORDER BY timestamp DESC`

      if (filters.limit) {
        paramCount++
        query += ` LIMIT $${paramCount}`
        params.push(filters.limit)
      }

      if (filters.offset) {
        paramCount++
        query += ` OFFSET $${paramCount}`
        params.push(filters.offset)
      }

      const result = await pgClient.query(query, params)
      
      return {
        data: result.data || [],
        error: result.error
      }
    } catch (error) {
      console.error('Error obteniendo logs de auditoría:', error)
      return { data: [], error }
    }
  }

  /**
   * Obtiene estadísticas de auditoría
   */
  static async getAuditStats(userId?: string) {
    try {
      const pgClient = new PostgreSQLClient()
      
      let query = `
        SELECT 
          action,
          COUNT(*) as count
        FROM audit_logs
      `
      const params: any[] = []

      if (userId) {
        query += ` WHERE user_id = $1`
        params.push(userId)
      }

      query += ` GROUP BY action ORDER BY count DESC`

      const result = await pgClient.query(query, params)
      
      return {
        data: result.data || [],
        error: result.error
      }
    } catch (error) {
      console.error('Error obteniendo estadísticas de auditoría:', error)
      return { data: [], error }
    }
  }
}

export default AuditService 