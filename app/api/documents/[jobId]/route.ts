// API Route para operaciones CRUD de documentos específicos
// /app/api/documents/[jobId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { GetDocumentQuery } from '@/application/document/get-document.query';
import { GetDocumentQueryHandler } from '@/application/document/get-document.handler';
import { UpdateDocumentCommand } from '@/application/document/update-document.command';
import { UpdateDocumentCommandHandler } from '@/application/document/update-document.handler';
import { documentRepository, auditLogRepository } from '@/api-ddd/dependencies';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: Obtener documento por jobId
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
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

    const { jobId } = params;
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'ID de documento no proporcionado' },
        { status: 400 }
      );
    }

    console.log(`[GET Document] Buscando documento ${jobId} para usuario ${userId}`);

    // Crear handler de consulta
    const getDocumentHandler = new GetDocumentQueryHandler(documentRepository);
    
    // Ejecutar consulta
    const query = new GetDocumentQuery(jobId, userId);
    const document = await getDocumentHandler.handle(query);
    
    if (!document) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el documento pertenece al usuario
    if (document.userId !== userId && !session?.user?.role?.includes('admin')) {
      return NextResponse.json(
        { error: 'No tiene permisos para ver este documento' },
        { status: 403 }
      );
    }

    console.log(`[GET Document] Documento encontrado: ${document.status}`);

    // Formatear respuesta
    const response = {
      jobId: document.jobId,
      documentType: document.documentType,
      fileName: document.fileName || 'documento.pdf',
      status: document.status,
      uploadDate: document.uploadTimestamp,
      processedData: document.processedJson,
      metadata: document.metadata,
      emitterName: document.emitterName,
      receiverName: document.receiverName,
      documentDate: document.documentDate,
      version: document.version
    };

    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('[GET Document] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Error al obtener el documento',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// PUT: Actualizar documento
export async function PUT(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
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

    const { jobId } = params;
    const body = await request.json();
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'ID de documento no proporcionado' },
        { status: 400 }
      );
    }

    console.log(`[PUT Document] Actualizando documento ${jobId}`);

    // Verificar que el documento existe y pertenece al usuario
    const getDocumentHandler = new GetDocumentQueryHandler(documentRepository);
    const existingDocument = await getDocumentHandler.handle(new GetDocumentQuery(jobId, userId));
    
    if (!existingDocument) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    if (existingDocument.userId !== userId && !session?.user?.role?.includes('admin')) {
      return NextResponse.json(
        { error: 'No tiene permisos para actualizar este documento' },
        { status: 403 }
      );
    }

    // Crear handler de actualización
    const updateDocumentHandler = new UpdateDocumentCommandHandler(
      documentRepository,
      auditLogRepository
    );
    
    // Crear comando de actualización
    const command = new UpdateDocumentCommand(
      jobId,
      userId,
      body.processedData || body.processedJson,
      body.metadata
    );
    
    // Ejecutar actualización
    await updateDocumentHandler.handle(command);
    
    console.log(`[PUT Document] Documento ${jobId} actualizado exitosamente`);

    return NextResponse.json({
      success: true,
      message: 'Documento actualizado correctamente',
      jobId: jobId
    });
    
  } catch (error: any) {
    console.error('[PUT Document] Error:', error);
    
    if (error.message?.includes('Invalid data')) {
      return NextResponse.json(
        { error: 'Datos inválidos. Verifique el formato del documento.' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Error al actualizar el documento',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar documento (soft delete o hard delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
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

    const { jobId } = params;
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'ID de documento no proporcionado' },
        { status: 400 }
      );
    }

    console.log(`[DELETE Document] Eliminando documento ${jobId}`);

    // Verificar que el documento existe y pertenece al usuario
    const getDocumentHandler = new GetDocumentQueryHandler(documentRepository);
    const existingDocument = await getDocumentHandler.handle(new GetDocumentQuery(jobId, userId));
    
    if (!existingDocument) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    if (existingDocument.userId !== userId && !session?.user?.role?.includes('admin')) {
      return NextResponse.json(
        { error: 'No tiene permisos para eliminar este documento' },
        { status: 403 }
      );
    }

    // Obtener parámetro de query para determinar tipo de eliminación
    const url = new URL(request.url);
    const forceDelete = url.searchParams.get('force') === 'true';

    if (forceDelete) {
      // Hard delete - eliminar completamente de la base de datos
      await documentRepository.delete(jobId);
      console.log(`[DELETE Document] Documento ${jobId} eliminado permanentemente`);
    } else {
      // Soft delete - marcar como eliminado
      const updateHandler = new UpdateDocumentCommandHandler(
        documentRepository,
        auditLogRepository
      );
      
      const command = new UpdateDocumentCommand(
        jobId,
        userId,
        null,
        { 
          deleted: true, 
          deletedAt: new Date().toISOString(), 
          deletedBy: userId 
        }
      );
      
      await updateHandler.handle(command);
      console.log(`[DELETE Document] Documento ${jobId} marcado como eliminado`);
    }

    return NextResponse.json({
      success: true,
      message: forceDelete ? 'Documento eliminado permanentemente' : 'Documento eliminado correctamente',
      jobId: jobId,
      deleteType: forceDelete ? 'hard' : 'soft'
    });
    
  } catch (error: any) {
    console.error('[DELETE Document] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Error al eliminar el documento',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
