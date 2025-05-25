// services/mistral.ts
import axios from 'axios';

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/ocr';

interface MistralOCRResponse {
  job_id: string;
  raw_text: string;
  document_json: any; // JSON raw de la estructura del documento
  status: 'completed' | 'processing' | 'failed';
  message?: string;
}

export async function extractDataFromPDF(pdfBuffer: Buffer): Promise<MistralOCRResponse> {
  try {
    // Crear un FormData con el archivo PDF
    const formData = new FormData();
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    formData.append('file', blob, 'document.pdf');
    
    // Configurar opciones de extracción
    formData.append('options', JSON.stringify({
      document_type: 'financial', // Indicar que es un documento financiero
      include_raw_text: true,      // Incluir texto extraído
      language: 'es'               // Especificar idioma español
    }));
    
    // Enviar solicitud a Mistral
    const response = await axios.post(MISTRAL_API_URL, formData, {
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error en la extracción de datos con Mistral:', error);
    throw new Error('Error al procesar el documento con Mistral OCR');
  }
}

export async function checkJobStatus(jobId: string): Promise<MistralOCRResponse> {
  try {
    const response = await axios.get(`${MISTRAL_API_URL}/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error al verificar el estado del trabajo:', error);
    throw new Error('Error al verificar el estado del proceso OCR');
  }
}