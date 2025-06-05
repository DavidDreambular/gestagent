// Servicio de dominio para el procesamiento de documentos
import type { Document } from "./document.entity"
import type { IDocumentRepository } from "./document.repository.interface"
import type { IOcrService } from "../../infrastructure/services/ocr.service.interface"
import type { IGptService } from "../../infrastructure/services/gpt.service.interface"
import type { ITranslationService } from "../../infrastructure/services/translation.service.interface"

export class DocumentProcessingService {
  constructor(
    private documentRepository: IDocumentRepository,
    private ocrService: IOcrService,
    private gptService: IGptService,
    private translationService: ITranslationService,
  ) {}

  async processDocument(document: Document, pdfBuffer: Buffer): Promise<void> {
    try {
      console.log(`[DocumentProcessingService] Iniciando procesamiento del documento ${document.jobId}`);
      
      // 1. Extraer texto mediante OCR
      const ocrResult = await this.ocrService.extractText(pdfBuffer);
      console.log(`[DocumentProcessingService] Texto extraído exitosamente`);
      
      // 2. Procesar con Llama Vision para obtener JSON estructurado
      const validationResult = await this.gptService.processText(
        ocrResult.rawText, 
        ocrResult.rawJson,
        document.documentType
      );
      console.log(`[DocumentProcessingService] Validación completada con confianza: ${(validationResult.confidence * 100).toFixed(2)}%`);
      
      // 3. Traducir si es necesario (del catalán al español)
      const finalJson = await this.translationService.translate(validationResult.processedJson);
      
      // 4. Actualizar el documento con los datos procesados
      document.markAsProcessed({
        ...finalJson,
        metadata: {
          ...finalJson.metadata,
          ocr_job_id: ocrResult.jobId,
          confidence_score: validationResult.confidence,
          validation_dialog: validationResult.dialog,
          processing_timestamp: new Date().toISOString()
        }
      });
      
      // 5. Persistir los cambios
      await this.documentRepository.save(document);
      console.log(`[DocumentProcessingService] Documento ${document.jobId} procesado y guardado exitosamente`);
      
    } catch (error) {
      console.error(`[DocumentProcessingService] Error procesando documento:`, error);
      // Manejar errores de dominio
      throw new Error(`Error processing document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
