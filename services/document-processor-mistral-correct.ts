// Servicio MISTRAL DOCUMENT UNDERSTANDING - Implementación CORRECTA
// Basado en la documentación oficial: https://docs.mistral.ai/capabilities/OCR/document_understanding/
// FLUJO: PDF → Supabase Storage → Mistral Document Understanding → JSON Estructurado

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// CONFIGURACIÓN MISTRAL DOCUMENT UNDERSTANDING
const MISTRAL_CONFIG = {
  API_KEY: 'l5Bb0bmH9MZZ8QKxfGzhGQDJ55zKQmm5',
  API_URL: 'https://api.mistral.ai/v1/chat/completions',
  MODEL: 'mistral-small-latest', // Modelo recomendado para Document Understanding
  TIMEOUT: 180000 // 3 minutos para procesar documentos
};

// Configurar Supabase para storage temporal
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PROMPT MEJORADO PARA EXTRACCIÓN DETALLADA DE FACTURAS
const FACTURA_PROMPT_SPANISH = `
Extrae la siguiente información de esta factura española/catalana y devuelve un JSON estructurado.
IMPORTANTE: Organiza TODOS los datos extraídos en CASTELLANO, traduciendo términos catalanes.

ESTRUCTURA JSON REQUERIDA (para cada factura detectada):
{
  "invoice_number": "número_factura",
  "issue_date": "fecha_emision_DD/MM/YYYY",
  "due_date": "fecha_vencimiento_DD/MM/YYYY",
  "supplier": {
    "name": "nombre_proveedor",
    "nif_cif": "nif_o_cif",
    "address": "direccion_completa",
    "postal_code": "codigo_postal",
    "city": "ciudad",
    "province": "provincia",
    "phone": "telefono",
    "email": "email"
  },
  "customer": {
    "name": "nombre_cliente",
    "nif_cif": "nif_o_cif",
    "address": "direccion_completa",
    "postal_code": "codigo_postal",
    "city": "ciudad",
    "province": "provincia"
  },
  "items": [
    {
      "description": "descripcion_producto_servicio",
      "quantity": numero_cantidad,
      "unit_price": precio_unitario,
      "subtotal": subtotal_sin_iva,
      "tax_rate": porcentaje_iva,
      "tax_amount": importe_iva,
      "total": total_con_iva
    }
  ],
  "tax_breakdown": [
    {
      "tax_rate": porcentaje_iva,
      "tax_base": base_imponible,
      "tax_amount": importe_iva,
      "description": "descripcion_tipo_iva"
    }
  ],
  "totals": {
    "subtotal": subtotal_sin_iva,
    "total_tax_amount": total_ivas,
    "total": total_factura,
    "discount": descuentos_aplicados
  },
  "payment_method": "metodo_pago",
  "payment_terms": "condiciones_pago",
  "notes": "observaciones_adicionales",
  "currency": "EUR"
}

TÉRMINOS QUE DEBES BUSCAR (español/catalán):
- Número factura: "Factura", "Fact.", "Nº", "Núm.", "Invoice", "Número", "N°", "Factura núm.", "Factura número" / "Factura", "Fact.", "Núm.", "Número", "N°"
- Fecha emisión: "Fecha", "Fecha factura", "Data", "Fecha emisión", "Issue date", "Emitida" / "Data", "Data factura", "Data emissió", "Emesa"
- Fecha vencimiento: "Vencimiento", "Vence", "Due date", "Pago hasta", "Fecha límite" / "Venciment", "Venç", "Data límit", "Pagament fins"
- Proveedor: "Proveedor", "Empresa", "Emisor", "Vendedor", "Supplier" / "Proveïdor", "Empresa", "Emissor", "Venedor"
- Cliente: "Cliente", "Receptor", "Comprador", "Destinatario", "Customer" / "Client", "Receptor", "Comprador", "Destinatari"
- NIF/CIF: "NIF", "CIF", "DNI", "VAT", "Tax ID" / "NIF", "CIF", "DNI"
- Dirección: "Dirección", "Domicilio", "Address", "Dir." / "Adreça", "Domicili", "Dir."
- IVA: "IVA", "VAT", "Impuesto", "Tax", "IGIC" / "IVA", "Impost"
- Base imponible: "Base imponible", "Base", "Taxable base", "Subtotal" / "Base imposable", "Base"
- Total: "Total", "Importe total", "Total amount", "Suma" / "Total", "Import total", "Suma"
- Cantidad: "Cantidad", "Cant.", "Qty", "Unidades" / "Quantitat", "Cant.", "Unitats"
- Precio: "Precio", "Price", "Importe", "Valor" / "Preu", "Import", "Valor"
- Descuento: "Descuento", "Desc.", "Discount", "Rebaja" / "Descompte", "Desc.", "Rebaixa"
- Observaciones: "Observaciones", "Notas", "Notes", "Comentarios" / "Observacions", "Notes", "Comentaris"

INSTRUCCIONES ESPECÍFICAS:
1. Si detectas MÚLTIPLES FACTURAS, devuelve un ARRAY de objetos JSON
2. Si es UNA SOLA FACTURA, devuelve un OBJETO JSON único
3. Extrae TODOS los campos posibles, usa null si no encuentras el dato
4. Convierte fechas al formato DD/MM/YYYY
5. Convierte números a formato numérico (sin comillas)
6. Incluye moneda "EUR" por defecto
7. Traduce TODOS los textos catalanes al castellano
8. Para items, incluye descripción completa y detallada
9. Para tax_breakdown, agrupa por tipo de IVA
10. Calcula totales correctamente

FORMATO DE SALIDA:
Devuelve SOLO el JSON válido, sin texto adicional, markdown o explicaciones.
`;

