// API Route para obtener datos de un documento específico
// /app/api/documents/data/[jobId]/route.ts
// GET: Devuelve los datos completos de un documento por jobId

import { NextRequest, NextResponse } from 'next/server';
import { readDocumentsFromFile } from '@/lib/mock-db';

export const dynamic = 'force-dynamic';

// Handler GET - Obtener datos de un documento
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    console.log(`🔍 [GET-DOC] Buscando documento con jobId: ${jobId}`);
    console.log(`🔍 [GET-DOC] Documentos en memoria:`, Object.keys(readDocumentsFromFile()));

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID es requerido' },
        { status: 400 }
      );
    }

    // Buscar el documento en la base de datos temporal
    const document = readDocumentsFromFile()[jobId];

    if (!document) {
      console.log(`❌ [GET-DOC] Documento no encontrado. Disponibles: ${Object.keys(readDocumentsFromFile()).join(', ')}`);
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    console.log(`✅ [GET-DOC] Documento encontrado: ${document.jobId}`);

    // Devolver los datos del documento
    return NextResponse.json({
      jobId: document.jobId,
      documentType: document.documentType,
      status: 'processed',
      uploadTimestamp: document.uploadTimestamp || new Date().toISOString(),
      processingMetadata: {
        mistral_processing_time_ms: document.processing_metadata?.mistral_processing_time_ms || 25000,
        confidence: document.processing_metadata?.confidence || 0.95,
        method: 'MISTRAL_DOCUMENT_UNDERSTANDING'
      },
      documentUrl: document.document_url,
      extractedData: document.extracted_data || {},
      rawResponse: document.raw_response
    });

  } catch (error) {
    console.error('Error in GET /api/documents/data/[jobId]:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

 