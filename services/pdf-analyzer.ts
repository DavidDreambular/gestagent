// Servicio de análisis de PDFs para el sistema híbrido
import * as pdfParse from 'pdf-parse';
import { PDFAnalysis, PDFAnalysisOptions, PDFAnalysisResult, ANALYSIS_THRESHOLDS } from '@/types/pdf-analysis';

export class PDFAnalyzerService {
  /**
   * Analiza un PDF para determinar la estrategia de procesamiento óptima
   */
  async analyzePDF(
    pdfBuffer: Buffer, 
    options: PDFAnalysisOptions = {}
  ): Promise<PDFAnalysisResult> {
    const startTime = Date.now();
    
    try {
      // Parsear el PDF
      const pdfData = await pdfParse.default(pdfBuffer, {
        max: options.maxPages || 0, // 0 = todas las páginas
      });

      // Análisis básico
      const pageCount = pdfData.numpages;
      const hasText = pdfData.text && pdfData.text.trim().length > 0;
      const textLength = pdfData.text?.length || 0;
      const averageTextDensity = textLength / pageCount;

      // Detectar calidad del texto
      const textQuality = this.assessTextQuality(pdfData.text || '', pageCount);
      
      // Detectar si es PDF nativo o escaneado
      const isDigitalBorn = this.isDigitalBornPDF(pdfData, averageTextDensity);
      
      // Detectar tablas complejas
      const hasComplexTables = options.detectTables ? 
        this.detectComplexTables(pdfData.text || '') : false;
      
      // Detectar idioma
      const documentLanguage = options.detectLanguage ? 
        this.detectLanguage(pdfData.text || '') : 'es';
      
      // Detectar tipo de documento
      const detectedDocumentType = this.detectDocumentType(pdfData.text || '');
      
      // Calcular confianza
      const confidence = this.calculateConfidence(
        textQuality,
        isDigitalBorn,
        Boolean(hasText),
        averageTextDensity
      );
      
      // Determinar estrategia recomendada
      const { strategy, reason } = this.determineStrategy({
        isDigitalBorn,
        textQuality,
        hasComplexTables,
        pageCount,
        confidence: confidence.overall,
        documentType: detectedDocumentType
      });

      const analysis: PDFAnalysis = {
        isDigitalBorn,
        pageCount,
        hasExtractableText: Boolean(hasText),
        fileSize: pdfBuffer.length,
        textQuality,
        hasComplexTables,
        hasImages: this.detectImages(pdfData),
        averageTextDensity,
        documentLanguage,
        detectedDocumentType,
        confidence,
        recommendedStrategy: strategy,
        strategyReason: reason,
        analysisTimeMs: Date.now() - startTime
      };

      return { success: true, analysis };
    } catch (error) {
      console.error('Error analyzing PDF:', error);
      return { 
        success: false, 
        error: `Failed to analyze PDF: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Evalúa la calidad del texto extraído
   */
  private assessTextQuality(text: string, pageCount: number): 'high' | 'medium' | 'low' {
    if (!text || text.trim().length === 0) return 'low';
    
    const avgCharsPerPage = text.length / pageCount;
    const hasGoodStructure = /\n\n/.test(text); // Párrafos separados
    const hasNumbers = /\d+/.test(text);
    const hasSpecialChars = /[€$%]/.test(text); // Caracteres financieros
    const wordCount = text.split(/\s+/).length;
    const avgWordLength = text.length / wordCount;
    
    let score = 0;
    
    // Criterios de calidad
    if (avgCharsPerPage > 500) score += 2;
    else if (avgCharsPerPage > 200) score += 1;
    
    if (hasGoodStructure) score += 1;
    if (hasNumbers) score += 1;
    if (hasSpecialChars) score += 1;
    if (avgWordLength > 3 && avgWordLength < 10) score += 1; // Palabras normales
    
    // Penalizar texto corrupto
    const corruptedRatio = (text.match(/[�\uFFFD]/g) || []).length / text.length;
    if (corruptedRatio > 0.01) score -= 2;
    
    if (score >= 5) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  /**
   * Detecta si el PDF es nativo digital o escaneado
   */
  private isDigitalBornPDF(pdfData: any, avgTextDensity: number): boolean {
    // Un PDF nativo digital típicamente tiene:
    // - Texto bien estructurado
    // - Densidad de texto consistente
    // - Metadatos del creador
    
    if (avgTextDensity < ANALYSIS_THRESHOLDS.MIN_TEXT_DENSITY) {
      return false; // Muy poco texto, probablemente escaneado
    }
    
    // Verificar si tiene fuentes embebidas (indicador de PDF nativo)
    const hasEmbeddedFonts = pdfData.info && Object.keys(pdfData.info).some(
      key => key.toLowerCase().includes('font')
    );
    
    // Verificar metadatos de creación
    const hasCreatorInfo = pdfData.info && (
      pdfData.info.Creator || 
      pdfData.info.Producer
    );
    
    return hasEmbeddedFonts || hasCreatorInfo || avgTextDensity > 300;
  }

  /**
   * Detecta la presencia de tablas complejas
   */
  private detectComplexTables(text: string): boolean {
    // Patrones que indican tablas
    const tablePatterns = [
      /\t.*\t.*\t/gm,           // Múltiples tabs en una línea
      /\|.*\|.*\|/gm,           // Formato de tabla con pipes
      /\s{2,}\d+[.,]\d+\s{2,}/gm, // Números con espaciado (columnas)
      /^\s*\d+\s+.*\s+\d+[.,]\d+/gm, // Líneas con número, texto, número
    ];
    
    let tableIndicators = 0;
    for (const pattern of tablePatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 2) {
        tableIndicators++;
      }
    }
    
    return tableIndicators >= ANALYSIS_THRESHOLDS.COMPLEX_TABLE_THRESHOLD;
  }

  /**
   * Detecta el idioma del documento
   */
  private detectLanguage(text: string): string {
    const spanishPatterns = /\b(factura|importe|total|iva|cliente|fecha|nómina|salario)\b/gi;
    const englishPatterns = /\b(invoice|amount|total|tax|client|date|payroll|salary)\b/gi;
    
    const spanishMatches = (text.match(spanishPatterns) || []).length;
    const englishMatches = (text.match(englishPatterns) || []).length;
    
    if (spanishMatches > englishMatches) return 'es';
    if (englishMatches > spanishMatches) return 'en';
    
    return 'es'; // Default español
  }

  /**
   * Detecta el tipo de documento
   */
  private detectDocumentType(text: string): string | undefined {
    const lowerText = text.toLowerCase();
    
    const documentPatterns = {
      'factura': /factura|invoice|fact\s*\.?\s*n[º°]/i,
      'nomina': /nómina|nomina|payroll|salario|sueldo/i,
      'recibo': /recibo|receipt|comprobante/i,
      'extracto': /extracto|statement|movimientos/i,
      'balance': /balance|estado.*financiero|p[&y]l/i,
    };
    
    for (const [type, pattern] of Object.entries(documentPatterns)) {
      if (pattern.test(lowerText)) {
        return type;
      }
    }
    
    return undefined;
  }
  /**
   * Detecta si el PDF contiene imágenes
   */
  private detectImages(pdfData: any): boolean {
    // pdf-parse no expone directamente las imágenes,
    // pero podemos inferir por el tamaño vs texto
    const textSize = (pdfData.text?.length || 0) * 2; // Aproximado en bytes
    const totalSize = pdfData.info?.PDFFormatVersion ? 1000000 : 0; // Placeholder
    
    // Si el archivo es mucho más grande que el texto, probablemente tiene imágenes
    return totalSize > textSize * 10;
  }

  /**
   * Calcula los niveles de confianza
   */
  private calculateConfidence(
    textQuality: 'high' | 'medium' | 'low',
    isDigitalBorn: boolean,
    hasText: boolean,
    avgTextDensity: number
  ): PDFAnalysis['confidence'] {
    let textExtractionConfidence = 0;
    let structureConfidence = 0;
    
    // Confianza en extracción de texto
    if (hasText) {
      if (textQuality === 'high') textExtractionConfidence = 0.9;
      else if (textQuality === 'medium') textExtractionConfidence = 0.7;
      else textExtractionConfidence = 0.4;
      
      if (isDigitalBorn) textExtractionConfidence += 0.1;
    }
    
    // Confianza en detección de estructura
    if (avgTextDensity > 300 && isDigitalBorn) {
      structureConfidence = 0.9;
    } else if (avgTextDensity > 150) {
      structureConfidence = 0.7;
    } else {
      structureConfidence = 0.5;
    }
    
    // Confianza general
    const overall = (textExtractionConfidence * 0.6 + structureConfidence * 0.4);
    
    return {
      textExtraction: Math.min(textExtractionConfidence, 1),
      structureDetection: Math.min(structureConfidence, 1),
      overall: Math.min(overall, 1)
    };
  }

  /**
   * Determina la estrategia de procesamiento recomendada
   */
  private determineStrategy(params: {
    isDigitalBorn: boolean;
    textQuality: 'high' | 'medium' | 'low';
    hasComplexTables: boolean;
    pageCount: number;
    confidence: number;
    documentType?: string;
  }): { strategy: 'llama-only' | 'mistral-llama'; reason: string } {
    const { 
      isDigitalBorn, 
      textQuality, 
      hasComplexTables, 
      pageCount, 
      confidence,
      documentType 
    } = params;
    
    // Razones para usar Mistral + Llama
    const reasons = {
      scanned: 'Documento escaneado detectado',
      lowQuality: 'Calidad de texto baja',
      complexTables: 'Tablas complejas detectadas',
      manyPages: 'Documento con muchas páginas',
      lowConfidence: 'Baja confianza en la extracción',
      complexDocument: 'Tipo de documento complejo'
    };
    
    // Casos donde definitivamente necesitamos Mistral
    if (!isDigitalBorn) {
      return { 
        strategy: 'mistral-llama', 
        reason: reasons.scanned 
      };
    }
    
    if (textQuality === 'low') {
      return { 
        strategy: 'mistral-llama', 
        reason: reasons.lowQuality 
      };
    }
    
    if (hasComplexTables) {
      return { 
        strategy: 'mistral-llama', 
        reason: reasons.complexTables 
      };
    }
    
    if (pageCount > ANALYSIS_THRESHOLDS.MAX_PAGES_FOR_LLAMA_ONLY) {
      return { 
        strategy: 'mistral-llama', 
        reason: reasons.manyPages 
      };
    }
    
    if (confidence < ANALYSIS_THRESHOLDS.MIN_CONFIDENCE_FOR_LLAMA) {
      return { 
        strategy: 'mistral-llama', 
        reason: reasons.lowConfidence 
      };
    }
    
    // Documentos específicos que se benefician de OCR especializado
    if (documentType && ['balance', 'extracto'].includes(documentType)) {
      return { 
        strategy: 'mistral-llama', 
        reason: reasons.complexDocument 
      };
    }
    
    // Por defecto, usar estrategia rápida con Llama
    return { 
      strategy: 'llama-only', 
      reason: 'Documento digital de alta calidad, procesamiento rápido recomendado' 
    };
  }

  /**
   * Analiza rápidamente las primeras páginas (para preview)
   */
  async quickAnalyze(pdfBuffer: Buffer): Promise<PDFAnalysisResult> {
    return this.analyzePDF(pdfBuffer, {
      quickMode: true,
      maxPages: 2,
      detectTables: false,
      detectLanguage: false
    });
  }
}

// Exportar instancia singleton
export const pdfAnalyzer = new PDFAnalyzerService();
