import { pool } from '@/lib/postgresql-client';
import { NextRequest } from 'next/server';

/**
 * Tipos de acciones para auditoría
 */
export enum AuditAction {
  // Autenticación
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  REGISTER = 'REGISTER',
  
  // CRUD Operations
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  
  // Document Operations
  UPLOAD = 'UPLOAD',
  DOWNLOAD = 'DOWNLOAD',
  PROCESS = 'PROCESS',
  EXPORT = 'EXPORT',
  
  // System Operations
  BACKUP = 'BACKUP',
  RESTORE = 'RESTORE',
  MIGRATE = 'MIGRATE',
  
  // Admin Operations
  USER_ROLE_CHANGE = 'USER_ROLE_CHANGE',
  SETTINGS_CHANGE = 'SETTINGS_CHANGE',
  SYSTEM_CONFIG = 'SYSTEM_CONFIG'
}

/**
 * Tipos de entidades para auditoría
 */
export enum AuditEntityType {
  USERS = 'users',
  DOCUMENTS = 'documents',
  SUPPLIERS = 'suppliers',
  CUSTOMERS = 'customers',
  AUTH = 'auth',
  SYSTEM = 'system',
  SETTINGS = 'settings',
  BACKUP = 'backup'
}

/**
 * Interface para datos de auditoría
 */
export interface AuditLogData {
  userId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

/**
 * Interface para contexto de request
 */
export interface RequestContext {
  req?: NextRequest;
  userId?: string;
  sessionId?: string;
  requestId?: string;
}

/**
 * Servicio de Auditoría
 * Centraliza el logging de todas las acciones del sistema
 */
export class AuditService {
  
  /**
   * Registra una acción de auditoría
   */
  static async logAction(data: AuditLogData): Promise<string | null> {
    try {
      // Try to use PostgreSQL function first
      const result = await pool.query(`
        SELECT log_audit_action(
          $1::UUID,
          $2,
          $3,
          $4,
          $5::jsonb,
          $6::jsonb,
          $7::inet,
          $8,
          $9,
          $10,
          $11::jsonb
        ) as audit_id
      `, [
        data.userId,
        data.action,
        data.entityType,
        data.entityId || null,
        data.oldValues ? JSON.stringify(data.oldValues) : null,
        data.newValues ? JSON.stringify(data.newValues) : null,
        data.ipAddress || null,
        data.userAgent || null,
        data.sessionId || null,
        data.requestId || null,
        data.metadata ? JSON.stringify(data.metadata) : '{}'
      ]);
      
      return result.rows[0]?.audit_id || null;
    } catch (error) {
      // No fallar la operación principal si falla la auditoría
      console.error('Error logging audit action:', error);
      return null;
    }
  }

  /**
   * Registra una acción desde un NextRequest
   */
  static async logFromRequest(
    req: NextRequest,
    data: Omit<AuditLogData, 'ipAddress' | 'userAgent' | 'requestId'>
  ): Promise<string | null> {
    const ipAddress = this.getClientIP(req);
    const userAgent = req.headers.get('user-agent') || undefined;
    const requestId = req.headers.get('x-request-id') || this.generateRequestId();

    return this.logAction({
      ...data,
      ipAddress,
      userAgent,
      requestId
    });
  }

  /**
   * Registra login de usuario
   */
  static async logLogin(userId: string, context?: RequestContext): Promise<string | null> {
    return this.logAction({
      userId,
      action: AuditAction.LOGIN,
      entityType: AuditEntityType.AUTH,
      entityId: userId,
      ipAddress: context?.req ? this.getClientIP(context.req) : undefined,
      userAgent: context?.req?.headers.get('user-agent') || undefined,
      sessionId: context?.sessionId,
      requestId: context?.requestId,
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'auth_system'
      }
    });
  }

