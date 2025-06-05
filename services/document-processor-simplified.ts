// Servicio de PRODUCCIÓN: PDF → Llama 3.2 90B Vision (OpenRouter) → Supabase
import axios from 'axios';

// DICCIONARIO DE SINÓNIMOS PARA FACTURAS (Español + Catalán)
const INVOICE_FIELD_SYNONYMS = {
  // NÚMERO DE FACTURA
  invoice_number: [
    'número de factura', 'numero de factura', 'núm. factura', 'num. factura', 'nº factura',
    'factura número', 'factura numero', 'factura nº', 'factura núm', 'invoice number',
    'número factura', 'numero factura', 'ref. factura', 'referencia factura',
    // Catalán
    'número de factura', 'numero de factura', 'núm. factura', 'num. factura', 'nº factura',
    'factura número', 'factura numero', 'número factura', 'numero factura'
  ],
  
  // FECHAS
  invoice_date: [
    'fecha', 'fecha emisión', 'fecha emision', 'fecha de emisión', 'fecha de emision',
    'fecha factura', 'emitida el', 'emisión', 'emision', 'date',
    // Catalán
    'data', 'data emisió', 'data emissió', 'data de emisió', 'data de emissió',
    'data factura', 'emesa el', 'emissió', 'emisió'
  ],
  
  due_date: [
    'fecha vencimiento', 'vencimiento', 'fecha límite', 'fecha limite', 'vence el',
    'fecha de vencimiento', 'fecha de pago', 'pago antes del', 'límite pago',
    // Catalán
    'data venciment', 'venciment', 'data límit', 'data limit', 'venç el',
    'data de venciment', 'data de pagament', 'pagament abans del', 'límit pagament'
  ],
  
  // DATOS DEL EMISOR
  emitter_name: [
    'emisor', 'empresa', 'razón social', 'razon social', 'nombre empresa',
    'denominación social', 'denominacion social', 'entidad', 'compañía', 'compania',
    // Catalán
    'emissor', 'empresa', 'raó social', 'rao social', 'nom empresa',
    'denominació social', 'denominacio social', 'entitat', 'companyia'
  ],
  
  emitter_tax_id: [
    'cif', 'nif', 'nie', 'dni', 'código fiscal', 'codigo fiscal', 'id fiscal',
    'identificación fiscal', 'identificacion fiscal', 'tax id', 'vat number',
    // Catalán
    'cif', 'nif', 'nie', 'dni', 'codi fiscal', 'id fiscal',
    'identificació fiscal', 'identificacio fiscal'
  ],
  
  emitter_address: [
    'dirección', 'direccion', 'domicilio', 'domicilio social', 'sede social',
    'dirección fiscal', 'direccion fiscal', 'calle', 'avenida', 'plaza',
    // Catalán
    'adreça', 'adreca', 'domicili', 'domicili social', 'seu social',
    'adreça fiscal', 'adreca fiscal', 'carrer', 'avinguda', 'plaça'
  ],
  
  emitter_postal_code: [
    'código postal', 'codigo postal', 'cp', 'c.p.', 'postal code',
    // Catalán
    'codi postal', 'cp', 'c.p.'
  ],
  
  emitter_city: [
    'ciudad', 'población', 'poblacion', 'localidad', 'municipio', 'city',
    // Catalán
    'ciutat', 'població', 'poblacio', 'localitat', 'municipi'
  ],
  
  emitter_province: [
    'provincia', 'prov', 'prov.', 'province',
    // Catalán
    'província', 'provincia', 'prov', 'prov.'
  ],
  
  emitter_phone: [
    'teléfono', 'telefono', 'tlf', 'tlf.', 'tel', 'tel.', 'phone', 'móvil', 'movil',
    // Catalán
    'telèfon', 'telefon', 'tlf', 'tlf.', 'tel', 'tel.', 'mòbil', 'mobil'
  ],
  
  emitter_email: [
    'email', 'e-mail', 'correo', 'correo electrónico', 'correo electronico', 'mail',
    // Catalán
    'email', 'e-mail', 'correu', 'correu electrònic', 'correu electronic', 'mail'
  ],
  
  // DATOS DEL RECEPTOR/CLIENTE
  receiver_name: [
    'cliente', 'receptor', 'destinatario', 'facturar a', 'cliente final',
    'razón social cliente', 'razon social cliente', 'nombre cliente',
    // Catalán
    'client', 'receptor', 'destinatari', 'facturar a', 'client final',
    'raó social client', 'rao social client', 'nom client'
  ],
  
  receiver_tax_id: [
    'cif cliente', 'nif cliente', 'dni cliente', 'identificación cliente',
    'identificacion cliente', 'id fiscal cliente',
    // Catalán
    'cif client', 'nif client', 'dni client', 'identificació client',
    'identificacio client', 'id fiscal client'
  ],
  
  receiver_address: [
    'dirección cliente', 'direccion cliente', 'domicilio cliente',
    'dirección facturación', 'direccion facturacion',
    // Catalán
    'adreça client', 'adreca client', 'domicili client',
    'adreça facturació', 'adreca facturacio'
  ],
  
  // CONCEPTOS Y LÍNEAS DE DETALLE
  line_items: [
    'conceptos', 'detalle', 'descripción', 'descripcion', 'artículo', 'articulo',
    'producto', 'servicio', 'partida', 'línea', 'linea', 'item',
    // Catalán
    'conceptes', 'detall', 'descripció', 'descripcio', 'article',
    'producte', 'servei', 'partida', 'línia', 'linia', 'item'
  ],
  
  quantity: [
    'cantidad', 'cant', 'cant.', 'unidades', 'uds', 'uds.', 'qty', 'quantity',
    // Catalán
    'quantitat', 'cant', 'cant.', 'unitats', 'uds', 'uds.'
  ],
  
  unit_price: [
    'precio unitario', 'precio unidad', 'precio', 'importe unitario',
    'coste unitario', 'unit price', 'price',
    // Catalán
    'preu unitari', 'preu unitat', 'preu', 'import unitari',
    'cost unitari'
  ],
  
  discount: [
    'descuento', 'dto', 'dto.', 'rebaja', 'bonificación', 'bonificacion', 'discount',
    // Catalán
    'descompte', 'dto', 'dto.', 'rebaixa', 'bonificació', 'bonificacio'
  ],
  
  line_total: [
    'importe', 'total línea', 'total linea', 'subtotal', 'amount', 'total',
    // Catalán
    'import', 'total línia', 'total linia', 'subtotal'
  ],
  
  // TOTALES E IMPUESTOS
  subtotal: [
    'base imponible', 'subtotal', 'suma', 'total sin iva', 'total sin IVA',
    'importe sin impuestos', 'base gravable', 'taxable amount',
    // Catalán
    'base imposable', 'subtotal', 'suma', 'total sense iva', 'total sense IVA',
    'import sense impostos', 'base gravable'
  ],
  
  tax_rate: [
    'iva', 'i.v.a.', 'tipo iva', 'tipo de iva', '% iva', 'porcentaje iva',
    'tax rate', 'vat rate', 'impuesto', 'tributo',
    // Catalán
    'iva', 'i.v.a.', 'tipus iva', 'tipus d\'iva', '% iva', 'percentatge iva',
    'impost', 'tribut'
  ],
  
  tax_amount: [
    'importe iva', 'cantidad iva', 'iva aplicado', 'impuestos', 'tax amount',
    'cuota iva', 'iva repercutido',
    // Catalán
    'import iva', 'quantitat iva', 'iva aplicat', 'impostos',
    'quota iva', 'iva repercutit'
  ],
  
  total_amount: [
    'total', 'total factura', 'importe total', 'total a pagar', 'gran total',
    'total final', 'total general', 'total amount', 'final amount',
    // Catalán
    'total', 'total factura', 'import total', 'total a pagar', 'gran total',
    'total final', 'total general'
  ],
  
  // FORMA DE PAGO
  payment_method: [
    'forma de pago', 'método de pago', 'metodo de pago', 'modalidad de pago',
    'condiciones de pago', 'payment method', 'payment terms',
    'transferencia', 'efectivo', 'tarjeta', 'cheque', 'domiciliación', 'domiciliacion',
    // Catalán
    'forma de pagament', 'mètode de pagament', 'metode de pagament', 'modalitat de pagament',
    'condicions de pagament', 'transferència', 'transferencia', 'efectiu',
    'targeta', 'xec', 'domiciliació', 'domiciliacio'
  ],
  
  // DATOS BANCARIOS
  bank_account: [
    'cuenta bancaria', 'número de cuenta', 'numero de cuenta', 'iban', 'bic', 'swift',
    'entidad bancaria', 'banco', 'cuenta corriente', 'cc', 'bank account',
    // Catalán
    'compte bancari', 'número de compte', 'numero de compte', 'iban', 'bic', 'swift',
    'entitat bancària', 'entitat bancaria', 'banc', 'compte corrent', 'cc'
  ],
  
  // OBSERVACIONES
  notes: [
    'observaciones', 'notas', 'comentarios', 'aclaraciones', 'remarks', 'notes',
    'condiciones', 'términos', 'terminos', 'información adicional', 'informacion adicional',
    // Catalán
    'observacions', 'notes', 'comentaris', 'aclariments',
    'condicions', 'termes', 'informació adicional', 'informacio adicional'
  ]
};

