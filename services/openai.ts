// services/openai.ts
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Estructura base para documentos financieros
export interface FinancialDocument {
  document_type: 'factura' | 'nomina' | 'recibo' | 'extracto' | 'balance';
  document_number?: string;
  document_date?: string;
  emitter?: {
    name: string;
    tax_id?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  receiver?: {
    name: string;
    tax_id?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  items?: Array<{
    description: string;
    quantity?: number;
    unit_price?: number;
    amount?: number;
    tax_rate?: number;
    tax_amount?: number;
  }>;
  totals?: {
    subtotal?: number;
    total_taxes?: number;
    total?: number;
  };
  payment_info?: {
    method?: string;
    due_date?: string;
    account_number?: string;
    reference?: string;
  };
  metadata?: Record<string, any>;
}

/**
 * Valida y estructura los datos extraídos por Mistral OCR utilizando GPT-4o
 */
export async function validateAndStructureData(
  rawJson: any,
  rawText: string,
  documentType: string
): Promise<{ result: FinancialDocument; dialog: string }> {
  try {
    // Prompt para GPT-4o
    const prompt = `
Necesito que analices y valides los datos extraídos de un documento financiero.

DOCUMENTO: ${documentType}
TEXTO EXTRAÍDO: ${rawText}
JSON EXTRAÍDO: ${JSON.stringify(rawJson, null, 2)}

Tu tarea:
1. Analiza el JSON y el texto extraído.
2. Identifica posibles errores, valores atípicos o inconsistencias.
3. Corrige cualquier error que encuentres.
4. Estructura los datos en un formato JSON estandarizado siguiendo estas reglas:
   - Usa siempre nombres de campos en inglés, manteniendo la estructura correcta.
   - Asegúrate de que los valores numéricos (cantidades, precios, impuestos) sean números, no strings.
   - Identifica claramente al emisor y receptor.
   - Extrae todos los ítems/conceptos con sus descripciones, cantidades, precios unitarios e importes.
   - Calcula y verifica los totales, subtotales e impuestos.
   - Extrae la información de pago si está disponible.

Formato esperado:
{
  "document_type": "factura" | "nomina" | "recibo" | "extracto" | "balance",
  "document_number": "string",
  "document_date": "YYYY-MM-DD",
  "emitter": {
    "name": "string",
    "tax_id": "string",
    "address": "string",
    "phone": "string",
    "email": "string"
  },
  "receiver": {
    "name": "string",
    "tax_id": "string",
    "address": "string",
    "phone": "string",
    "email": "string"
  },
  "items": [
    {
      "description": "string",
      "quantity": number,
      "unit_price": number,
      "amount": number,
      "tax_rate": number,
      "tax_amount": number
    }
  ],
  "totals": {
    "subtotal": number,
    "total_taxes": number,
    "total": number
  },
  "payment_info": {
    "method": "string",
    "due_date": "YYYY-MM-DD",
    "account_number": "string",
    "reference": "string"
  },
  "metadata": {
    // Cualquier información adicional relevante
  }
}

Responde ÚNICAMENTE con el JSON corregido y estructurado, sin comentarios adicionales.
`;

    // Llamada a GPT-4o
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Eres un asistente especializado en análisis y validación de documentos financieros.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1, // Baja temperatura para respuestas más consistentes
    });

    // Extraer respuesta
    const assistantResponse = response.choices[0].message.content || '';

    // Parsear JSON de la respuesta
    let structuredData: FinancialDocument;
    try {
      // Extraer solo el bloque JSON si hay texto adicional
      const jsonMatch = assistantResponse.match(/```json\n([\s\S]*?)\n```/) || 
                        assistantResponse.match(/```\n([\s\S]*?)\n```/) ||
                        [null, assistantResponse];
      
      const jsonString = jsonMatch[1].trim();
      structuredData = JSON.parse(jsonString);
    } catch (error) {
      console.error('Error al parsear JSON de GPT-4o:', error);
      structuredData = {
        document_type: documentType as any,
        metadata: { error: 'Error al estructurar el documento' }
      };
    }

    return {
      result: structuredData,
      dialog: assistantResponse
    };
  } catch (error) {
    console.error('Error al validar y estructurar datos con GPT-4o:', error);
    throw new Error('Error en la validación y estructuración de datos');
  }
}