// Servicio para extraer texto de PDFs usando PDF.js
// SOLO para uso en cliente (browser)

let pdfjs: any = null;
let PDFDocumentProxy: any = null;
let PDFPageProxy: any = null;
let TextContent: any = null;

// Importación dinámica solo en el cliente
if (typeof window !== 'undefined') {
  // Solo cargar pdfjs-dist en el cliente
  import('pdfjs-dist').then((module) => {
    pdfjs = module.default || module;
    // Configurar el worker de PDF.js para Next.js usando CDN
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  });
}

export interface PDFExtractionResult {
  text: string;
  pageCount: number;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
  };
  pages: Array<{
    pageNumber: number;
    text: string;
    width: number;
    height: number;
  }>;
  hasEmbeddedText: boolean;
  needsOCR: boolean;
}

export class PDFExtractorService {
  private async ensurePDFJS() {
    if (typeof window === 'undefined') {
      throw new Error('PDFExtractorService solo puede usarse en el cliente (browser)');
    }
    
    if (!pdfjs) {
      // Cargar dinámicamente si no está disponible
      const module = await import('pdfjs-dist');
      pdfjs = module.default || module;
      pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    }
    
    return pdfjs;
  }

  /**
   * Extrae texto y metadatos de un PDF buffer
   */
  async extractFromBuffer(pdfBuffer: Buffer): Promise<PDFExtractionResult> {
    try {
      console.log('[PDFExtractor] Iniciando extracción de PDF...');
      
      // Asegurar que PDF.js esté disponible
      const pdf = await this.ensurePDFJS();
      
      // Convertir Buffer a Uint8Array para PDF.js
      const uint8Array = new Uint8Array(pdfBuffer);
      
      // Cargar el documento PDF
      const loadingTask = pdf.getDocument({
        data: uint8Array,
        // Opciones para mejorar la extracción
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/',
      });

      const pdfDocument = await loadingTask.promise;
      console.log(`[PDFExtractor] PDF cargado: ${pdfDocument.numPages} páginas`);

      // Extraer metadatos
      const metadata = await this.extractMetadata(pdfDocument);
      
      // Extraer texto de cada página
      const pages = [];
      let fullText = '';
      let totalTextLength = 0;

      for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 });
        
        // Extraer contenido de texto
        const textContent = await page.getTextContent();
        
        // Construir texto de la página
        let pageText = '';
        const textItems = textContent.items;
        
        for (let i = 0; i < textItems.length; i++) {
          const item = textItems[i];
          if ('str' in item) {
            pageText += item.str;
            
            // Añadir espacio o salto de línea según sea necesario
            if (i < textItems.length - 1) {
              const nextItem = textItems[i + 1];
              if ('str' in nextItem) {
                // Si hay un cambio significativo en Y, añadir salto de línea
                if ('transform' in item && 'transform' in nextItem) {
                  const currentY = item.transform[5];
                  const nextY = nextItem.transform[5];
                  if (Math.abs(currentY - nextY) > 5) {
                    pageText += '\n';
                  } else {
                    pageText += ' ';
                  }
                } else {
                  pageText += ' ';
                }
              }
            }
          }
        }
        
        pageText = pageText.trim();
        totalTextLength += pageText.length;
        
        pages.push({
          pageNumber: pageNum,
          text: pageText,
          width: viewport.width,
          height: viewport.height
        });
        
        fullText += pageText + '\n\n';
        