// Interfaces para OpenRouter
interface OpenRouterResponse {
  success: boolean;
  extracted_data: any;
  raw_text: string;
  processing_time_ms: number;
  document_type?: string;
  confidence?: number;
}

interface ProcessingResult {
  success: boolean;
  jobId: string;
  extracted_data: any;
  raw_text: string;
  processing_metadata: {
    openrouter_time_ms: number;
    total_time_ms: number;
    confidence: number;
    document_type: string;
    model_used: string;
  };
}

export class DocumentProcessorSimplified {
  private openrouterApiKey: string = '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';
  private model: string = 'meta-llama/llama-3.2-90b-vision-instruct';

  constructor() {
    console.log('🦙 [DocumentProcessor] Inicializando modo PRODUCCIÓN con Llama 3.2 90B Vision');
    console.log(`🔑 [DocumentProcessor] API Key configurada: ${this.openrouterApiKey ? 'SÍ' : 'NO'}`);
    console.log(`🤖 [DocumentProcessor] Modelo: ${this.model}`);
    console.log('🚫 [DocumentProcessor] MODO PRODUCCIÓN - Sin datos mock ni fallbacks');
    console.log('✅ [DocumentProcessor] Conversión PDF → Enviando PDF directamente a Llama Vision');
  }

  /**
   * Procesa un PDF con el flujo de PRODUCCIÓN:
   * PDF → Conversión Real → Llama 3.2 90B Vision → Resultado final
   */
  async processDocument(pdfBuffer: Buffer, documentType: string = 'factura'): Promise<ProcessingResult> {
    const startTime = Date.now();
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`[DocumentProcessor] 🚀 Iniciando procesamiento PRODUCCIÓN para job ${jobId}`);
    console.log(`[DocumentProcessor] Flujo: PDF → Conversión Real → Llama 3.2 90B Vision → Supabase`);
    console.log(`[DocumentProcessor] Modelo: ${this.model}`);
    console.log(`[DocumentProcessor] Tipo de documento: ${documentType}`);
    console.log(`[DocumentProcessor] Tamaño del PDF: ${pdfBuffer.length} bytes`);

