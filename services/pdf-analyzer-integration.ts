// Ejemplo de integración del PDF Analyzer en el flujo de procesamiento
import { pdfAnalyzer } from '@/services/pdf-analyzer';
import { PDFAnalysis } from '@/types/pdf-analysis';

/**
 * Ejemplo de uso del analizador en un endpoint API
 */
export async function analyzeDocumentEndpoint(pdfBuffer: Buffer) {
  // 1. Analizar el PDF
  const analysisResult = await pdfAnalyzer.analyzePDF(pdfBuffer, {
    detectTables: true,
    detectLanguage: true,
    quickMode: false
  });

  if (!analysisResult.success) {
    throw new Error(`Failed to analyze PDF: ${analysisResult.error}`);
  }

  const analysis = analysisResult.analysis;
  
  // 2. Registrar métricas del análisis
  console.log(`PDF Analysis completed in ${analysis.analysisTimeMs}ms`);
  console.log(`Strategy: ${analysis.recommendedStrategy} - ${analysis.strategyReason}`);
  
  // 3. Decidir flujo basado en la estrategia
  if (analysis.recommendedStrategy === 'llama-only') {
    return {
      strategy: 'llama-only',
      confidence: analysis.confidence.overall,
      estimatedTime: analysis.pageCount * 2000, // ~2 segundos por página
      analysis
    };
  } else {
    return {
      strategy: 'mistral-llama',
      confidence: analysis.confidence.overall,
      estimatedTime: analysis.pageCount * 5000, // ~5 segundos por página
      analysis
    };
  }
}

/**
 * Middleware para pre-análisis de documentos
 */
export async function documentPreAnalysisMiddleware(
  req: any,
  res: any,
  next: any
) {
  try {
    if (req.file && req.file.mimetype === 'application/pdf') {
      const analysis = await pdfAnalyzer.quickAnalyze(req.file.buffer);
      
      if (analysis.success) {
        // Adjuntar análisis a la request
        req.pdfAnalysis = analysis.analysis;
        
        // Enviar headers con información del análisis
        res.setHeader('X-PDF-Strategy', analysis.analysis.recommendedStrategy);
        res.setHeader('X-PDF-Pages', analysis.analysis.pageCount.toString());
        res.setHeader('X-PDF-Quality', analysis.analysis.textQuality);
      }
    }
    
    next();
  } catch (error) {
    console.error('Error in PDF pre-analysis:', error);
    next(); // Continuar sin análisis
  }
}

/**
 * Utilidad para logging y métricas
 */
export function logPDFAnalysis(analysis: PDFAnalysis, jobId: string) {
  const logData = {
    jobId,
    timestamp: new Date().toISOString(),
    strategy: analysis.recommendedStrategy,
    reason: analysis.strategyReason,
    pageCount: analysis.pageCount,
    textQuality: analysis.textQuality,
    confidence: analysis.confidence.overall,
    analysisTimeMs: analysis.analysisTimeMs,
    documentType: analysis.detectedDocumentType,
    language: analysis.documentLanguage
  };
  
  console.log('PDF Analysis Log:', JSON.stringify(logData, null, 2));
  
  // Aquí se podría enviar a un servicio de métricas
  // await metricsService.recordPDFAnalysis(logData);
}
