import * as XLSX from 'xlsx';

export interface DocumentData {
  job_id: string;
  document_type: string;
  emitter_name?: string;
  receiver_name?: string;
  document_date?: string;
  processed_json: any;
  upload_timestamp: string;
  status: string;
  version?: string;
  total_amount?: number;
  extractedData?: any;
}

export interface ExportOptions {
  includeRawData?: boolean;
  includeMetadata?: boolean;
  sheetPerDocument?: boolean;
  filename?: string;
}

export interface ExcelExportOptions {
  includeDetails?: boolean;
  includeIndex?: boolean;
  filename?: string;
}

export class ExcelExporter {
  private workbook: XLSX.WorkBook;
  
  constructor() {
    this.workbook = XLSX.utils.book_new();
  }

  /**
   * Exporta múltiples documentos a Excel con hojas separadas
   */
  async exportMultipleDocuments(
    documents: DocumentData[], 
    options: ExcelExportOptions = {}
  ): Promise<void> {
    const {
      includeDetails = true,
      includeIndex = true,
      filename = `documentos_${new Date().toISOString().split('T')[0]}.xlsx`
    } = options;

    try {
      // Crear hoja de índice si está habilitada
      if (includeIndex) {
        this.createIndexSheet(documents);
      }

      // Crear hoja resumen
      this.createSummarySheet(documents);

      // Crear hojas individuales para cada documento
      if (includeDetails) {
        for (const doc of documents) {
          await this.createDocumentSheet(doc);
        }
      }

      // Descargar el archivo
      this.downloadWorkbook(filename);
      
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      throw new Error('Error al generar el archivo Excel');
    }
  }

