// Command para actualizar un documento
export class UpdateDocumentCommand {
  constructor(
    public readonly jobId: string,
    public readonly userId: string,
    public readonly processedData?: any,
    public readonly metadata?: Record<string, any>
  ) {}
}
