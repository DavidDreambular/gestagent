// API Route para exportar datos de un documento específico
// /app/api/documents/export/[jobId]/route.ts
// GET: Devuelve los datos de un documento en formato JSON para descarga

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Importar función para obtener documentos de la base temporal
import { getAllDocumentsFromMockDB } from '@/lib/mock-db';

// Handler GET - Exportar datos de un documento
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID es requerido' },
        { status: 400 }
      );
    }

    // Buscar el documento en la base temporal
    const allDocuments = getAllDocumentsFromMockDB();
    const document = allDocuments.find((doc: any) => doc.jobId === jobId);

    if (!document) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    // Preparar datos para exportación
    const exportData = {
      metadata: {
        jobId: document.jobId,
        documentType: document.documentType,
        exportTimestamp: new Date().toISOString(),
        processingMetadata: document.processing_metadata,
        uploadTimestamp: document.uploadTimestamp
      },
      extractedData: document.extracted_data,
      documentUrl: document.document_url
    };

    // Crear respuesta con headers para descarga
    const response = new NextResponse(
      JSON.stringify(exportData, null, 2),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="documento_${jobId}.json"`,
          'Cache-Control': 'no-cache'
        }
      }
    );

    return response;

  } catch (error) {
    console.error('Error in GET /api/documents/export/[jobId]:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 