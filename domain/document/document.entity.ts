// Entidad principal del documento
export class Document {
  constructor(
    public readonly jobId: string,
    public readonly documentType: string,
    public rawText: string,
    public processedJson: Record<string, any>,
    public readonly uploadTimestamp: Date,
    public status: DocumentStatus,
    public version: number,
    public readonly userId?: string,
    public readonly fileName?: string,
    public metadata: Record<string, any> = {},
    public emitterName?: string,
    public receiverName?: string,
    public documentDate?: string
  ) {}

  // Métodos de dominio
  public process(): void {
    if (this.status !== DocumentStatus.UPLOADED) {
      throw new Error("Document must be in UPLOADED status to be processed")
    }

    this.status = DocumentStatus.PROCESSING
    // La lógica real de procesamiento se delega al servicio de dominio
  }

  public markAsProcessed(processedJson: Record<string, any>): void {
    this.processedJson = processedJson
    this.status = DocumentStatus.PROCESSED
    this.version += 1
  }

  public validate(): boolean {
    // Lógica de validación específica del dominio
    return Object.keys(this.processedJson).length > 0
  }

  // Getters
  public getStatus(): DocumentStatus {
    return this.status
  }

  public getProcessedData(): Record<string, any> {
    return { ...this.processedJson }
  }

  public getRawText(): string {
    return this.rawText
  }

  public getVersion(): number {
    return this.version
  }
}

export enum DocumentStatus {
  UPLOADED = "UPLOADED",
  PROCESSING = "PROCESSING",
  PROCESSED = "PROCESSED",
  ERROR = "ERROR",
  DELETED = "DELETED"
}