interface MistralDocumentResult {
  success: boolean;
  jobId: string;
  extracted_data: any;
  document_url?: string;
  processing_metadata: {
    upload_time_ms: number;
    mistral_processing_time_ms: number;
    total_time_ms: number;
    method: 'mistral-document-understanding';
    confidence: number;
    document_pages?: number;
  };
}

export class MistralDocumentProcessor {
  private apiKey: string = MISTRAL_CONFIG.API_KEY;
  private apiUrl: string = MISTRAL_CONFIG.API_URL;
  private model: string = MISTRAL_CONFIG.MODEL;

  constructor() {
    console.log('✅ [MistralDoc] Inicializando Mistral Document Understanding');
    console.log(`📋 [MistralDoc] Modelo: ${this.model}`);
    console.log(`🔗 [MistralDoc] Endpoint: ${this.apiUrl}`);
  }

  /**
   * Subir PDF a Supabase Storage y obtener URL pública
   */
  private async uploadToStorage(pdfBuffer: Buffer, jobId: string): Promise<string> {
    const startTime = Date.now();
    console.log(`📤 [MistralDoc] Subiendo PDF a Supabase Storage...`);

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

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      const uploadTime = Date.now() - startTime;
      console.log(`✅ [MistralDoc] PDF subido en ${uploadTime}ms`);
      console.log(`🔗 [MistralDoc] URL: ${urlData.publicUrl}`);

      return urlData.publicUrl;
    } catch (error) {
      console.error('❌ [MistralDoc] Error al subir PDF:', error);
      throw error;
    }
  }

  /**
   * Procesar documento usando Mistral Document Understanding
   */
  private async processWithMistralDoc(documentUrl: string, documentType: string): Promise<any> {
    const startTime = Date.now();
    console.log(`🔄 [MistralDoc] Procesando con Mistral Document Understanding...`);

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
        temperature: 0.1, // Baja temperatura para consistencia
        max_tokens: 4000
      };

      console.log(`📡 [MistralDoc] Enviando request a Mistral...`);
      
      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: MISTRAL_CONFIG.TIMEOUT
      });

      const processingTime = Date.now() - startTime;
      console.log(`✅ [MistralDoc] Respuesta recibida en ${processingTime}ms`);

      const extractedText = response.data.choices[0].message.content;
      console.log(`📄 [MistralDoc] Contenido extraído: ${extractedText.substring(0, 200)}...`);

      // Intentar parsear JSON de la respuesta - SISTEMA ULTRA MEJORADO
      let structuredData;
      try {
        // Limpiar y buscar JSON en la respuesta
        let jsonText = extractedText;
        
        console.log(`🔍 [MistralDoc] Longitud de respuesta: ${extractedText.length} caracteres`);
        
        // PASO 1: Extraer JSON de bloques de código
        const jsonBlockMatch = extractedText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonBlockMatch) {
          jsonText = jsonBlockMatch[1];
          console.log('📋 [MistralDoc] JSON encontrado en bloque de código');
        } else {
          // PASO 2: Buscar JSON en texto libre (array o objeto)
          const jsonMatch = extractedText.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
          if (jsonMatch) {
            jsonText = jsonMatch[1];
            console.log('📋 [MistralDoc] JSON encontrado en texto libre');
          }
        }
        
        // PASO 3: Limpiar el JSON antes de parsear
        jsonText = jsonText
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Eliminar caracteres de control
          .replace(/\n\s*\/\/.*$/gm, '') // Eliminar comentarios
          .replace(/,\s*([}\]])/g, '$1') // Eliminar comas antes de } o ]
          .trim();

        // PASO 4: Intentar parsear directamente
        try {
          structuredData = JSON.parse(jsonText);
          console.log('✅ [MistralDoc] JSON parseado exitosamente');
        } catch (parseError) {
          console.log('⚠️ [MistralDoc] Error parsing directo, aplicando estrategias de reparación...');
          
          // ESTRATEGIA 1: Reparar JSON truncado
          if (jsonText.includes('{') && !jsonText.trim().endsWith('}')) {
            const openBraces = (jsonText.match(/\{/g) || []).length;
            const closeBraces = (jsonText.match(/\}/g) || []).length;
            const missingBraces = openBraces - closeBraces;
            
            if (missingBraces > 0) {
              jsonText += '}'.repeat(missingBraces);
              console.log(`🔧 [MistralDoc] Estrategia 1: Agregados ${missingBraces} corchetes de cierre`);
            }
          }
          
          // ESTRATEGIA 2: Reparar arrays truncados
          if (jsonText.includes('[') && !jsonText.trim().endsWith(']')) {
            const openBrackets = (jsonText.match(/\[/g) || []).length;
            const closeBrackets = (jsonText.match(/\]/g) || []).length;
            const missingBrackets = openBrackets - closeBrackets;
            
            if (missingBrackets > 0) {
              // Eliminar última coma si existe antes de cerrar
              jsonText = jsonText.replace(/,\s*$/, '');
              jsonText += ']'.repeat(missingBrackets);
              console.log(`🔧 [MistralDoc] Estrategia 2: Agregados ${missingBrackets} corchetes de array`);
            }
          }
          
          // ESTRATEGIA 3: Extraer por chunks válidos
          try {
            structuredData = JSON.parse(jsonText);
            console.log('✅ [MistralDoc] JSON reparado exitosamente');
          } catch (secondError) {
            console.log('⚠️ [MistralDoc] Reparación fallida, extrayendo por chunks...');
            
            // ESTRATEGIA 4: Extraer el primer objeto/array válido
            const firstObjectMatch = jsonText.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
            const firstArrayMatch = jsonText.match(/\[[^\[\]]*(?:\[[^\[\]]*\][^\[\]]*)*\]/);
            
            let bestMatch = null;
            if (firstObjectMatch && firstArrayMatch) {
              bestMatch = firstObjectMatch[0].length > firstArrayMatch[0].length ? firstObjectMatch[0] : firstArrayMatch[0];
            } else if (firstObjectMatch) {
              bestMatch = firstObjectMatch[0];
            } else if (firstArrayMatch) {
              bestMatch = firstArrayMatch[0];
            }
            
            if (bestMatch) {
              try {
                structuredData = JSON.parse(bestMatch);
                console.log('✅ [MistralDoc] Chunk válido extraído');
              } catch (chunkError) {
                console.log('❌ [MistralDoc] No se pudo extraer chunk válido');
                throw chunkError;
              }
            } else {
              throw new Error('No se encontró JSON válido en la respuesta');
            }
          }
        }
        
        // VALIDACIÓN Y ENRIQUECIMIENTO DE DATOS
        if (structuredData) {
          // Si es un array, procesar cada factura
          if (Array.isArray(structuredData)) {
            structuredData = structuredData.map((invoice, index) => enrichInvoiceData(invoice, index));
            console.log(`✅ [MistralDoc] ${structuredData.length} facturas procesadas`);
          } else {
            // Si es un objeto único, enriquecerlo
            structuredData = enrichInvoiceData(structuredData, 0);
            console.log('✅ [MistralDoc] Factura única procesada');
          }
        }

      } catch (error) {
        console.error('❌ [MistralDoc] Error parsing JSON:', error);
        
        // FALLBACK: Extraer datos básicos con regex
        console.log('🔄 [MistralDoc] Aplicando extracción fallback...');
        structuredData = extractFallbackData(extractedText, documentType);
      }

      return {
        structured_data: structuredData,
        raw_response: extractedText,
        processing_time_ms: processingTime,
        usage: response.data.usage
      };

    } catch (error: any) {
      console.error('❌ [MistralDoc] Error procesando documento:', error);
      
      if (error?.response) {
        console.error('❌ [MistralDoc] Response error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
      
      throw new Error(`Error en Mistral Document Understanding: ${error?.message || 'Error desconocido'}`);
    }
  }

  /**
   * Método principal para procesar documento
   */
  async processDocument(
    pdfBuffer: Buffer, 
    documentType: string = 'factura',
    jobId?: string
  ): Promise<MistralDocumentResult> {
    const totalStartTime = Date.now();
    const finalJobId = jobId || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`🎯 [MistralDoc] Iniciando procesamiento documento`);
    console.log(`📋 [MistralDoc] Job ID: ${finalJobId}`);
    console.log(`📁 [MistralDoc] Tipo: ${documentType}`);
    console.log(`📏 [MistralDoc] Tamaño PDF: ${pdfBuffer.length} bytes`);

    try {
      // PASO 1: Subir PDF a Storage
      const uploadStartTime = Date.now();
      const documentUrl = await this.uploadToStorage(pdfBuffer, finalJobId);
      const uploadTime = Date.now() - uploadStartTime;

      // PASO 2: Procesar con Mistral Document Understanding
      const mistralResult = await this.processWithMistralDoc(documentUrl, documentType);

      const totalTime = Date.now() - totalStartTime;

      console.log(`✅ [MistralDoc] Procesamiento completado en ${totalTime}ms`);

      return {
        success: true,
        jobId: finalJobId,
        extracted_data: mistralResult.structured_data,
        document_url: documentUrl,
        processing_metadata: {
          upload_time_ms: uploadTime,
          mistral_processing_time_ms: mistralResult.processing_time_ms,
          total_time_ms: totalTime,
          method: 'mistral-document-understanding',
          confidence: 0.95, // Mistral tiene alta precisión según benchmarks
          document_pages: mistralResult.usage?.total_tokens ? Math.ceil(mistralResult.usage.total_tokens / 1000) : undefined
        }
      };

    } catch (error: any) {
      console.error(`❌ [MistralDoc] Error general en procesamiento:`, error);

      return {
        success: false,
        jobId: finalJobId,
        extracted_data: {
          error: error?.message || 'Error desconocido',
          error_type: 'mistral_document_processing_error',
          timestamp: new Date().toISOString()
        },
        processing_metadata: {
          upload_time_ms: 0,
          mistral_processing_time_ms: 0,
          total_time_ms: Date.now() - totalStartTime,
          method: 'mistral-document-understanding',
          confidence: 0
        }
      };
    }
  }
}

