import { PostgreSQLClient } from '@/lib/postgresql-client';

const dbClient = new PostgreSQLClient();

export interface CreateAuditLogParams {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  /**
   * Registra una acción en el log de auditoría
   */
  static async logAction(params: CreateAuditLogParams): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📝 [AUDIT] Registrando acción:', params.action, 'en', params.resourceType);

      const result = await dbClient.query(
        `INSERT INTO audit_logs (user_id, action, details) 
         VALUES ($1, $2, $3)`,
        [
          params.userId || null,
          params.action,
          JSON.stringify({
            resource_type: params.resourceType,
            resource_id: params.resourceId,
            ip_address: params.ipAddress,
            user_agent: params.userAgent,
            ...params.details
          })
        ]
      );

      if (result.error) {
        console.error('❌ [AUDIT] Error al insertar log:', result.error);
        return { success: false, error: result.error.message };
      }

      console.log('✅ [AUDIT] Log registrado exitosamente');
      return { success: true };

    } catch (error) {
      console.error('❌ [AUDIT] Error en logAction:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  /**
   * Obtiene logs de auditoría por documento
   */
  static async getDocumentAuditLogs(documentId: string): Promise<{ data: any[] | null; error?: string }> {
    try {
      console.log('🔍 [AUDIT] Obteniendo logs para documento:', documentId);

      const result = await dbClient.query(
        `SELECT * FROM audit_logs 
         WHERE details::text LIKE $1 
         ORDER BY timestamp DESC`,
        [`%"resource_id":"${documentId}"%`]
      );

      if (result.error) {
        console.error('❌ [AUDIT] Error al obtener logs:', result.error);
        return { data: null, error: result.error.message };
      }

      console.log(`✅ [AUDIT] ${result.data?.length || 0} logs encontrados para documento`);
      return { data: result.data || [] };

    } catch (error) {
      console.error('❌ [AUDIT] Error en getDocumentAuditLogs:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  /**
   * Obtiene logs de auditoría por usuario
   */
  static async getUserAuditLogs(userId: string, limit: number = 50): Promise<{ data: any[] | null; error?: string }> {
    try {
      console.log('🔍 [AUDIT] Obteniendo logs para usuario:', userId);

      const result = await dbClient.query(
        `SELECT * FROM audit_logs 
         WHERE user_id = $1 
         ORDER BY timestamp DESC 
         LIMIT $2`,
        [userId, limit]
      );

      if (result.error) {
        console.error('❌ [AUDIT] Error al obtener logs de usuario:', result.error);
        return { data: null, error: result.error.message };
      }

      console.log(`✅ [AUDIT] ${result.data?.length || 0} logs encontrados para usuario`);
      return { data: result.data || [] };

    } catch (error) {
      console.error('❌ [AUDIT] Error en getUserAuditLogs:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  /**
   * Obtiene todos los logs de auditoría recientes
   */
  static async getRecentAuditLogs(limit: number = 100): Promise<{ data: any[] | null; error?: string }> {
    try {
      console.log('🔍 [AUDIT] Obteniendo logs recientes');

      const result = await dbClient.query(
        `SELECT * FROM audit_logs 
         ORDER BY timestamp DESC 
         LIMIT $1`,
        [limit]
      );

      if (result.error) {
        console.error('❌ [AUDIT] Error al obtener logs recientes:', result.error);
        return { data: null, error: result.error.message };
      }

      console.log(`✅ [AUDIT] ${result.data?.length || 0} logs recientes encontrados`);
      return { data: result.data || [] };

    } catch (error) {
      console.error('❌ [AUDIT] Error en getRecentAuditLogs:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  /**
   * Registra un log de creación de documento
   */
  static async logDocumentCreated(params: {
    documentId: string;
    userId?: string;
    documentType: string;
    fileName?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.logAction({
      userId: params.userId,
      action: 'created',
      resourceType: 'document',
      resourceId: params.documentId,
      details: {
        document_type: params.documentType,
        file_name: params.fileName,
        created_at: new Date().toISOString()
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent
    });
  }

  /**
   * Registra un log de actualización de documento
   */
  static async logDocumentUpdated(
    documentId: string,
    userId: string,
    oldData: any,
    newData: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.logAction({
      userId: userId,
      action: 'updated',
      resourceType: 'document',
      resourceId: documentId,
      details: {
        old_data: oldData,
        new_data: newData,
        updated_at: new Date().toISOString()
      },
      ipAddress: ipAddress,
      userAgent: userAgent
    });
  }

  /**
   * Registra un log de eliminación de documento
   */
  static async logDocumentDeleted(params: {
    documentId: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.logAction({
      userId: params.userId,
      action: 'deleted',
      resourceType: 'document',
      resourceId: params.documentId,
      details: {
        deleted_at: new Date().toISOString()
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent
    });
  }
}

export async function quickAuditLog(action: string, resourceType: string, resourceId?: string, userId?: string) {
  return AuditService.logAction({
    action,
    resourceType,
    resourceId,
    userId
  });
}

export default AuditService; 