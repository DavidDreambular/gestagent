// Query para obtener un documento
export class GetDocumentQuery {
  constructor(
    public readonly jobId: string,
    public readonly userId?: string  // Opcional para verificar permisos
  ) {}
}
