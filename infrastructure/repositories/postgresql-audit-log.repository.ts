// Implementación del repositorio de logs de auditoría con PostgreSQL
import type { IAuditLogRepository } from "../../domain/audit/audit-log.repository.interface"
import { AuditLog, type AuditAction } from "../../domain/audit/audit-log.entity"

export class PostgreSQLAuditLogRepository implements IAuditLogRepository {
  constructor() {
    console.log('🔍 [PostgreSQL Audit] Repository initialized');
  }

  async save(auditLog: AuditLog): Promise<void> {
    try {
      console.log(`📝 [PostgreSQL Audit] Saving audit log: ${auditLog.action} for document ${auditLog.documentId}`);
      
      // Por ahora usamos logs mock mientras configuramos PostgreSQL completamente
      const auditData = {
        log_id: auditLog.logId,
        document_id: auditLog.documentId,
        user_id: auditLog.userId,
        action: auditLog.action,
        timestamp: auditLog.timestamp,
        details: auditLog.details,
      };

      // TODO: Implementar conexión real a PostgreSQL cuando esté disponible
      console.log(`✅ [PostgreSQL Audit] Mock audit log saved:`, auditData);
    } catch (error) {
      console.error(`❌ [PostgreSQL Audit] Error saving audit log:`, error);
      throw new Error(`Error saving audit log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByDocumentId(documentId: string): Promise<AuditLog[]> {
    try {
      console.log(`🔍 [PostgreSQL Audit] Finding audit logs for document: ${documentId}`);
      
      // Mock data mientras configuramos PostgreSQL
      const mockAuditLogs = [
        new AuditLog(
          `audit-${Date.now()}`,
          documentId,
          'system',
          'document_created' as AuditAction,
          new Date(),
          { action: 'Document created', source: 'postgresql_mock' }
        )
      ];

      console.log(`✅ [PostgreSQL Audit] Found ${mockAuditLogs.length} audit logs for document ${documentId}`);
      return mockAuditLogs;
    } catch (error) {
      console.error(`❌ [PostgreSQL Audit] Error finding audit logs:`, error);
      throw new Error(`Error finding audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByUserId(userId: string): Promise<AuditLog[]> {
    try {
      console.log(`🔍 [PostgreSQL Audit] Finding audit logs for user: ${userId}`);
      
      // Mock data mientras configuramos PostgreSQL
      const mockAuditLogs = [
        new AuditLog(
          `audit-user-${Date.now()}`,
          'mock-document-id',
          userId,
          'user_login' as AuditAction,
          new Date(),
          { action: 'User logged in', source: 'postgresql_mock' }
        )
      ];

      console.log(`✅ [PostgreSQL Audit] Found ${mockAuditLogs.length} audit logs for user ${userId}`);
      return mockAuditLogs;
    } catch (error) {
      console.error(`❌ [PostgreSQL Audit] Error finding audit logs by user:`, error);
      throw new Error(`Error finding audit logs by user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findAll(): Promise<AuditLog[]> {
    try {
      console.log(`🔍 [PostgreSQL Audit] Finding all audit logs`);
      
      // Mock data mientras configuramos PostgreSQL
      const mockAuditLogs = [
        new AuditLog(
          `audit-all-${Date.now()}`,
          'mock-document-1',
          'system',
          'system_startup' as AuditAction,
          new Date(),
          { action: 'System startup', source: 'postgresql_mock' }
        )
      ];

      console.log(`✅ [PostgreSQL Audit] Found ${mockAuditLogs.length} total audit logs`);
      return mockAuditLogs;
    } catch (error) {
      console.error(`❌ [PostgreSQL Audit] Error finding all audit logs:`, error);
      throw new Error(`Error finding all audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 