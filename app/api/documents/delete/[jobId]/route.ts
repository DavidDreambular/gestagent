// API Route para eliminar documentos usando el sistema correcto
import { NextRequest, NextResponse } from 'next/server';
import { dbAdapter } from '@/lib/db-adapter';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    console.log(`🗑️ [DELETE] Iniciando eliminación de documento: ${params.jobId}`);
    
    // Verificar autenticación (opcional para desarrollo)
    let userId = '00000000-0000-0000-0000-000000000000';
    try {
      const session = await getServerSession(authOptions);
      userId = session?.user?.id || '00000000-0000-0000-0000-000000000000';
    } catch (authError) {
      console.warn('⚠️ [DELETE] Sin autenticación, usando usuario de desarrollo');
    }

    const { jobId } = params;
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'ID de documento no proporcionado' },
        { status: 400 }
      );
    }

    // Inicializar el adaptador de base de datos
    await dbAdapter.initialize();

    // Verificar que el documento existe
    const existingDocResult = await dbAdapter.query(
      'SELECT job_id, status, emitter_name, user_id FROM documents WHERE job_id = $1',
      [jobId]
    );
    
    if (!existingDocResult.rows || existingDocResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    const existingDocument = existingDocResult.rows[0];
    console.log(`📄 [DELETE] Documento encontrado: ${existingDocument.emitter_name || 'Sin nombre'}`);

    // Obtener parámetro de query para determinar tipo de eliminación
    const url = new URL(request.url);
    const forceDelete = url.searchParams.get('force') === 'true';

    if (forceDelete) {
      // Hard delete - eliminar completamente de la base de datos
      console.log(`🗑️ [DELETE] Eliminación permanente de documento: ${jobId}`);
      
      const deleteResult = await dbAdapter.query(
        'DELETE FROM documents WHERE job_id = $1',
        [jobId]
      );
      
      if (deleteResult.rowCount > 0) {
        console.log(`✅ [DELETE] Documento ${jobId} eliminado permanentemente`);
        
        return NextResponse.json({
          success: true,
          message: 'Documento eliminado permanentemente',
          jobId: jobId,
          deleteType: 'hard'
        });
      } else {
        return NextResponse.json(
          { error: 'No se pudo eliminar el documento' },
          { status: 500 }
        );
      }
    } else {
      // Soft delete - marcar como eliminado
      console.log(`🗑️ [DELETE] Eliminación suave de documento: ${jobId}`);
      
      const updateResult = await dbAdapter.query(
        `UPDATE documents 
         SET status = 'deleted', 
             upload_timestamp = CURRENT_TIMESTAMP
         WHERE job_id = $1`,
        [jobId]
      );
      
      if (updateResult.rowCount > 0) {
        console.log(`✅ [DELETE] Documento ${jobId} marcado como eliminado`);
        
        return NextResponse.json({
          success: true,
          message: 'Documento eliminado correctamente',
          jobId: jobId,
          deleteType: 'soft'
        });
      } else {
        return NextResponse.json(
          { error: 'No se pudo eliminar el documento' },
          { status: 500 }
        );
      }
    }
    
  } catch (error: any) {
    console.error('❌ [DELETE] Error eliminando documento:', error);
    
    return NextResponse.json(
      { 
        error: 'Error al eliminar el documento',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}