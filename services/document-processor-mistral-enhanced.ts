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
      console.error('[ERROR] [MistralEnhanced] MISTRAL_API_KEY no configurada');
      throw new Error('MISTRAL_API_KEY es requerida para producción');
    }
    console.log('[SUCCESS] [MistralEnhanced] Inicializado con API key de producción');
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

    console.log(`[START] [MistralEnhanced] Iniciando procesamiento: ${jobId}`);
    console.log(`[INFO] [MistralEnhanced] Tamaño: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)}MB`);

    let retryCount = 0;
    let lastError = '';
    const warnings: string[] = [];

    while (retryCount <= this.maxRetries) {
      try {
        console.log(`[RETRY] [MistralEnhanced] Intento ${retryCount + 1}/${this.maxRetries + 1}`);

        // Preparar el prompt mejorado
        const enhancedPrompt = this.buildEnhancedPrompt(detectMultipleInvoices, enhancedExtraction);

        // Procesar con Mistral
        const mistralStartTime = Date.now();
        const extractedText = await this.extractTextWithMistral(pdfBuffer, enhancedPrompt);
        const mistralEndTime = Date.now();

        if (!extractedText || extractedText.trim().length === 0) {
          throw new Error('Mistral no pudo extraer texto del documento');
        }

        console.log(`[SUCCESS] [MistralEnhanced] Mistral procesó documento en ${mistralEndTime - mistralStartTime}ms`);

        // Procesar y validar datos extraídos
        const processedData = await this.processExtractedData(extractedText, jobId);
        
        // Validar calidad de la extracción
        const confidence = this.calculateConfidence(processedData);
        
        if (confidence < confidenceThreshold) {
          warnings.push(`Confianza baja detectada: ${(confidence * 100).toFixed(1)}%`);
          console.warn(`[WARNING] [MistralEnhanced] Confianza baja: ${(confidence * 100).toFixed(1)}%`);
        }

        // Contar facturas detectadas
        const invoiceCount = this.countDetectedInvoices(processedData);
        console.log(`[INFO] [MistralEnhanced] Facturas detectadas: ${invoiceCount}`);

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

        console.log(`[SUCCESS] [MistralEnhanced] Completado en ${totalTime}ms (confianza: ${(confidence * 100).toFixed(1)}%)`);

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
        
        console.error(`[ERROR] [MistralEnhanced] Error en intento ${retryCount}: ${lastError}`);

        // Si es error 401 (Unauthorized), es crítico para producción
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          console.error('[ERROR] [MistralEnhanced] API Key inválida o expirada - CRÍTICO PARA PRODUCCIÓN');
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
    console.error(`[ERROR] [MistralEnhanced] Todos los intentos fallaron para ${jobId}`);

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
      console.log(`[UPLOAD] [MistralEnhanced] Subiendo archivo a Mistral Files API...`);
      
      // Paso 1: Subir el archivo usando Files API
      const uploadResponse = await this.uploadFile(pdfBuffer);
      
      console.log(`[PROCESS] [MistralEnhanced] Procesando con Document Understanding (${this.model})...`);
      
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
        console.error(`[ERROR] [MistralEnhanced] Document Understanding error ${response.status}: ${errorText}`);
        throw new Error(`Document Understanding API error ${response.status}: ${errorText}`);
      }

      const result: MistralResponse = await response.json();
      
      if (result.choices && result.choices.length > 0) {
        return result.choices[0].message.content;
      } else {
        throw new Error('Respuesta vacía de Document Understanding API');
      }

    } catch (error: any) {
      console.error('[ERROR] [MistralEnhanced] Error con Document Understanding:', error);
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
        console.error(`[ERROR] [MistralEnhanced] Upload error ${uploadResponse.status}: ${errorText}`);
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
        console.error(`[ERROR] [MistralEnhanced] Signed URL error ${signedUrlResponse.status}: ${errorText}`);
        throw new Error(`Signed URL error ${signedUrlResponse.status}: ${errorText}`);
      }

      const signedUrlResult = await signedUrlResponse.json();
      
      return {
        file_id: fileId,
        signed_url: signedUrlResult.url
      };

    } catch (error: any) {
      console.error('[ERROR] [MistralEnhanced] Error subiendo archivo:', error);
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
      
      // Primero, intentar extraer JSON de bloque markdown
      console.log(`[SEARCH] [MistralEnhanced] Buscando JSON en texto de ${cleanedText.length} caracteres`);
      
      const markdownJsonMatch = cleanedText.match(/```json\s*([\s\S]*?)\s*```/);
      if (markdownJsonMatch && markdownJsonMatch[1]) {
        cleanedText = markdownJsonMatch[1].trim();
        console.log(`[EXTRACT] [MistralEnhanced] JSON extraído de bloque markdown (${cleanedText.length} chars)`);
      } else {
        // Buscar JSON directo en el texto
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanedText = jsonMatch[0];
          console.log(`[EXTRACT] [MistralEnhanced] JSON extraído directamente (${cleanedText.length} chars)`);
        } else {
          console.log(`[WARNING] [MistralEnhanced] No se encontró JSON válido en la respuesta`);
        }
      }
      
      // Log del JSON que intentaremos parsear
      console.log(`[DEBUG] [MistralEnhanced] JSON a parsear (primeros 200 chars): "${cleanedText.substring(0, 200)}..."`);
      console.log(`[DEBUG] [MistralEnhanced] JSON a parsear (últimos 200 chars): "...${cleanedText.substring(Math.max(0, cleanedText.length - 200))}"`);

      // Intentar parsear como JSON
      let parsedData;
      try {
        parsedData = JSON.parse(cleanedText);
      } catch (parseError) {
        console.warn(`[WARNING] [MistralEnhanced] Error parseando JSON, intentando limpiar...`);
        console.log(`[DEBUG] [MistralEnhanced] Texto problemático (primeros 500 chars): "${cleanedText.substring(0, 500)}"`);
        
        // Intentar arreglar JSON truncado
        if (cleanedText.includes('"detected_invoices"') && !cleanedText.trim().endsWith('}')) {
          console.log(`[FIX] [MistralEnhanced] JSON parece truncado, intentando reparar...`);
          
          // Contar llaves abiertas vs cerradas
          const openBraces = (cleanedText.match(/{/g) || []).length;
          const closeBraces = (cleanedText.match(/}/g) || []).length;
          const openBrackets = (cleanedText.match(/\[/g) || []).length;
          const closeBrackets = (cleanedText.match(/\]/g) || []).length;
          
          // Añadir llaves/corchetes faltantes
          let repairedJson = cleanedText;
          
          // Cerrar arrays abiertos
          const missingBrackets = openBrackets - closeBrackets;
          for (let i = 0; i < missingBrackets; i++) {
            repairedJson += ']';
          }
          
          // Cerrar objetos abiertos
          const missingBraces = openBraces - closeBraces;
          for (let i = 0; i < missingBraces; i++) {
            repairedJson += '}';
          }
          
          try {
            parsedData = JSON.parse(repairedJson);
            console.log(`[SUCCESS] [MistralEnhanced] JSON reparado exitosamente`);
          } catch (repairError) {
            // Si falla la reparación, intentar extracción manual
            cleanedText = repairedJson;
          }
        }
        
        if (!parsedData) {
          // Intentar limpiar caracteres problemáticos
          cleanedText = cleanedText
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Caracteres de control
            .replace(/,(\s*[}\]])/g, '$1') // Comas colgantes
            .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":'); // Claves sin comillas
          
          try {
            parsedData = JSON.parse(cleanedText);
          } catch (secondError) {
            console.error(`[ERROR] [MistralEnhanced] JSON parsing failed even after cleaning. Original text length: ${extractedText.length}`);
            console.log(`[DEBUG] [MistralEnhanced] Raw response (first 1000 chars): "${extractedText.substring(0, 1000)}"`);
            
            // Intentar extraer todas las facturas manualmente del texto completo
            const extractedInvoices = this.extractAllInvoicesFromText(extractedText);
            
            parsedData = {
              detected_invoices: extractedInvoices,
              confidence: extractedInvoices.length > 0 ? 0.7 : 0.1,
              processing_notes: [
                `JSON parsing failed: ${secondError.message}`, 
                `Extracted ${extractedInvoices.length} invoices manually from text`,
                `Raw text length: ${extractedText.length}`
              ],
              fallback_extraction: true
            };
          }
        }
      }

      // Validar estructura mínima
      if (!parsedData.detected_invoices) {
        parsedData.detected_invoices = [];
      }

      // Normalizar campos nif a nif_cif para compatibilidad
      if (parsedData.detected_invoices && Array.isArray(parsedData.detected_invoices)) {
        parsedData.detected_invoices.forEach((invoice: any) => {
          // Normalizar proveedor
          if (invoice.supplier) {
            if (invoice.supplier.nif && !invoice.supplier.nif_cif) {
              invoice.supplier.nif_cif = invoice.supplier.nif;
            }
          }
          // Normalizar cliente
          if (invoice.customer) {
            if (invoice.customer.nif && !invoice.customer.nif_cif) {
              invoice.customer.nif_cif = invoice.customer.nif;
            }
          }
        });
      }

      // Normalizar fechas
      this.normalizeDates(parsedData);

      // Validar y corregir números
      this.validateNumbers(parsedData);

      return parsedData;

    } catch (error: any) {
      console.error(`[ERROR] [MistralEnhanced] Error procesando datos para ${jobId}:`, error);
      
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
   * Extrae TODAS las facturas del texto cuando falla el JSON
   */
  private extractAllInvoicesFromText(text: string): any[] {
    try {
      console.log(`[MANUAL] [MistralEnhanced] Buscando múltiples facturas en el texto`);
      
      const invoices: any[] = [];
      
      // Buscar todos los números de factura
      const invoiceMatches = text.matchAll(/"invoice_number":\s*"([^"]+)"/g);
      const invoiceNumbers = Array.from(invoiceMatches).map(match => match[1]);
      
      console.log(`[MANUAL] [MistralEnhanced] Encontrados ${invoiceNumbers.length} números de factura`);
      
      // Si hay múltiples facturas, intentar extraer cada una
      if (invoiceNumbers.length > 1) {
        // Dividir el texto por cada factura
        const invoiceBlocks = text.split(/},\s*{/).filter(block => block.includes('invoice_number'));
        
        invoiceBlocks.forEach((block, index) => {
          const invoice = this.extractSingleInvoiceFromBlock(block);
          if (invoice) {
            invoices.push(invoice);
          }
        });
      } else if (invoiceNumbers.length === 1) {
        // Solo una factura
        const invoice = this.extractSingleInvoiceFromBlock(text);
        if (invoice) {
          invoices.push(invoice);
        }
      }
      
      // Si no se encontraron facturas con el método anterior, intentar otro enfoque
      if (invoices.length === 0) {
        const singleInvoice = this.extractInvoiceFromText(text);
        if (singleInvoice) {
          invoices.push(singleInvoice);
        }
      }
      
      console.log(`[SUCCESS] [MistralEnhanced] Extraídas ${invoices.length} facturas manualmente`);
      return invoices;
      
    } catch (error) {
      console.error(`[ERROR] [MistralEnhanced] Error extrayendo múltiples facturas:`, error);
      return [];
    }
  }
  
  /**
   * Extrae una factura de un bloque de texto
   */
  private extractSingleInvoiceFromBlock(block: string): any | null {
    try {
      const invoice: any = {};
      
      // Extraer campos básicos
      const patterns = {
        invoice_number: /"invoice_number":\s*"([^"]+)"/,
        issue_date: /"issue_date":\s*"([^"]+)"/,
        due_date: /"due_date":\s*"([^"]+)"/,
        total_amount: /"total_amount":\s*([0-9.]+)/,
        tax_amount: /"tax_amount":\s*([0-9.]+)/,
        base_amount: /"base_amount":\s*([0-9.]+)/,
        currency: /"currency":\s*"([^"]+)"/,
        payment_method: /"payment_method":\s*"([^"]+)"/
      };
      
      // Aplicar patrones
      for (const [key, pattern] of Object.entries(patterns)) {
        const match = block.match(pattern);
        if (match) {
          if (key.includes('amount')) {
            invoice[key] = parseFloat(match[1]);
          } else {
            invoice[key] = match[1];
          }
        }
      }
      
      // Extraer proveedor
      const supplierMatch = block.match(/"supplier":\s*{([^}]+)}/);
      if (supplierMatch) {
        invoice.supplier = this.extractEntityFromBlock(supplierMatch[1]);
      }
      
      // Extraer cliente
      const customerMatch = block.match(/"customer":\s*{([^}]+)}/);
      if (customerMatch) {
        invoice.customer = this.extractEntityFromBlock(customerMatch[1]);
      }
      
      // Extraer líneas de factura si existen
      const itemsMatch = block.match(/"line_items":\s*\[([^\]]+)\]/);
      if (itemsMatch) {
        invoice.line_items = this.extractLineItems(itemsMatch[1]);
      }
      
      return Object.keys(invoice).length > 0 ? invoice : null;
      
    } catch (error) {
      console.error(`[ERROR] [MistralEnhanced] Error extrayendo factura del bloque:`, error);
      return null;
    }
  }
  
  /**
   * Extrae datos de una entidad (proveedor/cliente)
   */
  private extractEntityFromBlock(block: string): any {
    const entity: any = {};
    
    const patterns = {
      name: /"name":\s*"([^"]+)"/,
      nif: /"nif":\s*"([^"]+)"/,
      address: /"address":\s*"([^"]+)"/,
      city: /"city":\s*"([^"]+)"/,
      postal_code: /"postal_code":\s*"([^"]+)"/,
      commercial_name: /"commercial_name":\s*"([^"]+)"/
    };
    
    for (const [key, pattern] of Object.entries(patterns)) {
      const match = block.match(pattern);
      if (match) {
        entity[key] = match[1];
        // Si es nif, también agregarlo como nif_cif para compatibilidad
        if (key === 'nif') {
          entity.nif_cif = match[1];
        }
      }
    }
    
    return entity;
  }
  
  /**
   * Extrae líneas de factura
   */
  private extractLineItems(block: string): any[] {
    try {
      const items: any[] = [];
      
      // Dividir por elementos del array
      const itemBlocks = block.split(/},\s*{/);
      
      itemBlocks.forEach(itemBlock => {
        const item: any = {};
        
        const patterns = {
          description: /"description":\s*"([^"]+)"/,
          quantity: /"quantity":\s*([0-9.]+)/,
          unit_price: /"unit_price":\s*([0-9.]+)/,
          tax_rate: /"tax_rate":\s*([0-9.]+)/,
          amount: /"amount":\s*([0-9.]+)/
        };
        
        for (const [key, pattern] of Object.entries(patterns)) {
          const match = itemBlock.match(pattern);
          if (match) {
            if (key === 'description') {
              item[key] = match[1];
            } else {
              item[key] = parseFloat(match[1]);
            }
          }
        }
        
        if (Object.keys(item).length > 0) {
          items.push(item);
        }
      });
      
      return items;
      
    } catch (error) {
      return [];
    }
  }

  /**
   * Extrae datos de factura manualmente del texto cuando falla el JSON
   */
  private extractInvoiceFromText(text: string): any | null {
    try {
      console.log(`[MANUAL] [MistralEnhanced] Intentando extracción manual de factura`);
      
      const invoice: any = {};
      
      // Extraer número de factura
      const invoiceNumberMatch = text.match(/"invoice_number":\s*"([^"]+)"/);
      if (invoiceNumberMatch) {
        invoice.invoice_number = invoiceNumberMatch[1];
      }
      
      // Extraer fechas
      const issueDateMatch = text.match(/"issue_date":\s*"([^"]+)"/);
      if (issueDateMatch) {
        invoice.issue_date = issueDateMatch[1];
      }
      
      const dueDateMatch = text.match(/"due_date":\s*"([^"]+)"/);
      if (dueDateMatch) {
        invoice.due_date = dueDateMatch[1];
      }
      
      // Extraer proveedor
      const supplierNameMatch = text.match(/"supplier":\s*{[^}]*"name":\s*"([^"]+)"/);
      const supplierNifMatch = text.match(/"supplier":\s*{[^}]*"nif":\s*"([^"]+)"/);
      const supplierAddressMatch = text.match(/"supplier":\s*{[^}]*"address":\s*"([^"]+)"/);
      
      if (supplierNameMatch || supplierNifMatch) {
        invoice.supplier = {};
        if (supplierNameMatch) invoice.supplier.name = supplierNameMatch[1];
        if (supplierNifMatch) {
          invoice.supplier.nif_cif = supplierNifMatch[1]; // Usar nif_cif para compatibilidad
          invoice.supplier.nif = supplierNifMatch[1]; // Mantener también nif por retrocompatibilidad
        }
        if (supplierAddressMatch) invoice.supplier.address = supplierAddressMatch[1];
      }
      
      // Extraer cliente
      const customerNameMatch = text.match(/"customer":\s*{[^}]*"name":\s*"([^"]+)"/);
      const customerNifMatch = text.match(/"customer":\s*{[^}]*"nif":\s*"([^"]+)"/);
      const customerAddressMatch = text.match(/"customer":\s*{[^}]*"address":\s*"([^"]+)"/);
      
      if (customerNameMatch || customerNifMatch) {
        invoice.customer = {};
        if (customerNameMatch) invoice.customer.name = customerNameMatch[1];
        if (customerNifMatch) {
          invoice.customer.nif_cif = customerNifMatch[1]; // Usar nif_cif para compatibilidad
          invoice.customer.nif = customerNifMatch[1]; // Mantener también nif por retrocompatibilidad
        }
        if (customerAddressMatch) invoice.customer.address = customerAddressMatch[1];
      }
      
      // Extraer total
      const totalAmountMatch = text.match(/"total_amount":\s*([0-9]+\.?[0-9]*)/);
      if (totalAmountMatch) {
        invoice.total_amount = parseFloat(totalAmountMatch[1]);
      }
      
      // Verificar si encontramos datos suficientes
      if (invoice.invoice_number || invoice.supplier?.name || invoice.customer?.name || invoice.total_amount) {
        console.log(`[SUCCESS] [MistralEnhanced] Extracción manual exitosa:`, {
          invoice_number: invoice.invoice_number,
          supplier: invoice.supplier?.name,
          customer: invoice.customer?.name,
          total: invoice.total_amount
        });
        return invoice;
      }
      
      console.log(`[WARNING] [MistralEnhanced] No se encontraron datos suficientes en extracción manual`);
      return null;
      
    } catch (error) {
      console.error(`[ERROR] [MistralEnhanced] Error en extracción manual:`, error);
      return null;
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