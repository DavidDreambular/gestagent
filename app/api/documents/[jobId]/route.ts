// API Route para operaciones CRUD de documentos específicos
// /app/api/documents/[jobId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import pgClient from '@/lib/postgresql-client';
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

    // No necesita verificar conexión, usar pgClient directamente

    // Usar dbAdapter en lugar de pgClient directo para compatibilidad
    const { dbAdapter } = await import('@/lib/db-adapter');
    await dbAdapter.initialize();
    
    const documentResult = await dbAdapter.query(
      'SELECT * FROM documents WHERE job_id = $1',
      [jobId]
    );
    
    if (!documentResult.rows || documentResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    const document = documentResult.rows[0];

    // Verificar que el documento pertenece al usuario
    if (document.user_id !== userId && !session?.user?.role?.includes('admin')) {
      return NextResponse.json(
        { error: 'No tiene permisos para ver este documento' },
        { status: 403 }
      );
    }

    console.log(`[GET Document] Documento encontrado: ${document.status}`);

    // Formatear respuesta
    const response = {
      jobId: document.job_id,
      documentType: document.document_type,
      fileName: document.file_path?.split('/').pop() || 'documento.pdf',
      status: document.status,
      uploadDate: document.upload_timestamp,
      processedData: document.processed_json,
      metadata: document.processing_metadata,
      emitterName: document.emitter_name,
      receiverName: document.receiver_name,
      documentDate: document.document_date,
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

    // No necesita verificar conexión, usar pgClient directamente

    // Usar dbAdapter para compatibilidad
    const { dbAdapter } = await import('@/lib/db-adapter');
    await dbAdapter.initialize();
    
    const documentResult = await dbAdapter.query(
      'SELECT * FROM documents WHERE job_id = $1',
      [jobId]
    );
    
    if (!documentResult.rows || documentResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    const existingDocument = documentResult.rows[0];

    if (existingDocument.user_id !== userId && !session?.user?.role?.includes('admin')) {
      return NextResponse.json(
        { error: 'No tiene permisos para actualizar este documento' },
        { status: 403 }
      );
    }

    // Actualizar documento usando dbAdapter
    const updateQuery = `
      UPDATE documents 
      SET processed_json = $2,
          status = $3,
          emitter_name = $4,
          receiver_name = $5
      WHERE job_id = $1
    `;

    const updateValues = [
      jobId,
      JSON.stringify(body.processedData || body.processedJson || existingDocument.processed_json),
      body.status || existingDocument.status,
      body.emitterName || existingDocument.emitter_name,
      body.receiverName || existingDocument.receiver_name
    ];

    const updateResult = await dbAdapter.query(updateQuery, updateValues);

    if (updateResult.rowCount === 0) {
      return NextResponse.json(
        { error: 'Error al actualizar el documento' },
        { status: 500 }
      );
    }
    
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

    // No necesita verificar conexión, usar pgClient directamente

    // Usar dbAdapter para compatibilidad
    const { dbAdapter } = await import('@/lib/db-adapter');
    await dbAdapter.initialize();
    
    const documentResult = await dbAdapter.query(
      'SELECT * FROM documents WHERE job_id = $1',
      [jobId]
    );
    
    if (!documentResult.rows || documentResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    const existingDocument = documentResult.rows[0];

    if (existingDocument.user_id !== userId && !session?.user?.role?.includes('admin')) {
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
      const deleteResult = await dbAdapter.query('DELETE FROM documents WHERE job_id = $1', [jobId]);
      
      if (deleteResult.rowCount > 0) {
        console.log(`[DELETE Document] Documento ${jobId} eliminado permanentemente`);
      }
    } else {
      // Soft delete - marcar como eliminado
      const updateResult = await dbAdapter.query(
        'UPDATE documents SET status = $2 WHERE job_id = $1',
        [jobId, 'deleted']
      );
      
      if (updateResult.rowCount > 0) {
        console.log(`[DELETE Document] Documento ${jobId} marcado como eliminado`);
      }
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