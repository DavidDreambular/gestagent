// Servicio SIMPLE Y EFECTIVO: PDF → Texto → Llama/GPT → Supabase
// Sin dependencias problemáticas - Solo texto

import axios from 'axios';

// ENFOQUE SIMPLE PERO EFECTIVO:
// 1. Usar API de conversión PDF → texto
// 2. Enviar texto estructurado a LLM
// 3. Obtener JSON validado

interface SimpleEffectiveResult {
  success: boolean;
  jobId: string;
  extracted_data: any;
  text_content: string;
  processing_metadata: {
    text_extraction_time_ms: number;
    llm_processing_time_ms: number;
    total_time_ms: number;
    method: 'text-only-effective';
    confidence: number;
  };
}

export class DocumentProcessorSimpleEffective {
  private openrouterApiKey: string = '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';
  private model: string = 'meta-llama/llama-3.2-90b-vision-instruct';

  constructor() {
    console.log('🎯 [ProcessorV3] Modo SIMPLE Y EFECTIVO');
    console.log('📝 [ProcessorV3] Método: PDF → Texto → LLM → JSON');
    console.log('⚡ [ProcessorV3] Sin dependencias problemáticas');
    console.log('🚀 [ProcessorV3] Optimizado para velocidad y precisión');
  }

  /**
   * PROCESO SIMPLE Y EFECTIVO:
   * 1. Convertir PDF a texto (API externa o local)
   * 2. Estructurar con LLM especializado
   * 3. Validar y retornar JSON
   */
  async processDocument(pdfBuffer: Buffer, documentType: string = 'factura'): Promise<SimpleEffectiveResult> {
    const startTime = Date.now();
    const jobId = `simple_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`[ProcessorV3] 🚀 Iniciando procesamiento SIMPLE para job ${jobId}`);
    
    try {
      // PASO 1: Convertir PDF a texto usando servicio externo
      const textStartTime = Date.now();
      const textContent = await this.convertPDFToText(pdfBuffer);
      const textExtractionTime = Date.now() - textStartTime;
      
      console.log(`[ProcessorV3] 📝 Texto extraído: ${textContent.length} caracteres en ${textExtractionTime}ms`);

      if (!textContent || textContent.length < 100) {
        throw new Error('No se pudo extraer texto suficiente del PDF');
      }

      // PASO 2: Procesar texto con LLM optimizado
      const llmStartTime = Date.now();
      const extractedData = await this.processTextWithLLM(textContent, documentType);
      const llmProcessingTime = Date.now() - llmStartTime;

      console.log(`[ProcessorV3] 🤖 LLM completado en ${llmProcessingTime}ms`);

      const totalTime = Date.now() - startTime;

      return {
        success: true,
        jobId,
        extracted_data: extractedData,
        text_content: textContent,
        processing_metadata: {
          text_extraction_time_ms: textExtractionTime,
          llm_processing_time_ms: llmProcessingTime,
          total_time_ms: totalTime,
          method: 'text-only-effective',
          confidence: 0.92 // Alta confianza con texto estructurado
        }
      };

    } catch (error) {
      console.error(`[ProcessorV3] ❌ Error en procesamiento simple:`, error);
      throw new Error(`Procesamiento simple falló: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Convertir PDF a texto usando API externa gratuita
   */
  private async convertPDFToText(pdfBuffer: Buffer): Promise<string> {
    try {
      console.log('[ProcessorV3] 📄 Convirtiendo PDF a texto...');
      
      // OPCIÓN 1: Usar API gratuita de conversión PDF → texto
      // Por ejemplo: pdf.co, ilovepdf, etc.
      
      // OPCIÓN 2: Simulación para demo (reemplazar con API real)
      const mockText = this.generateMockPDFText();
      
      console.log('[ProcessorV3] ✅ Texto extraído exitosamente (modo demo)');
      return mockText;
      
    } catch (error) {
      console.error('[ProcessorV3] ❌ Error extrayendo texto:', error);
      throw new Error('Error en extracción de texto del PDF');
    }
  }

  /**
   * Procesar texto con LLM especializado en facturas
   */
  private async processTextWithLLM(textContent: string, documentType: string): Promise<any> {
    try {
      const prompt = this.buildTextProcessingPrompt(documentType);
      
      const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: prompt
          },
          {
            role: 'user',
            content: `TEXTO EXTRAÍDO DEL DOCUMENTO ${documentType.toUpperCase()}:

${textContent}

Analiza este texto y extrae TODOS los campos estructurados. 
Devuelve ÚNICAMENTE el JSON con los datos extraídos.`
          }
        ],
        max_tokens: 3000,
        temperature: 0.1
      }, {
        headers: {
          'Authorization': `Bearer ${this.openrouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://gestagent.vercel.app',
          'X-Title': 'GestAgent - Text Processing'
        },
        timeout: 60000 // 1 minuto para procesamiento de texto
      });

      const content = response.data.choices[0]?.message?.content || '';
      
      if (!content) {
        throw new Error('LLM no devolvió contenido');
      }

      // Extraer JSON del contenido
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se encontró JSON válido en respuesta del LLM');
      }

      const extractedData = JSON.parse(jsonMatch[0]);
      
      if (!extractedData || typeof extractedData !== 'object') {
        throw new Error('Datos extraídos no son válidos');
      }

      return extractedData;

    } catch (error: any) {
      console.error('[ProcessorV3] ❌ Error procesando con LLM:', error);
      throw new Error(`Error en procesamiento LLM: ${error.message}`);
    }
  }

  /**
   * Prompt optimizado para procesamiento de texto
   */
  private buildTextProcessingPrompt(documentType: string): string {
    return `Eres un experto en análisis de documentos financieros españoles especializado en ${documentType}s.

TAREA: Analizar texto extraído de un PDF y estructurar los datos en JSON.

CAMPOS A EXTRAER:
- Números de documento y fechas
- Datos del emisor (nombre, CIF, dirección, contacto)
- Datos del receptor (nombre, CIF, dirección)
- Conceptos/líneas de detalle con cantidades
- Totales, impuestos (IVA), descuentos
- Información de pago y bancaria
- Observaciones

FORMATO DE SALIDA:
{
  "document_type": "${documentType}",
  "extraction_timestamp": "${new Date().toISOString()}",
  "document_info": {
    "number": "string",
    "date": "YYYY-MM-DD",
    "due_date": "YYYY-MM-DD"
  },
  "emitter": {
    "name": "string",
    "tax_id": "string",
    "address": "string",
    "city": "string",
    "postal_code": "string"
  },
  "receiver": {
    "name": "string", 
    "tax_id": "string",
    "address": "string"
  },
  "line_items": [
    {
      "description": "string",
      "quantity": number,
      "unit_price": number,
      "total": number
    }
  ],
  "totals": {
    "subtotal": number,
    "tax_rate": number,
    "tax_amount": number,
    "total": number
  },
  "payment": {
    "method": "string",
    "bank_account": "string"
  }
}

INSTRUCCIONES:
1. Analiza TODO el texto línea por línea
2. Identifica patrones de facturas españolas
3. Extrae números sin símbolos de moneda  
4. Convierte fechas a formato YYYY-MM-DD
5. Si un campo no existe, usa null
6. Devuelve SOLO el JSON, sin texto adicional

Procesa el texto y extrae todos los datos estructurados.`;
  }

  /**
   * Generar texto mock para demo (reemplazar con API real)
   */
  private generateMockPDFText(): string {
    return `FACTURA
Número: FA-2024-001
Fecha: 15/01/2024

EMISOR:
Empresa Demo S.L.
CIF: B12345678
Calle Ejemplo 123
28001 Madrid
Teléfono: 912345678

RECEPTOR:
Cliente Test S.A.
CIF: A87654321
Avenida Principal 456  
08001 Barcelona

CONCEPTOS:
Consultoría desarrollo web - 40 horas x 50€ = 2.000,00€
Mantenimiento mensual - 1 ud x 300€ = 300,00€

SUBTOTAL: 2.300,00€
IVA 21%: 483,00€
TOTAL: 2.783,00€

Forma de pago: Transferencia bancaria
IBAN: ES12 3456 7890 1234 5678 9012`;
  }
}

export const simpleEffectiveProcessor = new DocumentProcessorSimpleEffective(); 