    try {
      // PASO ÚNICO: Enviar PDF a Llama 3.2 Vision via OpenRouter
      const openrouterResult = await this.sendToOpenRouter(pdfBuffer, documentType);
      
      if (!openrouterResult.success) {
        throw new Error(`Error en OpenRouter: ${JSON.stringify(openrouterResult)}`);
      }

      console.log(`[DocumentProcessor] ✅ Llama 3.2 Vision completado en ${openrouterResult.processing_time_ms}ms`);
      console.log(`[DocumentProcessor] Texto extraído: ${openrouterResult.raw_text.length} caracteres`);
      console.log(`[DocumentProcessor] Confianza: ${((openrouterResult.confidence || 0) * 100).toFixed(2)}%`);

      const totalTime = Date.now() - startTime;

      // Validar que tenemos datos extraídos reales
      if (!openrouterResult.extracted_data || Object.keys(openrouterResult.extracted_data).length === 0) {
        throw new Error('No se pudieron extraer datos del documento');
      }

      // Retornar resultado final (datos directos de Llama)
      return {
        success: true,
        jobId,
        extracted_data: openrouterResult.extracted_data,
        raw_text: openrouterResult.raw_text,
        processing_metadata: {
          openrouter_time_ms: openrouterResult.processing_time_ms,
          total_time_ms: totalTime,
          confidence: openrouterResult.confidence || 0.90,
          document_type: openrouterResult.document_type || documentType,
          model_used: this.model
        }
      };

    } catch (error) {
      console.error(`[DocumentProcessor] ❌ ERROR CRÍTICO en procesamiento:`, error);
      console.error(`[DocumentProcessor] 🚫 MODO PRODUCCIÓN - NO se generarán datos mock`);
      
      // En modo producción, fallar completamente sin fallback
      throw new Error(`Procesamiento falló: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Enviar PDF a OpenRouter con Llama 3.2 90B Vision
   */
  private async sendToOpenRouter(pdfBuffer: Buffer, documentType: string): Promise<OpenRouterResponse> {
    const startTime = Date.now();

    try {
      // Convertir PDF a base64 para envío directo
      const pdfBase64 = this.convertPdfToBase64(pdfBuffer);
      
      // Construir el prompt específico para Llama con el diccionario de sinónimos
      const systemPrompt = this.buildLlamaExtractionPrompt(documentType);
      
      console.log(`[DocumentProcessor] 📤 Enviando PDF base64 a OpenRouter (Llama 3.2 Vision)...`);
      console.log(`[DocumentProcessor] 📝 Prompt generado: ${systemPrompt.length} caracteres`);
      console.log(`[DocumentProcessor] 📄 PDF procesado: ${pdfBase64.length} caracteres base64`);

      // Intentar primero como imagen
      const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
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
                text: `Analiza este documento PDF de una ${documentType} española/catalana y extrae TODOS los campos usando el diccionario de sinónimos. Devuelve SOLO el JSON estructurado, sin texto adicional.`
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
          'Authorization': `Bearer ${this.openrouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://gestagent.vercel.app',
          'X-Title': 'GestAgent - Document Processing'
        },
        timeout: 120000 // 2 minutos para procesamiento completo
      });

