// Interfaz del repositorio de audit logs
import type { AuditLog } from "./audit-log.entity";

export interface IAuditLogRepository {
  save(auditLog: AuditLog): Promise<void>;
  findByDocumentId(documentId: string): Promise<AuditLog[]>;
  findByUserId(userId: string): Promise<AuditLog[]>;
  findAll(): Promise<AuditLog[]>;
} 