        console.log(`[PDFExtractor] Página ${pageNum}: ${pageText.length} caracteres extraídos`);
      }
      
      // Determinar si el PDF tiene texto embebido o necesita OCR
      const hasEmbeddedText = totalTextLength > 50; // Más de 50 caracteres sugiere texto real
      const avgCharsPerPage = totalTextLength / pdfDocument.numPages;
      const needsOCR = avgCharsPerPage < 100; // Menos de 100 chars por página sugiere PDF escaneado
      
      console.log(`[PDFExtractor] Extracción completada: ${totalTextLength} caracteres totales`);
      console.log(`[PDFExtractor] Texto embebido: ${hasEmbeddedText ? 'Sí' : 'No'}`);
      console.log(`[PDFExtractor] Necesita OCR: ${needsOCR ? 'Sí' : 'No'}`);

      return {
        text: fullText.trim(),
        pageCount: pdfDocument.numPages,
        metadata,
        pages,
        hasEmbeddedText,
        needsOCR
      };
      
    } catch (error) {
      console.error('[PDFExtractor] Error extrayendo PDF:', error);
      throw new Error(`Error al extraer texto del PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Extrae metadatos del documento PDF
   */
  private async extractMetadata(pdfDocument: any): Promise<PDFExtractionResult['metadata']> {
    try {
      const metadata = await pdfDocument.getMetadata();
      const info = metadata.info as any;
      
      return {
        title: info.Title || undefined,
        author: info.Author || undefined,
        subject: info.Subject || undefined,
        creator: info.Creator || undefined,
        producer: info.Producer || undefined,
        creationDate: info.CreationDate ? new Date(info.CreationDate) : undefined,
        modificationDate: info.ModDate ? new Date(info.ModDate) : undefined,
      };
    } catch (error) {
      console.warn('[PDFExtractor] Error extrayendo metadatos:', error);
      return {};
    }
  }

  /**
   * Valida si un archivo es un PDF válido
   */
  validatePDF(buffer: Buffer): boolean {
    if (!buffer || buffer.length < 4) {
      return false;
    }
    
    // Verificar firma PDF (%PDF-)
    const header = buffer.slice(0, 5).toString('ascii');
    return header === '%PDF-';
  }

  /**
   * Extrae solo el texto sin formato adicional (útil para APIs que necesitan texto plano)
   */
  async extractPlainText(pdfBuffer: Buffer): Promise<string> {
    const result = await this.extractFromBuffer(pdfBuffer);
    return result.text;
  }

  /**
   * Extrae texto con información de posición (útil para mantener formato de tablas)
   */
  async extractStructuredText(pdfBuffer: Buffer): Promise<any> {
    try {
      const pdf = await this.ensurePDFJS();
      const uint8Array = new Uint8Array(pdfBuffer);
      const loadingTask = pdf.getDocument({ data: uint8Array });
      const pdfDocument = await loadingTask.promise;
      
      const structuredPages = [];
      
      for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Agrupar texto por líneas basándose en posición Y
        const lines = new Map<number, Array<any>>();
        
        textContent.items.forEach((item: any) => {
          if ('str' in item && item.str.trim()) {
            const y = Math.round(item.transform[5]); // Posición Y redondeada
            if (!lines.has(y)) {
              lines.set(y, []);
            }
            lines.get(y)!.push({
              text: item.str,
              x: item.transform[4], // Posición X
              y: y,
              width: item.width,
              height: item.height
            });
          }
        });
        
        // Ordenar líneas por Y (de arriba a abajo) y texto por X (izquierda a derecha)
        const sortedLines = Array.from(lines.entries())
          .sort(([a], [b]) => b - a) // Y descendente
          .map(([y, items]) => ({
            y,
            items: items.sort((a, b) => a.x - b.x) // X ascendente
          }));
        
        structuredPages.push({
          pageNumber: pageNum,
          lines: sortedLines
        });
      }
      
      return {
        pageCount: pdfDocument.numPages,
        pages: structuredPages
      };
      
    } catch (error) {
      console.error('[PDFExtractor] Error extrayendo texto estructurado:', error);
      throw error;
    }
  }
}

// Instancia singleton para uso global
const pdfExtractor = new PDFExtractorService();

// Exportar la instancia
export { pdfExtractor };

/**
 * Función de conveniencia para extraer texto simple
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  return await pdfExtractor.extractPlainText(pdfBuffer);
}

/**
 * Función de conveniencia para extraer datos completos
 */
export async function extractPDFData(pdfBuffer: Buffer): Promise<PDFExtractionResult> {
  return await pdfExtractor.extractFromBuffer(pdfBuffer);
}
