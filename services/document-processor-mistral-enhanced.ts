/**
 * Enhanced Mistral Document Processor v2.0
 * Procesamiento optimizado de documentos PDF con Mistral OCR
 * - Procesamiento masivo mejorado
 * - Detección de múltiples facturas por documento
 * - Reintentos automáticos
 * - Métricas detalladas
 * - Compatible con PostgreSQL
 */

import { createWriteStream, promises as fs } from 'fs';
import { join } from 'path';

interface MistralResponse {
  text?: string;
  choices?: Array<{
    message: {
      content: string;
    };
  }>;
}

interface ProcessingMetadata {
  upload_time_ms: number;
  mistral_processing_time_ms: number;
  total_time_ms: number;
  method: string;
  confidence: number;
  retry_count: number;
  file_size_bytes: number;
  document_pages?: number;
}

interface EnhancedProcessingResult {
  success: boolean;
  jobId: string;
  extracted_data: any;
  processing_metadata: ProcessingMetadata;
  total_invoices_detected: number;
  error_details?: string;
  warnings?: string[];
}

export class EnhancedMistralProcessor {
  private readonly mistralApiKey: string;
  private readonly maxRetries: number = 3;
  private readonly baseUrl: string = 'https://api.mistral.ai/v1';
  private readonly model: string = 'mistral-ocr-latest';

  constructor() {
    this.mistralApiKey = process.env.MISTRAL_API_KEY || '';
    if (!this.mistralApiKey) {
      console.error('❌ [MistralEnhanced] MISTRAL_API_KEY no configurada');
      throw new Error('MISTRAL_API_KEY es requerida para producción');
    }
    console.log('✅ [MistralEnhanced] Inicializado con API key de producción');
  }

