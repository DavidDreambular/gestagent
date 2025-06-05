// Middleware para procesamiento de PDFs
import { NextRequest, NextResponse } from 'next/server';
import { pdfExtractor } from '@/services/pdf-extractor';

export interface PDFMiddlewareResult {
  buffer: Buffer;
  extractedText?: string;
  metadata?: any;
  pageCount?: number;
  hasEmbeddedText?: boolean;
  needsOCR?: boolean;
}

/**
 * Middleware para validar y pre-procesar archivos PDF
 */
export async function withPDFValidation(
  request: NextRequest,
  handler: (req: NextRequest, pdfData: PDFMiddlewareResult) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Obtener el FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No se ha proporcionado ningún archivo' },
        { status: 400 }
      );
    }
    
    // Validar tipo MIME
    if (!file.type.includes('pdf')) {
      return NextResponse.json(
        { error: 'Solo se permiten archivos PDF' },
        { status: 400 }
      );
    }
    
    // Validar tamaño (10MB por defecto)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `El archivo excede el tamaño máximo de ${maxSize / 1024 / 1024}MB` },
        { status: 400 }
      );
    }
    
    // Convertir a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);
    
    // Validar que es un PDF válido
    if (!pdfExtractor.validatePDF(pdfBuffer)) {
      return NextResponse.json(
        { error: 'El archivo no es un PDF válido' },
        { status: 400 }
      );
    }
    
    // Extraer información básica del PDF (opcional)
    let pdfResult: PDFMiddlewareResult = { buffer: pdfBuffer };
    
    try {
      const extractionData = await pdfExtractor.extractFromBuffer(pdfBuffer);
      pdfResult = {
        buffer: pdfBuffer,
        extractedText: extractionData.text,
        metadata: extractionData.metadata,
        pageCount: extractionData.pageCount,
        hasEmbeddedText: extractionData.hasEmbeddedText,
        needsOCR: extractionData.needsOCR
      };
    } catch (extractError) {
      console.warn('[PDFMiddleware] No se pudo extraer información del PDF:', extractError);
      // Continuar sin la extracción previa
    }
    
    // Ejecutar el handler con los datos del PDF
    return await handler(request, pdfResult);
    
  } catch (error) {
    console.error('[PDFMiddleware] Error:', error);
    return NextResponse.json(
      { error: 'Error procesando el archivo PDF' },
      { status: 500 }
    );
  }
}

/**
 * Helper para obtener estadísticas del PDF
 */
export function getPDFStats(pdfData: PDFMiddlewareResult) {
  return {
    size: pdfData.buffer.length,
    sizeInMB: (pdfData.buffer.length / 1024 / 1024).toFixed(2),
    pageCount: pdfData.pageCount || 0,
    hasText: pdfData.hasEmbeddedText || false,
    needsOCR: pdfData.needsOCR || false,
    extractedChars: pdfData.extractedText?.length || 0
  };
}
