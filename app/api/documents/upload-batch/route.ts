import { NextRequest, NextResponse } from 'next/server';
import { parallelProcessorService, ProcessingOptions } from '@/services/parallel-processor.service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/**
 * POST /api/documents/upload-batch
 * Procesar múltiples documentos en paralelo
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || '00000000-0000-0000-0000-000000000000';

    // Obtener archivos del FormData
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No se proporcionaron archivos'
      }, { status: 400 });
    }

    if (files.length > 20) {
      return NextResponse.json({
        success: false,
        error: 'Máximo 20 archivos permitidos por lote'
      }, { status: 400 });
    }

    console.log(`📦 [BatchUpload] Procesando ${files.length} archivos`);

    // Preparar archivos para procesamiento
    const fileBuffers = await Promise.all(
      files.map(async (file) => ({
        fileName: file.name,
        buffer: Buffer.from(await file.arrayBuffer())
      }))
    );

    // Opciones de procesamiento
    const options: ProcessingOptions = {
      maxConcurrency: parseInt(formData.get('maxConcurrency') as string) || 3,
      detectDuplicates: formData.get('detectDuplicates') === 'true',
      autoLinkInvoices: formData.get('autoLinkInvoices') === 'true',
      skipSupplierCreation: formData.get('skipSupplierCreation') === 'true',
      userId,
      requestIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1'
    };

    // Añadir archivos al procesador paralelo
    const jobIds = await parallelProcessorService.addBatch(fileBuffers, options);

    console.log(`✅ [BatchUpload] ${jobIds.length} trabajos creados`);

    return NextResponse.json({
      success: true,
      message: `${files.length} archivos añadidos a la cola de procesamiento`,
      jobIds,
      options
    });

  } catch (error: any) {
    console.error('❌ [BatchUpload] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al procesar archivos',
      details: error?.message
    }, { status: 500 });
  }
}

/**
 * GET /api/documents/upload-batch
 * Obtener estado del procesamiento por lotes
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    
    if (jobId) {
      // Obtener estado de un job específico
      const job = parallelProcessorService.getJobStatus(jobId);
      
      if (!job) {
        return NextResponse.json({
          success: false,
          error: 'Job no encontrado'
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        job
      });
    } else {
      // Obtener estadísticas generales
      const stats = parallelProcessorService.getStatistics();
      const jobs = parallelProcessorService.getAllJobs();
      
      return NextResponse.json({
        success: true,
        stats,
        jobs: jobs.map(job => ({
          jobId: job.jobId,
          fileName: job.fileName,
          status: job.status,
          progress: job.progress,
          error: job.error,
          startTime: job.startTime,
          endTime: job.endTime
        }))
      });
    }
  } catch (error: any) {
    console.error('❌ [BatchUpload] Error obteniendo estado:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al obtener estado',
      details: error?.message
    }, { status: 500 });
  }
}

/**
 * DELETE /api/documents/upload-batch
 * Cancelar trabajos de procesamiento
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const cancelAll = searchParams.get('cancelAll') === 'true';
    
    if (cancelAll) {
      // Cancelar todos los trabajos
      parallelProcessorService.cancelAll();
      
      return NextResponse.json({
        success: true,
        message: 'Todos los trabajos cancelados'
      });
    } else if (jobId) {
      // Cancelar un job específico
      const cancelled = parallelProcessorService.cancelJob(jobId);
      
      if (!cancelled) {
        return NextResponse.json({
          success: false,
          error: 'No se pudo cancelar el trabajo. Puede que ya esté procesándose o completado.'
        }, { status: 400 });
      }
      
      return NextResponse.json({
        success: true,
        message: 'Trabajo cancelado exitosamente'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Debe especificar jobId o cancelAll=true'
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('❌ [BatchUpload] Error cancelando:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al cancelar trabajos',
      details: error?.message
    }, { status: 500 });
  }
}

/**
 * PATCH /api/documents/upload-batch
 * Limpiar trabajos completados/cancelados
 */
export async function PATCH(request: NextRequest) {
  try {
    parallelProcessorService.cleanup();
    
    return NextResponse.json({
      success: true,
      message: 'Trabajos completados limpiados',
      stats: parallelProcessorService.getStatistics()
    });
  } catch (error: any) {
    console.error('❌ [BatchUpload] Error limpiando:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al limpiar trabajos',
      details: error?.message
    }, { status: 500 });
  }
}