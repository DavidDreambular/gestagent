// Interface para el servicio OCR (Domain Interface)
export interface IOcrService {
  /**
   * Extrae texto de un documento PDF
   * @param pdfBuffer Buffer del archivo PDF
   * @returns Texto extraído y JSON en crudo
   */
  extractText(pdfBuffer: Buffer): Promise<{
    rawText: string;
    rawJson: any;
    jobId: string;
  }>;
}
