// Manejador del comando para procesar un documento
import type { ProcessDocumentCommand } from "./process-document.command"
import type { IDocumentRepository } from "../../domain/document/document.repository.interface"
import { Document, DocumentStatus } from "../../domain/document/document.entity"
import type { DocumentProcessingService } from "../../domain/document/document-processing.service"
import type { IAuditLogRepository } from "../../domain/audit/audit-log.repository.interface"
import { AuditLog, AuditAction } from "../../domain/audit/audit-log.entity"
import { v4 as uuidv4 } from "uuid"
import { notificationService } from "../../services/notification.service"

export class ProcessDocumentCommandHandler {
  constructor(
    private documentRepository: IDocumentRepository,
    private documentProcessingService: DocumentProcessingService,
    private auditLogRepository: IAuditLogRepository,
  ) {}

  async handle(command: ProcessDocumentCommand): Promise<string> {
    try {
      // 1. Crear una nueva instancia de documento
      const document = new Document(
        command.jobId,
        command.documentType,
        "", // rawText se llenará durante el procesamiento
        {}, // processedJson se llenará durante el procesamiento
        new Date(),
        DocumentStatus.UPLOADED,
        1,
        command.userId, // Añadir userId al documento
        command.fileName // Añadir fileName al documento
      )

      // 2. Guardar el documento inicial
      await this.documentRepository.save(document)

      // 3. Registrar la acción en el log de auditoría
      const auditLog = new AuditLog(
        uuidv4(),
        document.jobId,
        command.userId,
        AuditAction.DOCUMENT_UPLOADED,
        new Date(),
        { 
          fileName: command.fileName,
          documentType: command.documentType,
          hasBuffer: !!command.pdfBuffer 
        },
      )
      await this.auditLogRepository.save(auditLog)

      // 4. Enviar notificación de documento recibido
      await notificationService.notifyDocumentUploaded(
        command.userId,
        command.fileName,
        document.jobId
      );

      // 5. Iniciar el procesamiento asíncrono con el buffer si está disponible
      if (command.pdfBuffer) {
        const processingStartTime = Date.now();
        
        // Procesamiento inmediato con el buffer
        this.documentProcessingService.processDocument(document, command.pdfBuffer)
          .then(async () => {
            const processingTime = Date.now() - processingStartTime;
            
            // Registrar éxito en auditoría
            const successLog = new AuditLog(
              uuidv4(),
              document.jobId,
              command.userId,
              AuditAction.DOCUMENT_PROCESSED,
              new Date(),
              { status: 'completed', processingTime }
            )
            await this.auditLogRepository.save(successLog)
            
            // Enviar notificación de éxito
            await notificationService.notifyDocumentProcessed(
              command.userId,
              command.fileName,
              document.jobId,
              processingTime
            );
          })
          .catch(async (error) => {
            console.error("Error processing document:", error)
            // Actualizar estado del documento a error
            document.status = DocumentStatus.ERROR;
            document.metadata = { ...document.metadata, error: error.message };
            await this.documentRepository.save(document);
            
            // Registrar el error en el log de auditoría
            const errorLog = new AuditLog(
              uuidv4(),
              document.jobId,
              command.userId,
              AuditAction.PROCESSING_ERROR,
              new Date(),
              { error: error.message },
            )
            await this.auditLogRepository.save(errorLog)
            
            // Enviar notificación de error
            await notificationService.notifyDocumentError(
              command.userId,
              command.fileName,
              document.jobId,
              error.message
            );
          })
      } else {
        // Si no hay buffer, marcar como error
        document.status = DocumentStatus.ERROR;
        document.metadata = { error: 'No PDF buffer provided' };
        await this.documentRepository.save(document);
        
        // Notificar error
        await notificationService.notifyDocumentError(
          command.userId,
          command.fileName,
          document.jobId,
          'No se pudo procesar el archivo PDF'
        );
      }

      return document.jobId
    } catch (error) {
      throw new Error(`Error handling process document command: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}
