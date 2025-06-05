// Implementación del repositorio de logs de auditoría con Supabase
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { IAuditLogRepository } from "../../domain/audit/audit-log.repository.interface"
import { AuditLog, type AuditAction } from "../../domain/audit/audit-log.entity"

export class SupabaseAuditLogRepository implements IAuditLogRepository {
  private client: SupabaseClient

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.client = createClient(supabaseUrl, supabaseKey)
  }

  async save(auditLog: AuditLog): Promise<void> {
    const auditData = {
      log_id: auditLog.logId,
      document_id: auditLog.documentId,
      user_id: auditLog.userId,
      action: auditLog.action,
      timestamp: auditLog.timestamp,
      details: auditLog.details,
    }

    const { error } = await this.client.from("audit_logs").insert(auditData)

    if (error) {
      throw new Error(`Error saving audit log: ${error.message}`)
    }
  }

  async findByDocumentId(documentId: string): Promise<AuditLog[]> {
    const { data, error } = await this.client
      .from("audit_logs")
      .select("*")
      .eq("document_id", documentId)
      .order("timestamp", { ascending: false })

    if (error) {
      throw new Error(`Error finding audit logs: ${error.message}`)
    }

    return (data || []).map(this.mapToEntity)
  }

  async findByUserId(userId: string): Promise<AuditLog[]> {
    const { data, error } = await this.client
      .from("audit_logs")
      .select("*")
      .eq("user_id", userId)
      .order("timestamp", { ascending: false })

    if (error) {
      throw new Error(`Error finding audit logs by user: ${error.message}`)
    }

    return (data || []).map(this.mapToEntity)
  }

  async findAll(): Promise<AuditLog[]> {
    const { data, error } = await this.client
      .from("audit_logs")
      .select("*")
      .order("timestamp", { ascending: false })

    if (error) {
      throw new Error(`Error finding all audit logs: ${error.message}`)
    }

    return (data || []).map(this.mapToEntity)
  }

  private mapToEntity(data: any): AuditLog {
    return new AuditLog(
      data.log_id,
      data.document_id,
      data.user_id,
      data.action as AuditAction,
      new Date(data.timestamp),
      data.details
    )
  }
}
