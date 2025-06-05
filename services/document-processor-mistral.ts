// Servicio MISTRAL OCR PURO: PDF → Mistral OCR → JSON Estructurado → Supabase
// Versión optimizada solo para Mistral AI

import axios from 'axios';

// CONFIGURACIÓN MISTRAL OCR
const MISTRAL_CONFIG = {
  API_KEY: 'l5Bb0bmH9MZZ8QKxfGzhGQDJ55zKQmm5',
  API_URL: 'https://api.mistral.ai/v1/chat/completions',
  MODEL: 'pixtral-12b-2409', // Modelo con capacidades de visión para OCR
  TIMEOUT: 120000 // 2 minutos
};

// DICCIONARIO DE SINÓNIMOS PARA FACTURAS (Español + Catalán)
const INVOICE_FIELD_SYNONYMS = {
  // NÚMERO DE FACTURA
  invoice_number: [
    'número de factura', 'numero de factura', 'núm. factura', 'num. factura', 'nº factura',
    'factura número', 'factura numero', 'factura nº', 'factura núm', 'invoice number',
    'número factura', 'numero factura', 'ref. factura', 'referencia factura'
  ],
  
  // FECHAS
  invoice_date: [
    'fecha', 'fecha emisión', 'fecha emision', 'fecha de emisión', 'fecha de emision',
    'fecha factura', 'emitida el', 'emisión', 'emision', 'date'
  ],
  
  due_date: [
    'fecha vencimiento', 'vencimiento', 'fecha límite', 'fecha limite', 'vence el',
    'fecha de vencimiento', 'fecha de pago', 'pago antes del', 'límite pago'
  ],
  
  // DATOS DEL EMISOR
  emitter_name: [
    'emisor', 'empresa', 'razón social', 'razon social', 'nombre empresa',
    'denominación social', 'denominacion social', 'entidad', 'compañía', 'compania'
  ],
  
  emitter_tax_id: [
    'cif', 'nif', 'nie', 'dni', 'código fiscal', 'codigo fiscal', 'id fiscal',
    'identificación fiscal', 'identificacion fiscal', 'tax id', 'vat number'
  ],
  
  emitter_address: [
    'dirección', 'direccion', 'domicilio', 'domicilio social', 'sede social',
    'dirección fiscal', 'direccion fiscal', 'calle', 'avenida', 'plaza'
  ],
  
  // DATOS DEL RECEPTOR/CLIENTE
  receiver_name: [
    'cliente', 'receptor', 'destinatario', 'facturar a', 'cliente final',
    'razón social cliente', 'razon social cliente', 'nombre cliente'
  ],
  
  receiver_tax_id: [
    'cif cliente', 'nif cliente', 'dni cliente', 'identificación cliente',
    'identificacion cliente', 'id fiscal cliente'
  ],
  
  // CONCEPTOS Y TOTALES
  line_items: [
    'conceptos', 'detalle', 'descripción', 'descripcion', 'artículo', 'articulo',
    'producto', 'servicio', 'partida', 'línea', 'linea', 'item'
  ],
  
  subtotal: [
    'base imponible', 'subtotal', 'suma', 'total sin iva', 'total sin IVA',
    'importe sin impuestos', 'base gravable', 'taxable amount'
  ],
  
  tax_amount: [
    'importe iva', 'cantidad iva', 'iva aplicado', 'impuestos', 'tax amount',
    'cuota iva', 'iva repercutido'
  ],
  
  total_amount: [
    'total', 'total factura', 'importe total', 'total a pagar', 'gran total',
    'total final', 'total general', 'total amount', 'final amount'
  ]
};

interface MistralOCRResult {
  success: boolean;
  jobId: string;
  extracted_data: any;
  raw_text: string;
  processing_metadata: {
    mistral_ocr_time_ms: number;
    total_time_ms: number;
    confidence: number;
    document_type: string;
    model_used: string;
    method: 'mistral-ocr-pure';
  };
}

export class DocumentProcessorMistral {
  private apiKey: string = MISTRAL_CONFIG.API_KEY;
  private model: string = MISTRAL_CONFIG.MODEL;

