// Objeto de valor para los metadatos del documento
export class DocumentMetadata {
  constructor(
    public readonly emitterName: string,
    public readonly receiverName: string,
    public readonly documentDate: Date,
    public readonly totalAmount?: number,
    public readonly currency?: string,
    public readonly documentNumber?: string,
  ) {
    this.validate()
  }

  private validate(): void {
    if (!this.emitterName || !this.receiverName || !this.documentDate) {
      throw new Error("Essential metadata fields cannot be empty")
    }
  }

  public equals(other: DocumentMetadata): boolean {
    return (
      this.emitterName === other.emitterName &&
      this.receiverName === other.receiverName &&
      this.documentDate.getTime() === other.documentDate.getTime() &&
      this.totalAmount === other.totalAmount &&
      this.currency === other.currency &&
      this.documentNumber === other.documentNumber
    )
  }
}

