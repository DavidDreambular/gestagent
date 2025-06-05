// PROCESADOR MISTRAL OPTIMIZADO PARA MÚLTIPLES FACTURAS
// services/document-processor-mistral-enhanced.ts

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MISTRAL_CONFIG = {
  API_KEY: process.env.MISTRAL_API_KEY!,
  API_URL: 'https://api.mistral.ai/v1/chat/completions',
  MODEL: 'mistral-small-latest',
  TIMEOUT: 180000 // 3 minutos para documentos grandes
};

// PROMPT ULTRA OPTIMIZADO PARA DETECTAR TODAS LAS FACTURAS
const ENHANCED_FACTURA_PROMPT = `
MISIÓN CRÍTICA: DETECTAR Y EXTRAER TODAS LAS FACTURAS EN ESTE DOCUMENTO

Este documento puede contener MÚLTIPLES FACTURAS en MÚLTIPLES PÁGINAS. Tu objetivo es:
1. ESCANEAR COMPLETAMENTE todas las páginas del documento
2. IDENTIFICAR cada factura individual (incluso si están en páginas separadas)
3. EXTRAER información completa de CADA UNA

PATRONES DE DETECCIÓN DE MÚLTIPLES FACTURAS:
- Busca repetición de elementos clave: números de factura, fechas, totales
- Cada página puede contener una factura completa
- Algunas facturas pueden ocupar 2-3 páginas consecutivas
- Busca separadores visuales entre facturas
- Identifica cambios en proveedores, clientes o fechas como indicador de nueva factura

ALGORITMO DE DETECCIÓN:
1. Lee TODO el documento página por página
2. Identifica CADA número de factura único
3. Para cada número de factura, extrae TODO su contenido asociado
4. Agrupa información que pertenece a la misma factura
5. Separa facturas diferentes claramente

ESTRUCTURA JSON REQUERIDA:
Si encuentras MÚLTIPLES FACTURAS, devuelve un ARRAY:
[
  {
    "invoice_number": "número_1",
    "issue_date": "DD/MM/YYYY",
    "page_range": "páginas donde aparece esta factura",
    "supplier": { ... },
    "customer": { ... },
    "items": [ ... ],
    "tax_breakdown": [ ... ],
    "totals": { ... }
  },
  {
    "invoice_number": "número_2",
    "issue_date": "DD/MM/YYYY", 
    "page_range": "páginas donde aparece esta factura",
    "supplier": { ... },
    "customer": { ... },
    "items": [ ... ],
    "tax_breakdown": [ ... ],
    "totals": { ... }
  }
]

CAMPOS OBLIGATORIOS PARA CADA FACTURA:
{
  "invoice_number": "OBLIGATORIO - número único de factura",
  "issue_date": "DD/MM/YYYY",
  "due_date": "DD/MM/YYYY o null",
  "page_range": "ej: 'página 1-2' o 'página 5'",
  "document_sequence": "número secuencial en el documento (1, 2, 3...)",
  "supplier": {
    "name": "OBLIGATORIO",
    "nif_cif": "identificador fiscal",
    "address": "dirección completa",
    "postal_code": "CP",
    "city": "ciudad",
    "province": "provincia",
    "phone": "teléfono",
    "email": "email"
  },
  "customer": {
    "name": "OBLIGATORIO",
    "nif_cif": "identificador fiscal",
    "address": "dirección completa", 
    "postal_code": "CP",
    "city": "ciudad",
    "province": "provincia"
  },
  "items": [
    {
      "description": "descripción detallada",
      "quantity": número,
      "unit_price": número,
      "subtotal": número,
      "tax_rate": porcentaje,
      "tax_amount": número,
      "total": número
    }
  ],
  "tax_breakdown": [
    {
      "tax_rate": porcentaje,
      "tax_base": base_imponible,
      "tax_amount": importe_iva,
      "description": "tipo de IVA"
    }
  ],
  "totals": {
    "subtotal": número,
    "total_tax_amount": número,
    "total": número,
    "discount": número
  },
  "payment_method": "método de pago",
  "payment_terms": "condiciones",
  "notes": "observaciones",
  "currency": "EUR",
  "extraction_confidence": 0.95
}

INSTRUCCIONES CRÍTICAS:
1. ⚠️ NO TE DETENGAS en la primera factura - SIGUE LEYENDO todo el documento
2. ⚠️ CUENTA cuántas facturas diferentes has encontrado antes de responder
3. ⚠️ Si ves el mismo número de factura repetido, es UNA SOLA factura extendida
4. ⚠️ Si ves números de factura DIFERENTES, son facturas SEPARADAS
5. ⚠️ Incluye campo "document_sequence" para ordenar las facturas
6. ⚠️ Incluye campo "page_range" para saber dónde está cada factura

VALIDACIÓN FINAL:
Antes de devolver el JSON, VERIFICA:
- ¿Has revisado TODAS las páginas del documento?
- ¿Cada factura tiene un "invoice_number" único?
- ¿El array contiene TODAS las facturas que mencionas?
- ¿Los totales suman correctamente?

FORMATO DE SALIDA:
Devuelve SOLO el JSON válido (array si hay múltiples facturas, objeto si hay una sola).
NO incluyas explicaciones, markdown o texto adicional.
`;