  constructor() {
    console.log('🎯 [MistralOCR] Iniciando modo MISTRAL OCR PURO');
    console.log(`🔑 [MistralOCR] API Key configurada: ${this.apiKey ? 'SÍ' : 'NO'}`);
    console.log(`🤖 [MistralOCR] Modelo: ${this.model}`);
    console.log('📄 [MistralOCR] Flujo: PDF → Base64 → Mistral Vision OCR → JSON');
    console.log('✅ [MistralOCR] Sin dependencias externas - Solo Mistral');
  }

  /**
   * Procesar documento PDF con Mistral OCR
   * FLUJO: PDF → Base64 → Mistral OCR → JSON Estructurado
   */
  async processDocument(pdfBuffer: Buffer, documentType: string = 'factura'): Promise<MistralOCRResult> {
    const startTime = Date.now();
    const jobId = `mistral_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`[MistralOCR] 🚀 Iniciando procesamiento MISTRAL OCR para job ${jobId}`);
    console.log(`[MistralOCR] Flujo: PDF → Mistral Vision OCR → JSON estructurado`);
    console.log(`[MistralOCR] Tipo de documento: ${documentType}`);
    console.log(`[MistralOCR] Tamaño del PDF: ${pdfBuffer.length} bytes`);

    try {
      // ÚNICO PASO: Enviar PDF a Mistral OCR
      const mistralResult = await this.sendToMistralOCR(pdfBuffer, documentType);
      
      if (!mistralResult.success) {
        throw new Error(`Error en Mistral OCR: ${JSON.stringify(mistralResult)}`);
      }

      console.log(`[MistralOCR] ✅ Mistral OCR completado en ${mistralResult.processing_time_ms}ms`);
      console.log(`[MistralOCR] Texto extraído: ${mistralResult.raw_text.length} caracteres`);
      console.log(`[MistralOCR] Confianza: ${((mistralResult.confidence || 0) * 100).toFixed(2)}%`);

      const totalTime = Date.now() - startTime;

      // Validar que tenemos datos extraídos reales
      if (!mistralResult.extracted_data || Object.keys(mistralResult.extracted_data).length === 0) {
        throw new Error('Mistral OCR no pudo extraer datos del documento');
      }

      // Retornar resultado final
      return {
        success: true,
        jobId,
        extracted_data: mistralResult.extracted_data,
        raw_text: mistralResult.raw_text,
        processing_metadata: {
          mistral_ocr_time_ms: mistralResult.processing_time_ms,
          total_time_ms: totalTime,
          confidence: mistralResult.confidence || 0.90,
          document_type: mistralResult.document_type || documentType,
          model_used: this.model,
          method: 'mistral-ocr-pure'
        }
      };

    } catch (error) {
      console.error(`[MistralOCR] ❌ ERROR CRÍTICO en procesamiento:`, error);
      throw new Error(`Procesamiento Mistral OCR falló: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Enviar PDF a Mistral OCR con Pixtral (modelo de visión)
   */
  private async sendToMistralOCR(pdfBuffer: Buffer, documentType: string): Promise<any> {
    const startTime = Date.now();

    try {
      // Convertir PDF a base64
      const pdfBase64 = pdfBuffer.toString('base64');
      
      console.log(`[MistralOCR] 📤 Enviando PDF base64 a Mistral OCR...`);
      console.log(`[MistralOCR] 📄 PDF procesado: ${pdfBase64.length} caracteres base64`);

      // Construir prompt especializado para OCR de facturas
      const systemPrompt = this.buildMistralOCRPrompt(documentType);

      const response = await axios.post(MISTRAL_CONFIG.API_URL, {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Realiza OCR completo de este documento ${documentType} y extrae TODOS los campos usando el diccionario de sinónimos. Devuelve SOLO el JSON estructurado.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0.1
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: MISTRAL_CONFIG.TIMEOUT
      });

      console.log(`[MistralOCR] 📥 Respuesta recibida de Mistral OCR`);

      const content = response.data.choices[0]?.message?.content || '';
      
      if (!content) {
        throw new Error('Mistral OCR no devolvió contenido');
      }
      
      // Extraer JSON del contenido
      let extractedData;
      let rawText = content;
      
      try {
        // Buscar JSON en la respuesta
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No se encontró JSON válido en la respuesta de Mistral OCR');
        }
      } catch (parseError) {
        console.error('[MistralOCR] ❌ Error parsing JSON de Mistral OCR:', parseError);
        throw new Error(`Error analizando respuesta de Mistral OCR: ${parseError instanceof Error ? parseError.message : 'Error desconocido'}`);
      }

      // Validar que tenemos datos mínimos
      if (!extractedData || typeof extractedData !== 'object') {
        throw new Error('Los datos extraídos por Mistral OCR no son válidos');
      }

      return {
        success: true,
        extracted_data: extractedData,
        raw_text: rawText,
        processing_time_ms: Date.now() - startTime,
        document_type: extractedData.document_type || documentType,
        confidence: 0.90
      };

    } catch (error: any) {
      console.error('[MistralOCR] ❌ Error llamando a Mistral OCR:', error.response?.data || error.message);
      throw new Error(`Mistral OCR API error: ${error.message}`);
    }
  }