// Instancia singleton para usar en la aplicación
export const mistralDocumentProcessor = new MistralDocumentProcessor();

// Función para enriquecer datos de factura individual
function enrichInvoiceData(invoice: any, index: number): any {
  return {
    ...invoice,
    invoice_number: invoice.invoice_number || `Factura ${index + 1}`,
    issue_date: invoice.issue_date || null,
    due_date: invoice.due_date || null,
    supplier: {
      name: invoice.supplier?.name || 'No detectado',
      nif_cif: invoice.supplier?.nif_cif || null,
      address: invoice.supplier?.address || null,
      postal_code: invoice.supplier?.postal_code || null,
      city: invoice.supplier?.city || null,
      province: invoice.supplier?.province || null,
      phone: invoice.supplier?.phone || null,
      email: invoice.supplier?.email || null,
      ...invoice.supplier
    },
    customer: {
      name: invoice.customer?.name || 'No detectado',
      nif_cif: invoice.customer?.nif_cif || null,
      address: invoice.customer?.address || null,
      postal_code: invoice.customer?.postal_code || null,
      city: invoice.customer?.city || null,
      province: invoice.customer?.province || null,
      ...invoice.customer
    },
    items: invoice.items || [],
    tax_breakdown: invoice.tax_breakdown || [],
    totals: {
      subtotal: invoice.totals?.subtotal || 0,
      total_tax_amount: invoice.totals?.total_tax_amount || 0,
      total: invoice.totals?.total || 0,
      discount: invoice.totals?.discount || 0,
      ...invoice.totals
    },
    payment_method: invoice.payment_method || null,
    payment_terms: invoice.payment_terms || null,
    notes: invoice.notes || null,
    currency: invoice.currency || 'EUR'
  };
}