  /**
   * Crea la hoja de índice con enlaces a cada documento
   */
  private createIndexSheet(documents: DocumentData[]): void {
    const indexData = [
      ['ÍNDICE DE DOCUMENTOS', '', '', '', ''],
      ['', '', '', '', ''],
      ['#', 'Tipo', 'Emisor', 'Fecha', 'Importe', 'Estado', 'Enlace'],
      ...documents.map((doc, index) => [
        index + 1,
        doc.document_type || 'N/A',
        doc.emitter_name || 'N/A',
        doc.document_date ? new Date(doc.document_date).toLocaleDateString('es-ES') : 'N/A',
        doc.total_amount ? this.formatCurrency(doc.total_amount) : 'N/A',
        this.translateStatus(doc.status),
        { 
          f: `HYPERLINK("#'${this.sanitizeSheetName(doc.job_id)}'!A1","Ver detalle")`,
          t: 's'
        }
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(indexData);
    
    // Aplicar estilos básicos
    this.applyBasicStyling(worksheet, indexData.length);
    
    XLSX.utils.book_append_sheet(this.workbook, worksheet, 'Índice');
  }

  /**
   * Crea hoja resumen con estadísticas
   */
  private createSummarySheet(documents: DocumentData[]): void {
    const totalDocuments = documents.length;
    const totalAmount = documents.reduce((sum, doc) => sum + (doc.total_amount || 0), 0);
    const byType = this.groupByField(documents, 'document_type');
    const byStatus = this.groupByField(documents, 'status');
    const byMonth = this.groupByMonth(documents);

    const summaryData = [
      ['RESUMEN EJECUTIVO', '', ''],
      ['', '', ''],
      ['Total de documentos:', totalDocuments, ''],
      ['Importe total:', this.formatCurrency(totalAmount), ''],
      ['Fecha de generación:', new Date().toLocaleDateString('es-ES'), ''],
      ['', '', ''],
      ['DISTRIBUCIÓN POR TIPO', '', ''],
      ['Tipo', 'Cantidad', 'Porcentaje'],
      ...Object.entries(byType).map(([type, count]) => [
        type || 'Sin tipo',
        count,
        `${((count / totalDocuments) * 100).toFixed(1)}%`
      ]),
      ['', '', ''],
      ['DISTRIBUCIÓN POR ESTADO', '', ''],
      ['Estado', 'Cantidad', 'Porcentaje'],
      ...Object.entries(byStatus).map(([status, count]) => [
        this.translateStatus(status),
        count,
        `${((count / totalDocuments) * 100).toFixed(1)}%`
      ]),
      ['', '', ''],
      ['DISTRIBUCIÓN POR MES', '', ''],
      ['Mes', 'Cantidad', 'Importe'],
      ...Object.entries(byMonth).map(([month, data]) => [
        month,
        data.count,
        this.formatCurrency(data.amount)
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(summaryData);
    this.applyBasicStyling(worksheet, summaryData.length);
    
    XLSX.utils.book_append_sheet(this.workbook, worksheet, 'Resumen');
  }

  /**
   * Crea hoja individual para cada documento
   */
  private async createDocumentSheet(doc: DocumentData): Promise<void> {
    const sheetName = this.sanitizeSheetName(doc.job_id);
    
    // Obtener datos detallados del documento
    let extractedData = doc.extractedData;
    if (!extractedData) {
      try {
        const response = await fetch(`/api/documents/data/${doc.job_id}`);
        if (response.ok) {
          const data = await response.json();
          extractedData = data.extractedData;
        }
      } catch (error) {
        console.warn(`No se pudieron obtener detalles para ${doc.job_id}`);
      }
    }

    const documentData = [
      [`DOCUMENTO: ${doc.job_id}`, '', ''],
      ['', '', ''],
      ['INFORMACIÓN GENERAL', '', ''],
      ['Tipo:', doc.document_type || 'N/A', ''],
      ['Estado:', this.translateStatus(doc.status), ''],
      ['Fecha del documento:', doc.document_date ? new Date(doc.document_date).toLocaleDateString('es-ES') : 'N/A', ''],
      ['Fecha de subida:', new Date(doc.upload_timestamp).toLocaleDateString('es-ES'), ''],
      ['', '', ''],
      ['EMISOR', '', ''],
      ['Nombre:', doc.emitter_name || 'N/A', ''],
      ['', '', ''],
      ['RECEPTOR', '', ''],
      ['Nombre:', doc.receiver_name || 'N/A', ''],
      ['', '', ''],
      ['IMPORTES', '', ''],
      ['Total:', doc.total_amount ? this.formatCurrency(doc.total_amount) : 'N/A', '']
    ];

    // Agregar detalles extraídos si están disponibles
    if (extractedData) {
      documentData.push(['', '', '']);
      documentData.push(['DETALLES EXTRAÍDOS', '', '']);
      
      if (extractedData.items && Array.isArray(extractedData.items)) {
        documentData.push(['', '', '']);
        documentData.push(['LÍNEAS DE FACTURA', '', '']);
        documentData.push(['Descripción', 'Cantidad', 'Precio', 'Total']);
        
        extractedData.items.forEach((item: any) => {
          documentData.push([
            item.description || 'N/A',
            item.quantity || 'N/A',
            item.unit_price ? this.formatCurrency(item.unit_price) : 'N/A',
            item.total_price ? this.formatCurrency(item.total_price) : 'N/A'
          ]);
        });
      }

      if (extractedData.tax_breakdown && Array.isArray(extractedData.tax_breakdown)) {
        documentData.push(['', '', '']);
        documentData.push(['DESGLOSE DE IMPUESTOS', '', '']);
        documentData.push(['Tipo', 'Base', 'Porcentaje', 'Importe']);
        
        extractedData.tax_breakdown.forEach((tax: any) => {
          documentData.push([
            tax.type || 'N/A',
            tax.base ? this.formatCurrency(tax.base) : 'N/A',
            tax.rate ? `${tax.rate}%` : 'N/A',
            tax.amount ? this.formatCurrency(tax.amount) : 'N/A'
          ]);
        });
      }
    }

    const worksheet = XLSX.utils.aoa_to_sheet(documentData);
    this.applyBasicStyling(worksheet, documentData.length);
    
    XLSX.utils.book_append_sheet(this.workbook, worksheet, sheetName);
  }

  /**
   * Aplica estilos básicos a la hoja
   */
  private applyBasicStyling(worksheet: XLSX.WorkSheet, rowCount: number): void {
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    // Ajustar ancho de columnas
    const colWidths = [];
    for (let col = range.s.c; col <= range.e.c; col++) {
      colWidths.push({ wch: 20 });
    }
    worksheet['!cols'] = colWidths;
  }

  /**
   * Descarga el workbook como archivo Excel
   */
  private downloadWorkbook(filename: string): void {
    XLSX.writeFile(this.workbook, filename);
  }

  /**
   * Utilidades auxiliares
   */
  private sanitizeSheetName(name: string): string {
    return name.replace(/[\\/*?[\]:]/g, '_').substring(0, 31);
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }

  private translateStatus(status: string): string {
    const translations: { [key: string]: string } = {
      'completed': 'Completado',
      'processing': 'Procesando',
      'error': 'Error',
      'pending': 'Pendiente'
    };
    return translations[status] || status;
  }

  private groupByField(documents: DocumentData[], field: keyof DocumentData): { [key: string]: number } {
    return documents.reduce((acc, doc) => {
      const value = String(doc[field] || 'Sin especificar');
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
  }

  private groupByMonth(documents: DocumentData[]): { [key: string]: { count: number; amount: number } } {
    return documents.reduce((acc, doc) => {
      const date = doc.document_date ? new Date(doc.document_date) : new Date(doc.upload_timestamp);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = { count: 0, amount: 0 };
      }
      
      acc[monthKey].count++;
      acc[monthKey].amount += doc.total_amount || 0;
      
      return acc;
    }, {} as { [key: string]: { count: number; amount: number } });
  }
}

/**
 * Función de conveniencia para exportar documentos
 */
export async function exportDocumentsToExcel(
  documents: DocumentData[], 
  options?: ExcelExportOptions
): Promise<void> {
  const exporter = new ExcelExporter();
  await exporter.exportMultipleDocuments(documents, options);
}

/**
 * Exporta documentos seleccionados desde una lista
 */
export async function exportSelectedDocuments(
  selectedIds: string[],
  allDocuments: DocumentData[],
  options: ExportOptions = {}
): Promise<void> {
  const selectedDocs = allDocuments.filter(doc => selectedIds.includes(doc.job_id));
  
  if (selectedDocs.length === 0) {
    throw new Error('No hay documentos seleccionados para exportar');
  }

  const filename = options.filename || `documentos-seleccionados-${new Date().toISOString().split('T')[0]}.xlsx`;
  
  await exportDocumentsToExcel(selectedDocs, { ...options, filename });
}

/**
 * Exporta un solo documento a Excel
 */
export async function exportSingleDocument(
  document: DocumentData,
  options: Omit<ExportOptions, 'sheetPerDocument'> = {}
): Promise<void> {
  const filename = options.filename || `documento-${document.job_id}.xlsx`;
  
  await exportDocumentsToExcel([document], { 
    ...options, 
    filename
  });
} 