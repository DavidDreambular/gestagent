// Handler para actualizar un documento
import type { UpdateDocumentCommand } from "./update-document.command";
import type { IDocumentRepository } from "../../domain/document/document.repository.interface";
import type { IAuditLogRepository } from "../../domain/audit/audit-log.repository.interface";
import { AuditLog, AuditAction } from "../../domain/audit/audit-log.entity";
import { v4 as uuidv4 } from "uuid";

export class UpdateDocumentCommandHandler {
  constructor(
    private documentRepository: IDocumentRepository,
    private auditLogRepository: IAuditLogRepository
  ) {}

  async handle(command: UpdateDocumentCommand): Promise<void> {
    try {
      // Buscar el documento existente
      const document = await this.documentRepository.findByJobId(command.jobId);
      
      if (!document) {
        throw new Error(`Document ${command.jobId} not found`);
      }
      
      // Verificar permisos (el documento debe pertenecer al usuario)
      if (document.userId !== command.userId) {
        throw new Error(`Unauthorized to update document ${command.jobId}`);
      }
      
      // Actualizar los campos proporcionados
      if (command.processedData !== undefined) {
        document.processedJson = command.processedData;
      }
      
      if (command.metadata !== undefined) {
        document.metadata = {
          ...document.metadata,
          ...command.metadata,
          lastUpdated: new Date().toISOString(),
          updatedBy: command.userId
        };
      }
      
      // Incrementar versión
      document.version += 1;
      
      // Guardar cambios
      await this.documentRepository.save(document);
      
      // Registrar en auditoría
      const auditLog = new AuditLog(
        uuidv4(),
        document.jobId,
        command.userId,
        AuditAction.DOCUMENT_UPDATED,
        new Date(),
        {
          version: document.version,
          fieldsUpdated: {
            processedData: command.processedData !== undefined,
            metadata: command.metadata !== undefined
          }
        }
      );
      
      await this.auditLogRepository.save(auditLog);
      
    } catch (error) {
      console.error(`Error updating document ${command.jobId}:`, error);
      throw new Error(`Error updating document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