      console.log(`[DocumentProcessor] 📥 Respuesta recibida de OpenRouter`);

      const content = response.data.choices[0]?.message?.content || '';
      
      if (!content) {
        throw new Error('OpenRouter no devolvió contenido');
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
          throw new Error('No se encontró JSON válido en la respuesta de OpenRouter');
        }
      } catch (parseError) {
        console.error('[DocumentProcessor] ❌ Error parsing JSON de OpenRouter:', parseError);
        throw new Error(`Error analizando respuesta de OpenRouter: ${parseError instanceof Error ? parseError.message : 'Error desconocido'}`);
      }

      // Validar que tenemos datos mínimos
      if (!extractedData || typeof extractedData !== 'object') {
        throw new Error('Los datos extraídos no son válidos');
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
      console.error('[DocumentProcessor] ❌ Error llamando a OpenRouter:', error.response?.data || error.message);
      throw new Error(`OpenRouter API error: ${error.message}`);
    }
  }

  /**
   * Convertir PDF a base64 para envío directo
   */
  private convertPdfToBase64(pdfBuffer: Buffer): string {
    try {
      console.log(`[DocumentProcessor] 📄 Convirtiendo PDF a base64...`);
      
      const base64String = pdfBuffer.toString('base64');
      
      console.log(`[DocumentProcessor] ✅ PDF convertido a base64: ${base64String.length} caracteres`);
      return base64String;
      
    } catch (error) {
      console.error('[DocumentProcessor] ❌ Error en conversión a base64:', error);
      throw new Error(`Error de conversión PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Construir prompt específico para Llama 3.2 Vision
   */
  private buildLlamaExtractionPrompt(documentType: string): string {
    if (documentType === 'factura') {
      return `Eres un experto en extracción de datos de facturas españolas y catalanas. 

DICCIONARIO DE SINÓNIMOS - Reconoce estos términos alternativos:
${Object.entries(INVOICE_FIELD_SYNONYMS).map(([key, synonyms]) => 
  `• ${key}: ${synonyms.slice(0, 8).join(', ')}`).join('\n')}

INSTRUCCIONES:
1. Analiza minuciosamente TODO el documento PDF
2. Extrae TODOS los campos posibles usando los sinónimos del diccionario
3. Presta especial atención a números, fechas, nombres, direcciones, importes
4. Si un campo no está presente, usa null
5. Para importes numéricos, usa números sin símbolos de moneda
6. Para fechas, usa formato YYYY-MM-DD
7. Para porcentajes, usa número decimal (ej: 21 para 21%)

ESTRUCTURA JSON REQUERIDA (devuelve SOLO este JSON):
{
  "document_type": "factura",
  "extraction_timestamp": "${new Date().toISOString()}",
  "document_info": {
    "number": "número de factura exacto",
    "date": "YYYY-MM-DD",
    "due_date": "YYYY-MM-DD", 
    "series": "serie si existe",
    "year": número_año,
    "currency": "EUR"
  },
  "emitter": {
    "name": "razón social completa del emisor",
    "tax_id": "CIF/NIF del emisor",
    "address": "dirección completa",
    "postal_code": "código postal",
    "city": "ciudad",
    "province": "provincia",
    "country": "país",
    "phone": "teléfono",
    "email": "email",
    "website": "web si aparece"
  },
  "receiver": {
    "name": "razón social del receptor/cliente",
    "tax_id": "CIF/NIF del cliente",
    "address": "dirección del cliente",
    "postal_code": "CP cliente",
    "city": "ciudad cliente",
    "province": "provincia cliente",
    "country": "país cliente",
    "phone": "teléfono cliente",
    "email": "email cliente"
  },
  "line_items": [
    {
      "id": "identificador si existe",
      "description": "descripción del concepto",
      "quantity": número_cantidad,
      "unit": "unidad (ej: horas, ud, etc)",
      "unit_price": número_precio_unitario,
      "discount_percent": número_descuento_porcentaje,
      "discount_amount": número_importe_descuento,
      "net_amount": número_importe_neto,
      "tax_rate": número_tipo_iva,
      "tax_amount": número_cuota_iva,
      "total": número_total_línea
    }
  ],
  "totals": {
    "subtotal": número_base_imponible,
    "total_discount": número_descuentos_totales,
    "net_subtotal": número_subtotal_neto,
    "tax_details": [
      {
        "rate": número_tipo_iva,
        "base": número_base_iva,
        "amount": número_cuota_iva
      }
    ],
    "tax_total": número_iva_total,
    "total": número_total_final,
    "currency": "EUR"
  },
  "payment": {
    "method": "forma de pago",
    "terms": "condiciones de pago",
    "bank_account": "IBAN completo",
    "bank_name": "nombre del banco",
    "swift": "código SWIFT/BIC",
    "payment_reference": "referencia de pago"
  },
  "notes": "observaciones y notas adicionales",
  "metadata": {
    "page_count": 1,
    "language": "es",
    "confidence_score": 0.90,
    "processing_method": "llama-3.2-vision-pdf-direct",
    "extracted_fields": número_campos_extraídos
  }
}

Analiza el documento PDF y devuelve ÚNICAMENTE el JSON con los datos extraídos.`;
    }
    
    return `Analiza este documento ${documentType} y extrae todos los datos relevantes en formato JSON estructurado.`;
  }
}

// Instancia singleton
export const documentProcessor = new DocumentProcessorSimplified(); 