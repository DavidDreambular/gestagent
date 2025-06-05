// Implementación del repositorio de documentos con Supabase
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { IDocumentRepository } from "../../domain/document/document.repository.interface"
import { Document, type DocumentStatus } from "../../domain/document/document.entity"

export class SupabaseDocumentRepository implements IDocumentRepository {
  private client: SupabaseClient

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.client = createClient(supabaseUrl, supabaseKey)
  }

  async findById(jobId: string): Promise<Document | null> {
    const { data, error } = await this.client.from("documents").select("*").eq("job_id", jobId).single()

    if (error || !data) {
      return null
    }

    return this.mapToEntity(data)
  }

  // Método que faltaba - alias para findById para compatibilidad
  async findByJobId(jobId: string): Promise<Document | null> {
    return this.findById(jobId)
  }

  async save(document: Document): Promise<void> {
    const documentData = {
      job_id: document.jobId,
      document_type: document.documentType,
      raw_text: document.getRawText(),
      processed_json: document.getProcessedData(),
      upload_timestamp: document.uploadTimestamp,
      status: document.getStatus(),
      version: document.version,
      user_id: document.userId,
      file_name: document.fileName,
      metadata: document.metadata,
      emitter_name: document.emitterName,
      receiver_name: document.receiverName,
      document_date: document.documentDate,
      updated_at: new Date().toISOString()
    }

    const { error } = await this.client.from("documents").upsert(documentData, { onConflict: "job_id" })

    if (error) {
      throw new Error(`Error saving document: ${error.message}`)
    }
  }

  async findByUserId(userId: string): Promise<Document[]> {
    const { data, error } = await this.client
      .from("documents")
      .select("*")
      .eq("user_id", userId)
      .neq("status", "DELETED") // Excluir documentos eliminados
      .order("upload_timestamp", { ascending: false })

    if (error) {
      throw new Error(`Error finding documents by user ID: ${error.message}`)
    }

    return (data || []).map(this.mapToEntity)
  }

  async findAll(): Promise<Document[]> {
    const { data, error } = await this.client
      .from("documents")
      .select("*")
      .neq("status", "DELETED") // Excluir documentos eliminados
      .order("upload_timestamp", { ascending: false })

    if (error) {
      throw new Error(`Error finding all documents: ${error.message}`)
    }

    return (data || []).map(this.mapToEntity)
  }

  async delete(jobId: string): Promise<void> {
    const { error } = await this.client
      .from("documents")
      .delete()
      .eq("job_id", jobId)

    if (error) {
      throw new Error(`Error deleting document: ${error.message}`)
    }
  }

  private mapToEntity(data: any): Document {
    return new Document(
      data.job_id,
      data.document_type,
      data.raw_text || "",
      data.processed_json || {},
      new Date(data.upload_timestamp),
      data.status as DocumentStatus,
      data.version || 1,
      data.user_id,
      data.file_name,
      data.metadata || {},
      data.emitter_name,
      data.receiver_name,
      data.document_date
    )
  }
}