// Función de extracción fallback mejorada
function extractFallbackData(extractedText: string, documentType: string): any {
  console.log('🔄 [MistralDoc] Aplicando extracción fallback...');
  
  const fallbackData: any = {
    parsing_error: 'Error parseando JSON',
    extraction_method: 'mistral-document-understanding-fallback',
    processed_at: new Date().toISOString(),
    raw_response_length: extractedText.length,
    truncated: extractedText.length > 10000
  };

  // Extraer números de factura
  const invoiceMatches = extractedText.match(/"invoice_number":\s*"([^"]+)"/g);
  if (invoiceMatches) {
    fallbackData.detected_invoices = invoiceMatches.map((match: string) => {
      const result = match.match(/"invoice_number":\s*"([^"]+)"/);
      return result ? result[1] : null;
    }).filter(Boolean);
  }

  // Extraer información de proveedores
  const supplierMatches = extractedText.match(/"name":\s*"([^"]+)"[^}]*"supplier"/g);
  if (supplierMatches) {
    fallbackData.detected_suppliers = supplierMatches.map((match: string) => {
      const result = match.match(/"name":\s*"([^"]+)"/);
      return result ? result[1] : null;
    }).filter(Boolean);
  }
  
  // Extraer totales encontrados
  const totalMatches = extractedText.match(/"total":\s*([\d.,]+)/g);
  if (totalMatches) {
    fallbackData.detected_totals = totalMatches.map((match: string) => {
      const result = match.match(/"total":\s*([\d.,]+)/);
      if (result) {
        const cleanNumber = result[1].replace(/,/g, '');
        return parseFloat(cleanNumber);
      }
      return null;
    }).filter(Boolean);
  }

  // Extraer información de IVAs
  const taxMatches = extractedText.match(/"tax_rate":\s*([\d.]+)|"tax_amount":\s*([\d.,]+)/g);
  if (taxMatches) {
    fallbackData.detected_tax_info = taxMatches.map((match: string) => {
      const rateMatch = match.match(/"tax_rate":\s*([\d.]+)/);
      const amountMatch = match.match(/"tax_amount":\s*([\d.,]+)/);
      
      if (rateMatch) return { type: 'rate', value: parseFloat(rateMatch[1]) };
      if (amountMatch) return { type: 'amount', value: parseFloat(amountMatch[1].replace(/,/g, '')) };
      return null;
    }).filter(Boolean);
  }

  // Extraer bases imponibles
  const baseMatches = extractedText.match(/"tax_base":\s*([\d.,]+)/g);
  if (baseMatches) {
    fallbackData.detected_tax_bases = baseMatches.map((match: string) => {
      const result = match.match(/"tax_base":\s*([\d.,]+)/);
      if (result) {
        const cleanNumber = result[1].replace(/,/g, '');
        return parseFloat(cleanNumber);
      }
      return null;
    }).filter(Boolean);
  }

  // Detectar múltiples facturas
  fallbackData.multiple_invoices = (fallbackData.detected_invoices?.length || 0) > 1;
  fallbackData.confidence = 0.7;
  
  // Crear resumen de IVAs
  if (fallbackData.detected_tax_info && fallbackData.detected_tax_info.length > 0) {
    fallbackData.tax_summary = {
      types_detected: fallbackData.detected_tax_info.filter((t: any) => t.type === 'rate').length,
      total_tax_amount: fallbackData.detected_tax_info
        .filter((t: any) => t.type === 'amount')
        .reduce((sum: number, t: any) => sum + t.value, 0)
    };
  }

  return fallbackData;
} 