  /**
   * Procesa un documento PDF con Mistral OCR Enhanced
   */
  async processDocument(
    pdfBuffer: Buffer, 
    jobId: string,
    options: {
      detectMultipleInvoices?: boolean;
      enhancedExtraction?: boolean;
      confidenceThreshold?: number;
    } = {}
  ): Promise<EnhancedProcessingResult> {
    const startTime = Date.now();
    const {
      detectMultipleInvoices = true,
      enhancedExtraction = true,
      confidenceThreshold = 0.7
    } = options;

    console.log(`🚀 [MistralEnhanced] Iniciando procesamiento: ${jobId}`);
    console.log(`📊 [MistralEnhanced] Tamaño: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)}MB`);

    let retryCount = 0;
    let lastError = '';
    const warnings: string[] = [];

    while (retryCount <= this.maxRetries) {
      try {
        console.log(`🔄 [MistralEnhanced] Intento ${retryCount + 1}/${this.maxRetries + 1}`);

        // Preparar el prompt mejorado
        const enhancedPrompt = this.buildEnhancedPrompt(detectMultipleInvoices, enhancedExtraction);

        // Procesar con Mistral
        const mistralStartTime = Date.now();
        const extractedText = await this.extractTextWithMistral(pdfBuffer, enhancedPrompt);
        const mistralEndTime = Date.now();

        if (!extractedText || extractedText.trim().length === 0) {
          throw new Error('Mistral no pudo extraer texto del documento');
        }

        console.log(`✅ [MistralEnhanced] Mistral procesó documento en ${mistralEndTime - mistralStartTime}ms`);

        // Procesar y validar datos extraídos
        const processedData = await this.processExtractedData(extractedText, jobId);
        
        // Validar calidad de la extracción
        const confidence = this.calculateConfidence(processedData);
        
        if (confidence < confidenceThreshold) {
          warnings.push(`Confianza baja detectada: ${(confidence * 100).toFixed(1)}%`);
          console.warn(`⚠️ [MistralEnhanced] Confianza baja: ${(confidence * 100).toFixed(1)}%`);
        }

        // Contar facturas detectadas
        const invoiceCount = this.countDetectedInvoices(processedData);
        console.log(`📊 [MistralEnhanced] Facturas detectadas: ${invoiceCount}`);

        const endTime = Date.now();
        const totalTime = endTime - startTime;

        const metadata: ProcessingMetadata = {
          upload_time_ms: mistralStartTime - startTime,
          mistral_processing_time_ms: mistralEndTime - mistralStartTime,
          total_time_ms: totalTime,
          method: 'mistral-enhanced-v2',
          confidence,
          retry_count: retryCount,
          file_size_bytes: pdfBuffer.length,
          document_pages: this.estimatePages(pdfBuffer.length)
        };

        console.log(`✅ [MistralEnhanced] Completado en ${totalTime}ms (confianza: ${(confidence * 100).toFixed(1)}%)`);

        return {
          success: true,
          jobId,
          extracted_data: processedData,
          processing_metadata: metadata,
          total_invoices_detected: invoiceCount,
          warnings: warnings.length > 0 ? warnings : undefined
        };

      } catch (error: any) {
        retryCount++;
        lastError = error.message || 'Error desconocido';
        
        console.error(`❌ [MistralEnhanced] Error en intento ${retryCount}: ${lastError}`);

        // Si es error 401 (Unauthorized), es crítico para producción
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          console.error('❌ [MistralEnhanced] API Key inválida o expirada - CRÍTICO PARA PRODUCCIÓN');
          console.error('   Verifique su API key de Mistral en variables de entorno');
          lastError = 'API Key de Mistral inválida o expirada';
          break; // Salir del loop de reintentos
        }

        if (retryCount <= this.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000); // Backoff exponencial
          console.log(`⏳ [MistralEnhanced] Reintentando en ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Si llegamos aquí, todos los intentos fallaron
    const endTime = Date.now();
    console.error(`❌ [MistralEnhanced] Todos los intentos fallaron para ${jobId}`);

    return {
      success: false,
      jobId,
      extracted_data: lastError,
      processing_metadata: {
        upload_time_ms: 0,
        mistral_processing_time_ms: 0,
        total_time_ms: endTime - startTime,
        method: 'mistral-enhanced-v2-failed',
        confidence: 0,
        retry_count: retryCount - 1,
        file_size_bytes: pdfBuffer.length
      },
      total_invoices_detected: 0,
      error_details: lastError
    };
  }

  /**
   * Construye el prompt mejorado para Mistral
   */
  private buildEnhancedPrompt(detectMultiple: boolean, enhanced: boolean): string {
    const basePrompt = `
Analiza este documento PDF y extrae TODOS los datos financieros con máxima precisión.

INSTRUCCIONES CRÍTICAS:
1. Busca MÚLTIPLES facturas si existen en el documento
2. Extrae TODOS los campos disponibles, no solo los básicos
3. Mantén consistencia en el formato de fechas (DD/MM/YYYY)
4. Calcula totales si están separados
5. Identifica proveedores y clientes claramente

FORMATO DE RESPUESTA (JSON válido):
{
  "detected_invoices": [
    {
      "invoice_number": "string",
      "issue_date": "DD/MM/YYYY",
      "due_date": "DD/MM/YYYY",
      "supplier": {
        "name": "string",
        "nif": "string",
        "address": "string",
        "city": "string",
        "postal_code": "string",
        "commercial_name": "string"
      },
      "customer": {
        "name": "string", 
        "nif": "string",
        "address": "string",
        "city": "string",
        "postal_code": "string"
      },
      "line_items": [
        {
          "description": "string",
          "quantity": number,
          "unit_price": number,
          "tax_rate": number,
          "amount": number
        }
      ],
      "total_amount": number,
      "tax_amount": number,
      "base_amount": number,
      "currency": "EUR",
      "payment_method": "string",
      "notes": "string"
    }
  ],
  "document_type": "factura|nomina|recibo|otro",
  "confidence_score": 0.95,
  "processing_notes": ["string"]
}`;

    if (enhanced) {
      return basePrompt + `

CAMPOS ADICIONALES A BUSCAR:
- Códigos de producto/servicio
- Descuentos aplicados
- Retenciones
- Números de pedido/albarán
- Formas de pago específicas
- Vencimientos múltiples
- Referencias bancarias
- Comentarios o observaciones

VALIDACIONES:
- Verificar que las sumas cuadren
- Detectar inconsistencias en fechas
- Validar formato de NIFs/CIFs
- Comprobar coherencia de importes`;
    }

    return basePrompt;
  }

  /**
   * Extrae texto usando Mistral Document AI API
   */
  private async extractTextWithMistral(pdfBuffer: Buffer, prompt: string): Promise<string> {
    try {
      console.log(`🔄 [MistralEnhanced] Subiendo archivo a Mistral Files API...`);
      
      // Paso 1: Subir el archivo usando Files API
      const uploadResponse = await this.uploadFile(pdfBuffer);
      
      console.log(`🔄 [MistralEnhanced] Procesando con Document Understanding (${this.model})...`);
      
      // Paso 2: Usar Document Understanding con el archivo subido
      const requestBody = {
        model: 'mistral-small-latest', // Usar un modelo de chat para Document Understanding
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
                document_url: uploadResponse.signed_url
              }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0.1, // Baja temperatura para máxima precisión
        document_page_limit: 64,
        document_image_limit: 8
      };

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.mistralApiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [MistralEnhanced] Document Understanding error ${response.status}: ${errorText}`);
        throw new Error(`Document Understanding API error ${response.status}: ${errorText}`);
      }

      const result: MistralResponse = await response.json();
      
      if (result.choices && result.choices.length > 0) {
        return result.choices[0].message.content;
      } else {
        throw new Error('Respuesta vacía de Document Understanding API');
      }

    } catch (error: any) {
      console.error('❌ [MistralEnhanced] Error con Document Understanding:', error);
      throw new Error(`Error en Document Understanding: ${error.message}`);
    }
  }

  /**
   * Sube archivo a Mistral Files API y obtiene signed URL
   */
  private async uploadFile(pdfBuffer: Buffer): Promise<{ file_id: string; signed_url: string }> {
    try {
      // Crear FormData para upload
      const formData = new FormData();
      formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'document.pdf');
      formData.append('purpose', 'ocr');

      // Subir archivo
      const uploadResponse = await fetch(`${this.baseUrl}/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.mistralApiKey}`
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error(`❌ [MistralEnhanced] Upload error ${uploadResponse.status}: ${errorText}`);
        throw new Error(`Files API upload error ${uploadResponse.status}: ${errorText}`);
      }

      const uploadResult = await uploadResponse.json();
      const fileId = uploadResult.id;

      // Obtener signed URL
      const signedUrlResponse = await fetch(`${this.baseUrl}/files/${fileId}/url`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.mistralApiKey}`
        }
      });

      if (!signedUrlResponse.ok) {
        const errorText = await signedUrlResponse.text();
        console.error(`❌ [MistralEnhanced] Signed URL error ${signedUrlResponse.status}: ${errorText}`);
        throw new Error(`Signed URL error ${signedUrlResponse.status}: ${errorText}`);
      }

      const signedUrlResult = await signedUrlResponse.json();
      
      return {
        file_id: fileId,
        signed_url: signedUrlResult.url
      };

    } catch (error: any) {
      console.error('❌ [MistralEnhanced] Error subiendo archivo:', error);
      throw new Error(`Upload error: ${error.message}`);
    }
  }

  /**
   * Procesa y valida los datos extraídos
   */
  private async processExtractedData(extractedText: string, jobId: string): Promise<any> {
    try {
      // Limpiar el texto extraído
      let cleanedText = extractedText.trim();
      
      // Buscar JSON en el texto
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      }

      // Intentar parsear como JSON
      let parsedData;
      try {
        parsedData = JSON.parse(cleanedText);
      } catch (parseError) {
        console.warn(`⚠️ [MistralEnhanced] Error parseando JSON, intentando limpiar...`);
        
        // Intentar limpiar caracteres problemáticos
        cleanedText = cleanedText
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Caracteres de control
          .replace(/,(\s*[}\]])/g, '$1') // Comas colgantes
          .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":'); // Claves sin comillas
        
        parsedData = JSON.parse(cleanedText);
      }

      // Validar estructura mínima
      if (!parsedData.detected_invoices) {
        parsedData.detected_invoices = [];
      }

      // Normalizar fechas
      this.normalizeDates(parsedData);

      // Validar y corregir números
      this.validateNumbers(parsedData);

      return parsedData;

    } catch (error: any) {
      console.error(`❌ [MistralEnhanced] Error procesando datos para ${jobId}:`, error);
      
      // Crear estructura básica si falla el parsing
      return {
        detected_invoices: [],
        document_type: 'documento',
        confidence_score: 0.1,
        processing_notes: [`Error procesando: ${error.message}`],
        raw_text: extractedText.substring(0, 1000) // Primeros 1000 caracteres
      };
    }
  }

  /**
   * Normaliza fechas al formato DD/MM/YYYY
   */
  private normalizeDates(data: any): void {
    const dateFields = ['issue_date', 'due_date', 'date'];
    
    if (data.detected_invoices && Array.isArray(data.detected_invoices)) {
      data.detected_invoices.forEach((invoice: any) => {
        dateFields.forEach(field => {
          if (invoice[field]) {
            invoice[field] = this.formatDate(invoice[field]);
          }
        });
      });
    }
  }

  /**
   * Formatea una fecha al formato DD/MM/YYYY
   */
  private formatDate(dateStr: string): string {
    if (!dateStr) return '';
    
    // Si ya está en formato DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Si está en formato ISO (YYYY-MM-DD)
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${parseInt(isoMatch[3])}/${parseInt(isoMatch[2])}/${isoMatch[1]}`;
    }
    
    // Si está en formato YYYY/MM/DD
    const ymdMatch = dateStr.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
    if (ymdMatch) {
      return `${parseInt(ymdMatch[3])}/${parseInt(ymdMatch[2])}/${ymdMatch[1]}`;
    }
    
    return dateStr; // Devolver original si no se puede procesar
  }

  /**
   * Valida y corrige números
   */
  private validateNumbers(data: any): void {
    const numberFields = ['total_amount', 'tax_amount', 'base_amount', 'quantity', 'unit_price', 'amount'];
    
    if (data.detected_invoices && Array.isArray(data.detected_invoices)) {
      data.detected_invoices.forEach((invoice: any) => {
        numberFields.forEach(field => {
          if (invoice[field] !== undefined) {
            invoice[field] = this.parseNumber(invoice[field]);
          }
        });
        
        // Validar line_items
        if (invoice.line_items && Array.isArray(invoice.line_items)) {
          invoice.line_items.forEach((item: any) => {
            numberFields.forEach(field => {
              if (item[field] !== undefined) {
                item[field] = this.parseNumber(item[field]);
              }
            });
          });
        }
      });
    }
  }

  /**
   * Convierte string a número de forma segura
   */
  private parseNumber(value: any): number | null {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Limpiar formato europeo (1.234,56 → 1234.56)
      const cleaned = value.replace(/\./g, '').replace(',', '.');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  /**
   * Calcula la confianza de la extracción
   */
  private calculateConfidence(data: any): number {
    if (!data.detected_invoices || !Array.isArray(data.detected_invoices)) {
      return 0.1;
    }

    if (data.detected_invoices.length === 0) {
      return 0.2;
    }

    // Usar confianza reportada por Mistral si está disponible
    if (data.confidence_score && typeof data.confidence_score === 'number') {
      return Math.max(0, Math.min(1, data.confidence_score));
    }

    // Calcular confianza basada en campos completos
    let totalFields = 0;
    let completedFields = 0;

    data.detected_invoices.forEach((invoice: any) => {
      const requiredFields = ['invoice_number', 'issue_date', 'total_amount'];
      const optionalFields = ['supplier', 'customer', 'tax_amount'];
      
      requiredFields.forEach(field => {
        totalFields += 2; // Peso doble para campos requeridos
        if (invoice[field]) completedFields += 2;
      });
      
      optionalFields.forEach(field => {
        totalFields += 1;
        if (invoice[field]) completedFields += 1;
      });
    });

    return totalFields > 0 ? Math.min(0.95, completedFields / totalFields) : 0.3;
  }

  /**
   * Cuenta facturas detectadas
   */
  private countDetectedInvoices(data: any): number {
    if (!data.detected_invoices || !Array.isArray(data.detected_invoices)) {
      return 0;
    }
    return data.detected_invoices.length;
  }

  /**
   * Estima número de páginas basado en el tamaño del archivo
   */
  private estimatePages(fileSize: number): number {
    // Estimación aproximada: 100KB por página
    return Math.max(1, Math.round(fileSize / (100 * 1024)));
  }


}

// Exportar con alias para compatibilidad
export const DocumentProcessorMistralEnhanced = EnhancedMistralProcessor; 