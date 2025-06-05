// Comando para procesar un documento
export class ProcessDocumentCommand {
  constructor(
    public readonly jobId: string,
    public readonly userId: string,
    public readonly documentType: string,
    public readonly fileName: string,
    public readonly pdfBuffer?: Buffer  // Añadido para soportar el buffer del PDF directamente
  ) {}
}
