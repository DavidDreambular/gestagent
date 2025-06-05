// Utilidad para convertir PDFs a imágenes usando PDF.js
// SOLO para uso en cliente (browser)

let pdfjs: any = null;

// Importación dinámica solo en el cliente
if (typeof window !== 'undefined') {
  import('pdfjs-dist').then((module) => {
    pdfjs = module.default || module;
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  });
}

export interface PDFToImageOptions {
  scale?: number;
  pageNumber?: number;
  format?: 'png' | 'jpeg';
  quality?: number;
}

export interface PDFImageResult {
  dataUrl: string;
  width: number;
  height: number;
  pageNumber: number;
}

export class PDFToImageConverter {
  private async ensurePDFJS() {
    if (typeof window === 'undefined') {
      throw new Error('PDFToImageConverter solo puede usarse en el cliente (browser)');
    }
    
    if (!pdfjs) {
      const module = await import('pdfjs-dist');
      pdfjs = module.default || module;
      pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    }
    
    return pdfjs;
  }

  /**
   * Convierte una página de PDF a imagen
   */
  async convertPageToImage(
    pdfBuffer: Buffer,
    options: PDFToImageOptions = {}
  ): Promise<PDFImageResult> {
    const {
      scale = 2.0,
      pageNumber = 1,
      format = 'png',
      quality = 0.9
    } = options;

    try {
      const pdf = await this.ensurePDFJS();
      const uint8Array = new Uint8Array(pdfBuffer);
      const loadingTask = pdf.getDocument({ data: uint8Array });
      const pdfDocument = await loadingTask.promise;

      if (pageNumber > pdfDocument.numPages || pageNumber < 1) {
        throw new Error(`Página ${pageNumber} no existe. El PDF tiene ${pdfDocument.numPages} páginas.`);
      }

      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale });

      // Crear canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('No se pudo obtener el contexto 2D del canvas');
      }

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Renderizar página en canvas
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;

      // Convertir a imagen
      const dataUrl = canvas.toDataURL(`image/${format}`, format === 'jpeg' ? quality : undefined);

      return {
        dataUrl,
        width: canvas.width,
        height: canvas.height,
        pageNumber
      };

    } catch (error) {
      console.error('[PDFToImage] Error convirtiendo PDF a imagen:', error);
      throw new Error(`Error al convertir PDF a imagen: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Convierte todas las páginas de PDF a imágenes
   */
  async convertAllPagesToImages(
    pdfBuffer: Buffer,
    options: Omit<PDFToImageOptions, 'pageNumber'> = {}
  ): Promise<PDFImageResult[]> {
    try {
      const pdf = await this.ensurePDFJS();
      const uint8Array = new Uint8Array(pdfBuffer);
      const loadingTask = pdf.getDocument({ data: uint8Array });
      const pdfDocument = await loadingTask.promise;

      const results: PDFImageResult[] = [];

      for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        const result = await this.convertPageToImage(pdfBuffer, {
          ...options,
          pageNumber: pageNum
        });
        results.push(result);
      }

      return results;

    } catch (error) {
      console.error('[PDFToImage] Error convirtiendo PDF completo:', error);
      throw new Error(`Error al convertir PDF completo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Genera thumbnail de la primera página
   */
  async generateThumbnail(
    pdfBuffer: Buffer,
    maxWidth: number = 200
  ): Promise<PDFImageResult> {
    try {
      const pdf = await this.ensurePDFJS();
      const uint8Array = new Uint8Array(pdfBuffer);
      const loadingTask = pdf.getDocument({ data: uint8Array });
      const pdfDocument = await loadingTask.promise;

      const page = await pdfDocument.getPage(1);
      const viewport = page.getViewport({ scale: 1.0 });

      // Calcular escala para que el ancho no exceda maxWidth
      const scale = maxWidth / viewport.width;

      return await this.convertPageToImage(pdfBuffer, {
        scale,
        pageNumber: 1,
        format: 'jpeg',
        quality: 0.8
      });

    } catch (error) {
      console.error('[PDFToImage] Error generando thumbnail:', error);
      throw new Error(`Error al generar thumbnail: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
}

// Instancia singleton
const pdfToImageConverter = new PDFToImageConverter();

// Exportar la instancia
export { pdfToImageConverter };

/**
 * Función de conveniencia para convertir una página
 */
export async function convertPDFPageToImage(
  pdfBuffer: Buffer,
  options?: PDFToImageOptions
): Promise<PDFImageResult> {
  return await pdfToImageConverter.convertPageToImage(pdfBuffer, options);
}

/**
 * Función de conveniencia para generar thumbnail
 */
export async function generatePDFThumbnail(
  pdfBuffer: Buffer,
  maxWidth?: number
): Promise<PDFImageResult> {
  return await pdfToImageConverter.generateThumbnail(pdfBuffer, maxWidth);
}
