// Handler para obtener un documento
import type { GetDocumentQuery } from "./get-document.query";
import type { IDocumentRepository } from "../../domain/document/document.repository.interface";
import type { Document } from "../../domain/document/document.entity";

export class GetDocumentQueryHandler {
  constructor(
    private documentRepository: IDocumentRepository
  ) {}

  async handle(query: GetDocumentQuery): Promise<Document | null> {
    try {
      // Buscar el documento por jobId
      const document = await this.documentRepository.findByJobId(query.jobId);
      
      if (!document) {
        return null;
      }
      
      // Si se proporciona userId, verificar que coincida (a menos que sea admin)
      if (query.userId && document.userId !== query.userId) {
        // Por ahora devolvemos null si no coincide el usuario
        // En el futuro podríamos lanzar una excepción de autorización
        return null;
      }
      
      return document;
    } catch (error) {
      console.error(`Error getting document ${query.jobId}:`, error);
      throw new Error(`Error retrieving document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
