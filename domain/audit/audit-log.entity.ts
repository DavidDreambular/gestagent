// Entidad de log de auditoría
export class AuditLog {
  constructor(
    public readonly logId: string,
    public readonly documentId: string,
    public readonly userId: string,
    public readonly action: AuditAction,
    public readonly timestamp: Date,
    public readonly details: Record<string, any>,
  ) {}

  public isUserAction(): boolean {
    return [AuditAction.DOCUMENT_UPLOADED, AuditAction.DOCUMENT_EDITED, AuditAction.DOCUMENT_EXPORTED].includes(
      this.action,
    )
  }

  public isSystemAction(): boolean {
    return [AuditAction.DOCUMENT_PROCESSED, AuditAction.PROCESSING_ERROR].includes(this.action)
  }
}

export enum AuditAction {
  DOCUMENT_UPLOADED = "DOCUMENT_UPLOADED",
  DOCUMENT_PROCESSED = "DOCUMENT_PROCESSED",
  DOCUMENT_EDITED = "DOCUMENT_EDITED",
  DOCUMENT_UPDATED = "DOCUMENT_UPDATED",
  DOCUMENT_EXPORTED = "DOCUMENT_EXPORTED",
  PROCESSING_ERROR = "PROCESSING_ERROR",
}

