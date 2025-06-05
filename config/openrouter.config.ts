// Configuración para OpenRouter
export const OPENROUTER_CONFIG = {
  // Modelos disponibles
  models: {
    llama32_90b_vision: 'meta-llama/llama-3.2-90b-vision-instruct',
    llama32_11b_vision: 'meta-llama/llama-3.2-11b-vision-instruct',
    llama31_70b: 'meta-llama/llama-3.1-70b-instruct',
  },
  
  // Configuración por defecto
  defaults: {
    temperature: 0.1,      // Baja para respuestas consistentes
    max_tokens: 2000,      // Suficiente para documentos complejos
    top_p: 0.95,
    stream: false
  },
  
  // Límites y timeouts
  limits: {
    maxRetries: 3,
    retryDelay: 1000,      // 1 segundo
    timeout: 30000,        // 30 segundos
    maxImageSize: 20 * 1024 * 1024  // 20MB
  },
  
  // Headers requeridos
  headers: {
    referer: 'https://gestagent-app-production.up.railway.app',
    title: 'GESTAGENT Document Processing'
  },
  
  // Costos estimados (por millón de tokens)
  pricing: {
    'meta-llama/llama-3.2-90b-vision-instruct': {
      prompt: 0.90,     // $0.90 por millón de tokens de entrada
      completion: 0.90  // $0.90 por millón de tokens de salida
    },
    'meta-llama/llama-3.2-11b-vision-instruct': {
      prompt: 0.055,
      completion: 0.055
    }
  }
};

// Prompts optimizados para Llama
export const LLAMA_PROMPTS = {
  system: {
    validator: 'Eres un experto en análisis y validación de documentos financieros. Respondes SOLO con JSON válido, sin texto adicional.',
    extractor: 'Eres un experto en análisis visual de documentos financieros. Extraes información de imágenes y respondes SOLO con JSON válido.'
  },
  
  instructions: {
    extraction: `IMPORTANTE:
- Extrae TODOS los valores numéricos como números, no strings
- Las fechas deben estar en formato YYYY-MM-DD
- Si no encuentras un campo, déjalo como null o vacío
- Verifica que los cálculos matemáticos sean correctos`,
    
    validation: `INSTRUCCIONES:
1. Analiza el JSON y texto para identificar errores o inconsistencias
2. Corrige cualquier error encontrado
3. Asegúrate que los valores numéricos sean números, no strings
4. Verifica cálculos matemáticos (subtotales, impuestos, totales)
5. Extrae TODA la información relevante del documento`
  }
};

// Mapeo de tipos de documento
export const DOCUMENT_TYPE_MAPPING = {
  invoice: 'factura',
  payroll: 'nomina',
  receipt: 'recibo',
  statement: 'extracto',
  balance: 'balance'
};
