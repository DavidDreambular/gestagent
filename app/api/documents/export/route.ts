// API Route para exportar documentos
// /app/api/documents/export/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { documentRepository } from '@/api-ddd/dependencies';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notificationService } from '@/services/notification.service';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

// POST: Exportar documentos en diferentes formatos
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || request.headers.get('user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado. Por favor inicie sesión.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      documentIds = [], 
      format = 'csv', 
      includeProcessedData = true 
    } = body;

    console.log(`[Export Documents] Formato: ${format}, Documentos: ${documentIds.length}`);

    // Obtener documentos
    const documents = [];
    for (const jobId of documentIds) {
      const doc = await documentRepository.findByJobId(jobId);
      if (doc && (doc.userId === userId || session?.user?.role?.includes('admin'))) {
        documents.push(doc);
      }
    }

    if (documents.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron documentos para exportar' },
        { status: 404 }
      );
    }

    // Preparar datos para exportación
    const exportData = documents.map(doc => {
      const baseData = {
        'ID Documento': doc.jobId,
        'Tipo': doc.documentType,
        'Archivo': doc.fileName || 'N/A',
        'Estado': doc.status,
        'Fecha Carga': doc.uploadTimestamp.toISOString(),
        'Emisor': doc.emitterName || 'N/A',
        'Receptor': doc.receiverName || 'N/A',
        'Fecha Documento': doc.documentDate || 'N/A'
      };

      if (includeProcessedData && doc.processedJson) {
        // Aplanar datos procesados para exportación
        const processedFlat = flattenObject(doc.processedJson);
        return { ...baseData, ...processedFlat };
      }

      return baseData;
    });

    // Generar archivo según formato
    let fileContent: Buffer;
    let mimeType: string;
    let fileName: string;

    switch (format.toLowerCase()) {
      case 'xlsx':
      case 'excel':
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Documentos');
        fileContent = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        fileName = `documentos_export_${Date.now()}.xlsx`;
        break;

      case 'csv':
      default:
        const csvContent = convertToCSV(exportData);
        fileContent = Buffer.from(csvContent, 'utf-8');
        mimeType = 'text/csv';
        fileName = `documentos_export_${Date.now()}.csv`;
        break;
    }

    // Enviar notificación de exportación completada
    await notificationService.notifyExportCompleted(
      userId,
      format.toUpperCase(),
      documents.length
    );

    // Crear respuesta con el archivo
    return new NextResponse(fileContent, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileContent.length.toString()
      }
    });

  } catch (error: any) {
    console.error('[Export Documents] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Error al exportar documentos',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// Función auxiliar para aplanar objetos anidados
function flattenObject(obj: any, prefix = ''): any {
  return Object.keys(obj).reduce((acc, key) => {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      return { ...acc, ...flattenObject(obj[key], newKey) };
    } else if (Array.isArray(obj[key])) {
      acc[newKey] = obj[key].join(', ');
      return acc;
    } else {
      acc[newKey] = obj[key];
      return acc;
    }
  }, {} as any);
}

// Función auxiliar para convertir a CSV
function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // Escapar valores que contengan comas o comillas
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
}
