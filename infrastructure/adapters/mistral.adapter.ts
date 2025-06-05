// Adaptador simplificado para el servicio Mistral OCR
import { IOcrService } from '../services/ocr.service.interface';

export class MistralOcrAdapter implements IOcrService {
  /**
   * Extrae texto de un PDF usando Mistral OCR (simulado)
   */
  async extractText(pdfBuffer: Buffer): Promise<{ rawText: string; rawJson: any; jobId: string; }> {
    try {
      // Generar un jobId único
      const jobId = `mistral_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`🔍 [MistralOcrAdapter] Iniciando extracción para job: ${jobId}`);
      
      // Simular tiempo de procesamiento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simular respuesta de Mistral OCR
      const rawText = `FACTURA
      Número: F2023-1234
      Fecha: 15/04/2023
      
      EMISOR:
      Empresa ABC, S.L.
      CIF: B12345678
      Dirección: Calle Principal 123, 08001 Barcelona
      
      RECEPTOR:
      Cliente XYZ, S.A.
      CIF: A87654321
      Dirección: Avenida Central 456, 28001 Madrid
      
      CONCEPTOS:
      1. Servicio de consultoría - 1.500,00€
      2. Desarrollo de software - 3.000,00€
      3. Mantenimiento mensual - 500,00€
      
      Subtotal: 5.000,00€
      IVA (21%): 1.050,00€
      TOTAL: 6.050,00€
      
      Forma de pago: Transferencia bancaria
      Cuenta: ES12 3456 7890 1234 5678 9012`;

      const rawJson = {
        document_type: "factura",
        invoice_number: "F2023-1234",
        invoice_date: "15/04/2023",
        emitter_name: "Empresa ABC, S.L.",
        emitter_tax_id: "B12345678",
        receiver_name: "Cliente XYZ, S.A.",
        receiver_tax_id: "A87654321",
        total_amount: 6050.00,
        tax_amount: 1050.00,
        subtotal: 5000.00
      };

      console.log(`✅ [MistralOcrAdapter] Extracción completada para job: ${jobId}`);

      return {
        rawText,
        rawJson,
        jobId
      };

    } catch (error) {
      console.error('[MistralOcrAdapter] Error durante la extracción:', error);
      throw new Error(`Error en adaptador Mistral OCR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const createMistralOcrAdapter = () => new MistralOcrAdapter();
