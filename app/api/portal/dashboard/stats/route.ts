import { NextRequest, NextResponse } from 'next/server'
import { postgresqlClient } from '@/lib/postgresql-client'
import { requirePortalAuth } from '@/lib/portal-auth'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const user = requirePortalAuth(request)
    
    console.log('📊 [Portal Stats] Obteniendo estadísticas para proveedor:', user.providerName)

    // Obtener estadísticas del proveedor
    const statsQuery = `
      SELECT 
        COUNT(*) as total_documents,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as pending_validation,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_documents,
        COUNT(CASE WHEN upload_timestamp >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as recent_uploads
      FROM documents 
      WHERE emitter_name = (
        SELECT name FROM suppliers WHERE supplier_id = $1
      )
    `

    const result = await postgresqlClient.query(statsQuery, [user.providerId])
    
    if (!result.data || result.data.length === 0) {
      return NextResponse.json({
        total_documents: 0,
        pending_validation: 0,
        completed_documents: 0,
        recent_uploads: 0
      })
    }

    const stats = result.data[0]

    // Convertir strings a números
    const response = {
      total_documents: parseInt(stats.total_documents) || 0,
      pending_validation: parseInt(stats.pending_validation) || 0,
      completed_documents: parseInt(stats.completed_documents) || 0,
      recent_uploads: parseInt(stats.recent_uploads) || 0
    }

    console.log('📊 [Portal Stats] Estadísticas calculadas:', response)

    return NextResponse.json(response)

  } catch (error) {
    if (error instanceof Error && error.message === 'No autenticado') {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    console.error('❌ [Portal Stats] Error obteniendo estadísticas:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 