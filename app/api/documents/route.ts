// API Route para listar documentos
// /app/api/documents/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { documentRepository } from '@/api-ddd/dependencies';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: Listar todos los documentos del usuario
export async function GET(request: NextRequest) {
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

    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const documentType = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log(`[List Documents] Usuario: ${userId}, Status: ${status}, Type: ${documentType}`);

    // Buscar documentos del usuario
    // Por ahora usando el método findByJobId como ejemplo
    // En producción, necesitaríamos un método findByUserId en el repositorio
    const allDocuments = await documentRepository.findAll?.() || [];
    
    // Filtrar documentos del usuario
    const userDocuments = allDocuments.filter(doc => 
      doc.userId === userId || session?.user?.role?.includes('admin')
    );
    
    // Aplicar filtros adicionales
    let filteredDocuments = userDocuments;
    
    if (status) {
      filteredDocuments = filteredDocuments.filter(doc => doc.status === status);
    }
    
    if (documentType) {
      filteredDocuments = filteredDocuments.filter(doc => doc.documentType === documentType);
    }
    
    // Ordenar por fecha de carga (más recientes primero)
    filteredDocuments.sort((a, b) => 
      b.uploadTimestamp.getTime() - a.uploadTimestamp.getTime()
    );
    
    // Aplicar paginación
    const totalCount = filteredDocuments.length;
    const paginatedDocuments = filteredDocuments.slice(offset, offset + limit);
    
    // Formatear respuesta
    const documents = paginatedDocuments.map(doc => ({
      jobId: doc.jobId,
      documentType: doc.documentType,
      fileName: doc.fileName || 'documento.pdf',
      status: doc.status,
      uploadDate: doc.uploadTimestamp,
      emitterName: doc.emitterName,
      receiverName: doc.receiverName,
      documentDate: doc.documentDate,
      version: doc.version,
      hasProcessedData: !!doc.processedJson && Object.keys(doc.processedJson).length > 0
    }));

    return NextResponse.json({
      documents,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });
    
  } catch (error: any) {
    console.error('[List Documents] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Error al listar documentos',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