  /**
   * Construir prompt específico para Mistral OCR
   */
  private buildMistralOCRPrompt(documentType: string): string {
    if (documentType === 'factura') {
      return `Eres un experto en OCR de facturas españolas y catalanas usando Mistral AI.

DICCIONARIO DE SINÓNIMOS - Reconoce estos términos alternativos:
${Object.entries(INVOICE_FIELD_SYNONYMS).map(([key, synonyms]) => 
  `• ${key}: ${synonyms.slice(0, 6).join(', ')}`).join('\n')}

INSTRUCCIONES OCR:
1. Realiza OCR completo del documento PDF
2. Extrae TODOS los campos de texto visibles
3. Usa el diccionario de sinónimos para identificar campos
4. Presta especial atención a números, fechas, nombres, direcciones
5. Para importes, extrae solo números sin símbolos de moneda
6. Para fechas, convierte a formato YYYY-MM-DD
7. Si un campo no está visible, usa null

ESTRUCTURA JSON REQUERIDA (devuelve SOLO este JSON):
{
  "document_type": "factura",
  "extraction_timestamp": "${new Date().toISOString()}",
  "document_info": {
    "number": "número de factura exacto",
    "date": "YYYY-MM-DD",
    "due_date": "YYYY-MM-DD",
    "series": "serie si existe",
    "currency": "EUR"
  },
  "emitter": {
    "name": "razón social completa del emisor",
    "tax_id": "CIF/NIF del emisor",
    "address": "dirección completa",
    "postal_code": "código postal",
    "city": "ciudad",
    "province": "provincia",
    "phone": "teléfono",
    "email": "email"
  },
  "receiver": {
    "name": "razón social del receptor/cliente",
    "tax_id": "CIF/NIF del cliente",
    "address": "dirección del cliente",
    "postal_code": "CP cliente",
    "city": "ciudad cliente"
  },
  "line_items": [
    {
      "description": "descripción del concepto",
      "quantity": número_cantidad,
      "unit_price": número_precio_unitario,
      "total": número_total_línea
    }
  ],
  "totals": {
    "subtotal": número_base_imponible,
    "tax_rate": número_tipo_iva,
    "tax_amount": número_cuota_iva,
    "total": número_total_final,
    "currency": "EUR"
  },
  "payment": {
    "method": "forma de pago",
    "bank_account": "IBAN completo"
  },
  "metadata": {
    "confidence_score": 0.90,
    "processing_method": "mistral-ocr-pixtral",
    "extracted_fields": número_campos_extraídos
  }
}

Realiza OCR del documento PDF y devuelve ÚNICAMENTE el JSON con los datos extraídos.`;
    }
    
    return `Realiza OCR de este documento ${documentType} y extrae todos los datos relevantes en formato JSON estructurado.`;
  }
}

// Instancia singleton
export const mistralProcessor = new DocumentProcessorMistral(); 