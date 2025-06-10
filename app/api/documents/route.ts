// API Route para listar documentos
// /app/api/documents/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { memoryDB } from '@/lib/memory-db';
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

    // Obtener documentos con filtros
    const filters: any = {};
    if (status) filters.status = status;
    if (documentType) filters.document_type = documentType;
    
    const allDocuments = await memoryDB.getAllDocuments(filters);
    
    // Filtrar documentos del usuario (si no es admin)
    let userDocuments = allDocuments;
    if (!session?.user?.role?.includes('admin')) {
      userDocuments = allDocuments.filter(doc => doc.user_id === userId);
    }
    
    // Aplicar paginación
    const totalCount = userDocuments.length;
    const paginatedDocuments = userDocuments.slice(offset, offset + limit);
    
    // Formatear respuesta
    const documents = paginatedDocuments.map(doc => ({
      jobId: doc.job_id,
      documentType: doc.document_type,
      fileName: doc.file_path?.split('/').pop() || 'documento.pdf',
      status: doc.status,
      uploadDate: doc.upload_timestamp,
      emitterName: doc.emitter_name,
      receiverName: doc.receiver_name,
      documentDate: doc.document_date,
      version: doc.version,
      hasProcessedData: !!doc.processed_json && Object.keys(doc.processed_json).length > 0
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
