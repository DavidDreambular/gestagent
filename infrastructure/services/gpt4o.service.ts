// Implementación del servicio GPT-4o
import type { IGptService } from "./gpt.service.interface"
import OpenAI from "openai"

export class Gpt4oService implements IGptService {
  private openai: OpenAI

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey })
  }

  async processText(rawText: string, rawJson: any, documentType: string): Promise<{
    processedJson: any;
    dialog: string;
    confidence: number;
  }> {
    try {
      console.log(`Processing ${documentType} text with GPT-4o`)

      // Construir el prompt según el tipo de documento
      const prompt = this.buildPrompt(rawText, documentType)

      // Llamar a la API de OpenAI
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a specialized financial document parser. Extract structured data from the document text and return it as a valid JSON object.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
      })

      // Parsear la respuesta JSON
      const jsonResponse = JSON.parse(response.choices[0].message.content || "{}")

      return {
        processedJson: jsonResponse,
        dialog: response.choices[0].message.content || "",
        confidence: 0.9 // Valor por defecto para GPT-4o
      }
    } catch (error) {
      console.error('Error processing text with GPT-4o:', error);
      return {
        processedJson: {},
        dialog: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 0
      }
    }
  }

  private buildPrompt(text: string, documentType: string): string {
    if (documentType === "invoice") {
      return `Extract the following information from this invoice and return it as JSON:
        - invoice_number
        - invoice_date
        - emitter_name
        - emitter_tax_id
        - emitter_address
        - receiver_name
        - receiver_tax_id
        - receiver_address
        - line_items (array with description, quantity, unit_price, total)
        - subtotal
        - tax_amount
        - tax_rate
        - total_amount
        - payment_method
        - bank_account (if available)

        Here's the invoice text:
        ${text}`
    } else if (documentType === "payroll") {
      return `Extract the following information from this payroll document and return it as JSON:
        - employee_name
        - employee_id
        - period_start
        - period_end
        - gross_salary
        - deductions (object with social_security, income_tax, other)
        - net_salary
        - company_name
        - company_tax_id

        Here's the payroll text:
        ${text}`
    } else {
      return `Extract all relevant information from this ${documentType} and return it as a structured JSON object.
        
        Here's the document text:
        ${text}`
    }
  }
}

