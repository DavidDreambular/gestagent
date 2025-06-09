// Implementación del repositorio de documentos con PostgreSQL
import type { IDocumentRepository } from "../../domain/document/document.repository.interface"
import { Document, DocumentStatus } from "../../domain/document/document.entity"

export class PostgreSQLDocumentRepository implements IDocumentRepository {
  constructor() {
    console.log('📄 [PostgreSQL Documents] Repository initialized');
  }

  async save(document: Document): Promise<void> {
    try {
      console.log(`📝 [PostgreSQL Documents] Saving document: ${document.jobId}`);
      
      const documentData = {
        job_id: document.jobId,
        document_type: document.documentType,
        raw_text: document.rawText,
        processed_json: document.processedJson,
        upload_timestamp: document.uploadTimestamp,
        user_id: document.userId,
        status: document.status,
        version: document.version,
      };

      // TODO: Implementar conexión real a PostgreSQL cuando esté disponible
      console.log(`✅ [PostgreSQL Documents] Mock document saved:`, documentData);
    } catch (error) {
      console.error(`❌ [PostgreSQL Documents] Error saving document:`, error);
      throw new Error(`Error saving document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findById(jobId: string): Promise<Document | null> {
    try {
      console.log(`🔍 [PostgreSQL Documents] Finding document by ID: ${jobId}`);
      
      // Mock data mientras configuramos PostgreSQL
      const mockDocument = new Document(
        jobId,
        'invoice',
        'Mock raw text content',
        { processed: true, source: 'postgresql_mock' },
        new Date(),
        DocumentStatus.PROCESSED,
        1,
        'system'
      );

      console.log(`✅ [PostgreSQL Documents] Found document: ${jobId}`);
      return mockDocument;
    } catch (error) {
      console.error(`❌ [PostgreSQL Documents] Error finding document:`, error);
      return null;
    }
  }

  async findByJobId(jobId: string): Promise<Document | null> {
    // Delegar al método findById ya que jobId es el ID principal
    return this.findById(jobId);
  }

  async findByUserId(userId: string): Promise<Document[]> {
    try {
      console.log(`🔍 [PostgreSQL Documents] Finding documents for user: ${userId}`);
      
      // Mock data mientras configuramos PostgreSQL
      const mockDocuments = [
        new Document(
          `doc-${Date.now()}`,
          'invoice',
          'Mock raw text content',
          { processed: true, source: 'postgresql_mock' },
          new Date(),
          DocumentStatus.PROCESSED,
          1,
          userId
        )
      ];

      console.log(`✅ [PostgreSQL Documents] Found ${mockDocuments.length} documents for user ${userId}`);
      return mockDocuments;
    } catch (error) {
      console.error(`❌ [PostgreSQL Documents] Error finding documents by user:`, error);
      throw new Error(`Error finding documents by user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findAll(): Promise<Document[]> {
    try {
      console.log(`🔍 [PostgreSQL Documents] Finding all documents`);
      
      // Mock data mientras configuramos PostgreSQL
      const mockDocuments = [
        new Document(
          `doc-all-${Date.now()}`,
          'invoice',
          'Mock raw text content',
          { processed: true, source: 'postgresql_mock' },
          new Date(),
          DocumentStatus.PROCESSED,
          1,
          'system'
        )
      ];

      console.log(`✅ [PostgreSQL Documents] Found ${mockDocuments.length} total documents`);
      return mockDocuments;
    } catch (error) {
      console.error(`❌ [PostgreSQL Documents] Error finding all documents:`, error);
      throw new Error(`Error finding all documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(jobId: string): Promise<void> {
    try {
      console.log(`🗑️ [PostgreSQL Documents] Deleting document: ${jobId}`);
      
      // TODO: Implementar eliminación real en PostgreSQL
      console.log(`✅ [PostgreSQL Documents] Mock document deleted: ${jobId}`);
    } catch (error) {
      console.error(`❌ [PostgreSQL Documents] Error deleting document:`, error);
      throw new Error(`Error deleting document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
