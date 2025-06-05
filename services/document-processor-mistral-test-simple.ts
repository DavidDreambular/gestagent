// Servicio MISTRAL DOCUMENT UNDERSTANDING - VERSION TEST SIMPLIFICADA
// Para test end-to-end sin dependencias de Supabase Storage

import axios from 'axios';

// CONFIGURACIÓN MISTRAL DOCUMENT UNDERSTANDING
const MISTRAL_CONFIG = {
  API_KEY: 'l5Bb0bmH9MZZ8QKxfGzhGQDJ55zKQmm5',
  API_URL: 'https://api.mistral.ai/v1/chat/completions',
  MODEL: 'mistral-small-latest',
  TIMEOUT: 180000 // 3 minutos
};

// DICCIONARIO COMPLETO DE SINÓNIMOS PARA FACTURAS
const FACTURA_PROMPT_SPANISH = `
Extrae la siguiente información de esta factura española y devuelve un JSON estructurado:

{
  "invoice_number": "número de factura",
  "issue_date": "fecha de emisión",
  "due_date": "fecha de vencimiento",
  "supplier": {
    "name": "nombre del emisor/proveedor",
    "nif_cif": "NIF/CIF del emisor",
    "address": "dirección completa del emisor",
    "phone": "teléfono del emisor",
    "email": "email del emisor"
  },
  "customer": {
    "name": "nombre del cliente/receptor",
    "nif_cif": "NIF/CIF del cliente",
    "address": "dirección completa del cliente"
  },
  "items": [
    {
      "description": "descripción del producto/servicio",
      "quantity": "cantidad",
      "unit_price": "precio unitario",
      "tax_rate": "porcentaje de IVA",
      "total": "total del item"
    }
  ],
  "totals": {
    "subtotal": "subtotal sin IVA",
    "tax_amount": "importe del IVA",
    "total": "total general"
  },
  "payment_method": "método de pago",
  "notes": "observaciones o notas adicionales"
}

IMPORTANTE: 
- Busca variantes en español y catalán de los campos
- Números de factura pueden estar como: "Núm. Factura", "Nº", "Fact.", "Invoice", etc.
- Fechas en formato DD/MM/YYYY o DD-MM-YYYY
- Importes siempre como números sin símbolos de moneda
- Si un campo no existe, usar null
`;

interface MistralDocumentResult {
  success: boolean;
  jobId: string;
  extracted_data: any;
  test_url?: string;
  processing_metadata: {
    mistral_processing_time_ms: number;
    total_time_ms: number;
    method: 'mistral-document-understanding-test';
    confidence: number;
  };
}

export class MistralDocumentProcessorTest {
  private apiKey: string = MISTRAL_CONFIG.API_KEY;
  private apiUrl: string = MISTRAL_CONFIG.API_URL;
  private model: string = MISTRAL_CONFIG.MODEL;

  constructor() {
    console.log('✅ [MistralTest] Inicializando Mistral Document Understanding TEST');
    console.log(`📋 [MistralTest] Modelo: ${this.model}`);
    console.log(`🔗 [MistralTest] Endpoint: ${this.apiUrl}`);
  }

  /**
   * Procesar documento usando URL de test externa (sin Supabase)
   */
  private async processWithMistralDoc(documentUrl: string, documentType: string): Promise<any> {
    const startTime = Date.now();
    console.log(`🔄 [MistralTest] Procesando con Mistral Document Understanding...`);

    try {
      const prompt = documentType === 'factura' ? FACTURA_PROMPT_SPANISH : 
        'Extrae toda la información relevante de este documento y estructúrala en JSON.';

      const payload = {
        model: this.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'document_url',
                document_url: documentUrl
              }
            ]
          }
        ],
        document_image_limit: 8,
        document_page_limit: 64,
        temperature: 0.1,
        max_tokens: 4000
      };

      console.log(`📡 [MistralTest] Enviando request a Mistral...`);
      
      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: MISTRAL_CONFIG.TIMEOUT
      });

      const processingTime = Date.now() - startTime;
      console.log(`✅ [MistralTest] Respuesta recibida en ${processingTime}ms`);

      const extractedText = response.data.choices[0].message.content;
      console.log(`📄 [MistralTest] Contenido extraído: ${extractedText.substring(0, 200)}...`);

      // Intentar parsear JSON de la respuesta
      let structuredData;
      try {
        const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          structuredData = JSON.parse(jsonMatch[0]);
          console.log(`✅ [MistralTest] JSON estructurado parseado correctamente`);
        } else {
          structuredData = {
            raw_text: extractedText,
            extraction_method: 'mistral-document-understanding-test',
            processed_at: new Date().toISOString()
          };
          console.log(`⚠️ [MistralTest] No se encontró JSON, usando texto raw`);
        }
      } catch (parseError: any) {
        console.warn(`⚠️ [MistralTest] Error parseando JSON:`, parseError);
        structuredData = {
          raw_text: extractedText,
          extraction_method: 'mistral-document-understanding-test',
          processed_at: new Date().toISOString(),
          parse_error: parseError?.message || 'Error desconocido parseando JSON'
        };
      }

      return {
        structured_data: structuredData,
        raw_response: extractedText,
        processing_time_ms: processingTime,
        usage: response.data.usage
      };

    } catch (error: any) {
      console.error('❌ [MistralTest] Error procesando documento:', error);
      
      if (error?.response) {
        console.error('❌ [MistralTest] Response error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
      
      throw new Error(`Error en Mistral Document Understanding: ${error?.message || 'Error desconocido'}`);
    }
  }

  /**
   * Test directo con URL externa (arxiv paper)
   */
  async testWithExternalDocument(jobId?: string): Promise<MistralDocumentResult> {
    const totalStartTime = Date.now();
    const finalJobId = jobId || `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // URL de test externa (paper académico público)
    const testUrl = 'https://arxiv.org/pdf/1805.04770';

    console.log(`🧪 [MistralTest] Iniciando test con documento externo`);
    console.log(`📋 [MistralTest] Job ID: ${finalJobId}`);
    console.log(`🔗 [MistralTest] URL: ${testUrl}`);

    try {
      const mistralResult = await this.processWithMistralDoc(testUrl, 'documento');
      const totalTime = Date.now() - totalStartTime;

      console.log(`✅ [MistralTest] Test completado en ${totalTime}ms`);

      return {
        success: true,
        jobId: finalJobId,
        extracted_data: mistralResult.structured_data,
        test_url: testUrl,
        processing_metadata: {
          mistral_processing_time_ms: mistralResult.processing_time_ms,
          total_time_ms: totalTime,
          method: 'mistral-document-understanding-test',
          confidence: 0.95
        }
      };

    } catch (error: any) {
      console.error(`❌ [MistralTest] Error en test:`, error);

      return {
        success: false,
        jobId: finalJobId,
        extracted_data: {
          error: error?.message || 'Error desconocido',
          error_type: 'mistral_test_error',
          timestamp: new Date().toISOString()
        },
        processing_metadata: {
          mistral_processing_time_ms: 0,
          total_time_ms: Date.now() - totalStartTime,
          method: 'mistral-document-understanding-test',
          confidence: 0
        }
      };
    }
  }
}

// Instancia para usar en tests
export const mistralTestProcessor = new MistralDocumentProcessorTest(); 