  /**
   * Registra logout de usuario
   */
  static async logLogout(userId: string, context?: RequestContext): Promise<string | null> {
    return this.logAction({
      userId,
      action: AuditAction.LOGOUT,
      entityType: AuditEntityType.AUTH,
      entityId: userId,
      ipAddress: context?.req ? this.getClientIP(context.req) : undefined,
      userAgent: context?.req?.headers.get('user-agent') || undefined,
      sessionId: context?.sessionId,
      requestId: context?.requestId,
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'auth_system'
      }
    });
  }

  /**
   * Registra creación de documento
   */
  static async logDocumentCreate(
    userId: string,
    documentId: string,
    documentData: any,
    context?: RequestContext
  ): Promise<string | null> {
    return this.logAction({
      userId,
      action: AuditAction.CREATE,
      entityType: AuditEntityType.DOCUMENTS,
      entityId: documentId,
      newValues: documentData,
      ipAddress: context?.req ? this.getClientIP(context.req) : undefined,
      userAgent: context?.req?.headers.get('user-agent') || undefined,
      sessionId: context?.sessionId,
      requestId: context?.requestId,
      metadata: {
        documentType: documentData?.document_type,
        fileName: documentData?.title,
        fileSize: documentData?.file_size,
        source: 'document_upload'
      }
    });
  }

  /**
   * Registra actualización de documento
   */
  static async logDocumentUpdate(
    userId: string,
    documentId: string,
    oldData: any,
    newData: any,
    context?: RequestContext
  ): Promise<string | null> {
    return this.logAction({
      userId,
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.DOCUMENTS,
      entityId: documentId,
      oldValues: oldData,
      newValues: newData,
      ipAddress: context?.req ? this.getClientIP(context.req) : undefined,
      userAgent: context?.req?.headers.get('user-agent') || undefined,
      sessionId: context?.sessionId,
      requestId: context?.requestId,
      metadata: {
        fieldsChanged: this.getChangedFields(oldData, newData),
        source: 'document_edit'
      }
    });
  }

  /**
   * Registra eliminación de documento
   */
  static async logDocumentDelete(
    userId: string,
    documentId: string,
    documentData: any,
    context?: RequestContext
  ): Promise<string | null> {
    return this.logAction({
      userId,
      action: AuditAction.DELETE,
      entityType: AuditEntityType.DOCUMENTS,
      entityId: documentId,
      oldValues: documentData,
      ipAddress: context?.req ? this.getClientIP(context.req) : undefined,
      userAgent: context?.req?.headers.get('user-agent') || undefined,
      sessionId: context?.sessionId,
      requestId: context?.requestId,
      metadata: {
        documentType: documentData?.document_type,
        fileName: documentData?.title,
        source: 'document_delete'
      }
    });
  }

  /**
   * Registra cambio de rol de usuario
   */
  static async logUserRoleChange(
    adminUserId: string,
    targetUserId: string,
    oldRole: string,
    newRole: string,
    context?: RequestContext
  ): Promise<string | null> {
    return this.logAction({
      userId: adminUserId,
      action: AuditAction.USER_ROLE_CHANGE,
      entityType: AuditEntityType.USERS,
      entityId: targetUserId,
      oldValues: { role: oldRole },
      newValues: { role: newRole },
      ipAddress: context?.req ? this.getClientIP(context.req) : undefined,
      userAgent: context?.req?.headers.get('user-agent') || undefined,
      sessionId: context?.sessionId,
      requestId: context?.requestId,
      metadata: {
        targetUser: targetUserId,
        action: 'role_change',
        source: 'admin_panel'
      }
    });
  }

  /**
   * Obtiene logs de auditoría con filtros
   */
  static async getLogs(filters: {
    userId?: string;
    action?: AuditAction;
    entityType?: AuditEntityType;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}) {
    const {
      userId,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
      limit = 50,
      offset = 0
    } = filters;

    let query = `
      SELECT * FROM audit_logs_view
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;

    if (userId) {
      query += ` AND user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    if (action) {
      query += ` AND action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }

    if (entityType) {
      query += ` AND entity_type = $${paramIndex}`;
      params.push(entityType);
      paramIndex++;
    }

    if (entityId) {
      query += ` AND entity_id = $${paramIndex}`;
      params.push(entityId);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    try {
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting audit logs:', error);
      throw error;
    }
  }

  /**
   * Limpia logs antiguos
   */
  static async cleanupOldLogs(retentionDays: number = 365): Promise<number> {
    try {
      const result = await pool.query(
        'SELECT cleanup_old_audit_logs($1) as deleted_count',
        [retentionDays]
      );
      return result.rows[0]?.deleted_count || 0;
    } catch (error) {
      console.error('Error cleaning up audit logs:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de auditoría
   */
  static async getStats(period: 'day' | 'week' | 'month' = 'day') {
    const interval = period === 'day' ? '24 hours' : 
                    period === 'week' ? '7 days' : '30 days';

    try {
      const result = await pool.query(`
        SELECT 
          action,
          entity_type,
          COUNT(*) as count,
          COUNT(DISTINCT user_id) as unique_users
        FROM audit_logs 
        WHERE created_at >= NOW() - INTERVAL '${interval}'
        GROUP BY action, entity_type
        ORDER BY count DESC
      `);
      
      return result.rows;
    } catch (error) {
      console.error('Error getting audit stats:', error);
      throw error;
    }
  }

  // Métodos auxiliares privados

  /**
   * Obtiene la IP del cliente desde el request
   */
  private static getClientIP(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for');
    const realIP = req.headers.get('x-real-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP;
    }
    
    return req.ip || '127.0.0.1';
  }

  /**
   * Genera un ID único para el request
   */
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtiene los campos que cambiaron entre dos objetos
   */
  private static getChangedFields(oldData: any, newData: any): string[] {
    const changed: string[] = [];
    
    if (!oldData || !newData) return changed;
    
    Object.keys(newData).forEach(key => {
      if (oldData[key] !== newData[key]) {
        changed.push(key);
      }
    });
    
    return changed;
  }
}

// Export por defecto
export default AuditService; 