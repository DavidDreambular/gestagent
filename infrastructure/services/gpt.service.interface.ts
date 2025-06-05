// Interface para el servicio de validación con IA (Domain Interface)
export interface IGptService {
  /**
   * Procesa y valida el texto extraído para obtener JSON estructurado
   * @param rawText Texto en crudo extraído del OCR
   * @param rawJson JSON en crudo del OCR
   * @param documentType Tipo de documento a procesar
   * @returns JSON estructurado y validado
   */
  processText(rawText: string, rawJson: any, documentType: string): Promise<{
    processedJson: any;
    dialog: string;
    confidence: number;
  }>;
}
