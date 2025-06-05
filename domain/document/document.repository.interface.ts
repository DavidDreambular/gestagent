// Interfaz del repositorio de documentos
import type { Document } from "./document.entity";

export interface IDocumentRepository {
  findById(jobId: string): Promise<Document | null>;
  findByJobId(jobId: string): Promise<Document | null>;
  findByUserId(userId: string): Promise<Document[]>;
  findAll(): Promise<Document[]>;
  save(document: Document): Promise<void>;
  delete(jobId: string): Promise<void>;
} 