interface EnhancedMistralResult {
  success: boolean;
  jobId: string;
  extracted_data: any;
  document_url?: string;
  total_invoices_detected: number;
  processing_metadata: {
    upload_time_ms: number;
    mistral_processing_time_ms: number;
    total_time_ms: number;
    method: 'mistral-document-understanding-enhanced';
    confidence: number;
    document_pages?: number;
    max_tokens_used?: number;
    invoices_found: number;
  };
}

export class EnhancedMistralProcessor {
  private apiKey: string = MISTRAL_CONFIG.API_KEY;
  private apiUrl: string = MISTRAL_CONFIG.API_URL;
  private model: string = MISTRAL_CONFIG.MODEL;

  constructor() {
    console.log('🚀 [MistralEnhanced] Inicializando procesador optimizado para múltiples facturas');
    console.log(`📋 [MistralEnhanced] Modelo: ${this.model}`);
    console.log(`🔗 [MistralEnhanced] Endpoint: ${this.apiUrl}`);
  }

  private async uploadToStorage(pdfBuffer: Buffer, jobId: string): Promise<string> {
    const startTime = Date.now();
    console.log(`📤 [MistralEnhanced] Subiendo PDF a Supabase Storage...`);

    try {
      const fileName = `documents/${jobId}/original.pdf`;
      
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(fileName, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (error) {
        throw new Error(`Error al subir a Storage: ${error.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      const uploadTime = Date.now() - startTime;
      console.log(`✅ [MistralEnhanced] PDF subido en ${uploadTime}ms`);
      console.log(`🔗 [MistralEnhanced] URL: ${urlData.publicUrl}`);

      return urlData.publicUrl;
    } catch (error) {
      console.error('❌ [MistralEnhanced] Error al subir PDF:', error);
      throw error;
    }
  }

  private async processWithMistralEnhanced(documentUrl: string): Promise<any> {
    const startTime = Date.now();
    console.log(`🔄 [MistralEnhanced] Procesando con configuración optimizada...`);

    try {
      const payload = {
        model: this.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: ENHANCED_FACTURA_PROMPT
              },
              {
                type: 'document_url',
                document_url: documentUrl
              }
            ]
          }
        ],
        // CONFIGURACIÓN OPTIMIZADA PARA DOCUMENTOS GRANDES
        document_image_limit: 16, // Aumentado para más páginas
        document_page_limit: 128, // Aumentado significativamente
        temperature: 0.05, // Muy baja para máxima consistencia
        max_tokens: 8000, // Aumentado para múltiples facturas
        top_p: 0.9
      };

      console.log(`📡 [MistralEnhanced] Enviando request optimizado...`);
      console.log(`📊 [MistralEnhanced] Límites: ${payload.document_page_limit} páginas, ${payload.max_tokens} tokens`);
      
      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: MISTRAL_CONFIG.TIMEOUT
      });

      const processingTime = Date.now() - startTime;
      console.log(`✅ [MistralEnhanced] Respuesta recibida en ${processingTime}ms`);

      const extractedText = response.data.choices[0].message.content;
      console.log(`📄 [MistralEnhanced] Contenido extraído: ${extractedText.substring(0, 300)}...`);
      console.log(`📏 [MistralEnhanced] Longitud total: ${extractedText.length} caracteres`);

      // PARSEO MEJORADO CON DETECCIÓN DE MÚLTIPLES FACTURAS
      let structuredData;
      let totalInvoicesDetected = 0;

      try {
        // Limpiar y extraer JSON
        let jsonText = extractedText;
        
        // Buscar JSON en bloques de código
        const jsonBlockMatch = extractedText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonBlockMatch) {
          jsonText = jsonBlockMatch[1];
          console.log('📋 [MistralEnhanced] JSON encontrado en bloque de código');
        } else {
          // Buscar array o objeto JSON en texto libre
          const jsonMatch = extractedText.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
          if (jsonMatch) {
            jsonText = jsonMatch[1];
            console.log('📋 [MistralEnhanced] JSON encontrado en texto libre');
          }
        }
        
        // Limpiar JSON
        jsonText = jsonText
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
          .replace(/\n\s*\/\/.*$/gm, '')
          .replace(/,\s*([}\]])/g, '$1')
          .trim();

        // Parsear JSON
        structuredData = JSON.parse(jsonText);

        // Contar facturas detectadas
        if (Array.isArray(structuredData)) {
          totalInvoicesDetected = structuredData.length;
          console.log(`🎯 [MistralEnhanced] ${totalInvoicesDetected} facturas detectadas en array`);
          
          // Enriquecer cada factura
          structuredData = structuredData.map((invoice, index) => ({
            ...invoice,
            document_sequence: index + 1,
            extraction_confidence: 0.95,
            currency: invoice.currency || 'EUR'
          }));
        } else {
          totalInvoicesDetected = 1;
          console.log(`🎯 [MistralEnhanced] 1 factura detectada (objeto único)`);
          
          // Enriquecer factura única
          structuredData = {
            ...structuredData,
            document_sequence: 1,
            extraction_confidence: 0.95,
            currency: structuredData.currency || 'EUR'
          };
        }

        console.log(`✅ [MistralEnhanced] JSON parseado exitosamente`);

      } catch (parseError) {
        console.error('❌ [MistralEnhanced] Error parsing JSON:', parseError);
        
        // Fallback con regex para contar facturas
        const invoiceNumberMatches = extractedText.match(/"invoice_number":\s*"([^"]+)"/g);
        if (invoiceNumberMatches) {
          totalInvoicesDetected = invoiceNumberMatches.length;
          console.log(`🔍 [MistralEnhanced] Fallback: ${totalInvoicesDetected} números de factura detectados`);
        }
        
        structuredData = {
          parsing_error: 'Error parseando JSON optimizado',
          extracted_content_length: extractedText.length,
          potential_invoices_detected: totalInvoicesDetected,
          raw_response: extractedText.substring(0, 2000)
        };
      }

      return {
        structured_data: structuredData,
        raw_response: extractedText,
        processing_time_ms: processingTime,
        usage: response.data.usage,
        total_invoices_detected: totalInvoicesDetected
      };

    } catch (error: any) {
      console.error('❌ [MistralEnhanced] Error procesando documento:', error);
      throw new Error(`Error en Mistral Enhanced: ${error?.message || 'Error desconocido'}`);
    }
  }

  async processDocument(
    pdfBuffer: Buffer, 
    jobId?: string
  ): Promise<EnhancedMistralResult> {
    const totalStartTime = Date.now();
    const finalJobId = jobId || `enhanced_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`🚀 [MistralEnhanced] Iniciando procesamiento optimizado`);
    console.log(`📋 [MistralEnhanced] Job ID: ${finalJobId}`);
    console.log(`📏 [MistralEnhanced] Tamaño PDF: ${pdfBuffer.length} bytes`);

    try {
      // Subir PDF
      const uploadStartTime = Date.now();
      const documentUrl = await this.uploadToStorage(pdfBuffer, finalJobId);
      const uploadTime = Date.now() - uploadStartTime;

      // Procesar con configuración optimizada
      const mistralResult = await this.processWithMistralEnhanced(documentUrl);

      const totalTime = Date.now() - totalStartTime;

      console.log(`🎉 [MistralEnhanced] Procesamiento completado en ${totalTime}ms`);
      console.log(`📊 [MistralEnhanced] Total facturas detectadas: ${mistralResult.total_invoices_detected}`);

      return {
        success: true,
        jobId: finalJobId,
        extracted_data: mistralResult.structured_data,
        document_url: documentUrl,
        total_invoices_detected: mistralResult.total_invoices_detected,
        processing_metadata: {
          upload_time_ms: uploadTime,
          mistral_processing_time_ms: mistralResult.processing_time_ms,
          total_time_ms: totalTime,
          method: 'mistral-document-understanding-enhanced',
          confidence: 0.95,
          document_pages: mistralResult.usage?.total_tokens ? Math.ceil(mistralResult.usage.total_tokens / 1000) : undefined,
          max_tokens_used: mistralResult.usage?.total_tokens,
          invoices_found: mistralResult.total_invoices_detected
        }
      };

    } catch (error: any) {
      console.error(`❌ [MistralEnhanced] Error general:`, error);

      return {
        success: false,
        jobId: finalJobId,
        extracted_data: {
          error: error?.message || 'Error desconocido',
          error_type: 'enhanced_mistral_processing_error',
          timestamp: new Date().toISOString()
        },
        total_invoices_detected: 0,
        processing_metadata: {
          upload_time_ms: 0,
          mistral_processing_time_ms: 0,
          total_time_ms: Date.now() - totalStartTime,
          method: 'mistral-document-understanding-enhanced',
          confidence: 0,
          invoices_found: 0
        }
      };
    }
  }
}

export const enhancedMistralProcessor = new EnhancedMistralProcessor(); 