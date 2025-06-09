// API Route para exportar datos de un documento específico
// /app/api/documents/export/[jobId]/route.ts
// GET: Devuelve los datos de un documento en formato JSON para descarga
// POST: Permite especificar formato de export (JSON, PDF, CSV)

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Importar función para obtener documentos de la base temporal
import { getAllDocumentsFromMockDB } from '@/lib/mock-db';

// Handler GET - Exportar datos de un documento en JSON
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

// Handler POST - Exportar documento en formato específico
export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const body = await request.json();
    const format = body.format || 'json';

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID es requerido' },
        { status: 400 }
      );
    }

    console.log(`📄 [Export] Exportando documento ${jobId} en formato ${format}`);

    // Buscar el documento en la base temporal
    const allDocuments = getAllDocumentsFromMockDB();
    const document = allDocuments.find((doc: any) => doc.jobId === jobId);

    if (!document) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    switch (format.toLowerCase()) {
      case 'pdf':
        // Para PDF, redirigir a la URL original del documento
        if (document.document_url) {
          try {
            const response = await fetch(document.document_url);
            if (response.ok) {
              const pdfBlob = await response.blob();
              return new NextResponse(pdfBlob, {
                status: 200,
                headers: {
                  'Content-Type': 'application/pdf',
                  'Content-Disposition': `attachment; filename="documento_${jobId}.pdf"`,
                  'Cache-Control': 'no-cache'
                }
              });
            } else {
              throw new Error(`Error descargando PDF: ${response.status}`);
            }
          } catch (error) {
            console.error('❌ [Export] Error descargando PDF:', error);
            return NextResponse.json(
              { error: 'Error descargando PDF original', details: error instanceof Error ? error.message : 'Error desconocido' },
              { status: 500 }
            );
          }
        } else {
          return NextResponse.json(
            { error: 'URL del PDF no disponible' },
            { status: 404 }
          );
        }

      case 'csv':
        // Exportar datos extraídos como CSV
        const csvData = convertToCSV(document.extracted_data, jobId);
        return new NextResponse(csvData, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="datos_${jobId}.csv"`,
            'Cache-Control': 'no-cache'
          }
        });

      case 'json':
      default:
        // Exportar como JSON (comportamiento por defecto)
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

        return new NextResponse(
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
    }

  } catch (error) {
    console.error('Error in POST /api/documents/export/[jobId]:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// Función auxiliar para convertir datos a CSV
function convertToCSV(extractedData: any, jobId: string): string {
  try {
    // Si es un array de facturas, procesar cada una
    if (Array.isArray(extractedData)) {
      const headers = ['JobID', 'Factura', 'Fecha', 'Proveedor', 'Cliente', 'Total', 'Impuestos'];
      const rows = extractedData.map((invoice: any) => [
        jobId,
        invoice.invoice_number || '',
        invoice.issue_date || '',
        invoice.supplier?.name || '',
        invoice.customer?.name || '',
        invoice.total_amount || '',
        invoice.tax_amount || ''
      ]);
      
      return [headers, ...rows].map(row => 
        row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
      ).join('\n');
    }
    
    // Si es una factura única
    if (extractedData && typeof extractedData === 'object') {
      const headers = ['JobID', 'Campo', 'Valor'];
      const rows = Object.entries(extractedData).map(([key, value]) => [
        jobId,
        key,
        typeof value === 'object' ? JSON.stringify(value) : String(value)
      ]);
      
      return [headers, ...rows].map(row => 
        row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
      ).join('\n');
    }
    
    // Fallback
    return `JobID,Datos\n"${jobId}","${JSON.stringify(extractedData)}"`;
    
  } catch (error) {
    console.error('Error converting to CSV:', error);
    return `JobID,Error\n"${jobId}","Error procesando datos"`;
  }
} 