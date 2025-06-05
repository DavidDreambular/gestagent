// Tipos para el análisis de PDFs
export interface PDFAnalysis {
  // Características básicas del PDF
  isDigitalBorn: boolean;        // True si el PDF es nativo digital, false si es escaneado
  pageCount: number;              // Número total de páginas
  hasExtractableText: boolean;    // True si tiene texto extraíble
  fileSize: number;               // Tamaño del archivo en bytes
  
  // Calidad del contenido
  textQuality: 'high' | 'medium' | 'low';  // Calidad del texto detectado
  hasComplexTables: boolean;                // Presencia de tablas complejas
  hasImages: boolean;                       // Contiene imágenes embebidas
  averageTextDensity: number;              // Densidad promedio de texto (caracteres por página)
  
  // Información del documento
  documentLanguage: string;                 // Idioma detectado (es, en, etc.)
  detectedDocumentType?: string;           // Tipo de documento detectado (factura, nómina, etc.)
  
  // Métricas de calidad
  confidence: {
    textExtraction: number;     // 0-1, confianza en la extracción de texto
    structureDetection: number; // 0-1, confianza en la detección de estructura
    overall: number;           // 0-1, confianza general
  };
  
  // Recomendación del sistema
  recommendedStrategy: 'llama-only' | 'mistral-llama';
  strategyReason: string;         // Explicación de por qué se recomienda esta estrategia
  
  // Tiempos de análisis
  analysisTimeMs: number;         // Tiempo que tomó el análisis
}

// Opciones para el análisis
export interface PDFAnalysisOptions {
  quickMode?: boolean;            // Modo rápido, analiza solo primeras páginas
  detectTables?: boolean;         // Detectar tablas complejas
  detectLanguage?: boolean;       // Detectar idioma
  maxPages?: number;             // Máximo de páginas a analizar
}

// Resultado del análisis con posibles errores
export type PDFAnalysisResult = 
  | { success: true; analysis: PDFAnalysis }
  | { success: false; error: string };

// Umbrales para decisiones
export const ANALYSIS_THRESHOLDS = {
  MIN_TEXT_QUALITY_FOR_LLAMA: 0.7,      // Calidad mínima para usar solo Llama
  MIN_TEXT_DENSITY: 100,                 // Caracteres mínimos por página
  MAX_PAGES_FOR_LLAMA_ONLY: 5,          // Máximo de páginas para estrategia rápida
  COMPLEX_TABLE_THRESHOLD: 3,           // Número de tablas para considerar complejo
  MIN_CONFIDENCE_FOR_LLAMA: 0.85,       // Confianza mínima para usar solo Llama
} as const;
