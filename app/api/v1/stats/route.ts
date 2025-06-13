import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import pgClient from '@/lib/postgresql-client'

// Middleware para verificar autenticación API
async function verifyApiAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Token de autorización requerido', status: 401 }
  }

  const token = authHeader.substring(7)

  try {
    const decoded = jwt.verify(
      token,
      process.env.NEXTAUTH_SECRET || 'fallback-secret'
    ) as any

    if (!decoded || decoded.role !== 'provider_api') {
      return { error: 'Token inválido', status: 401 }
    }

    return { success: true, user: decoded }
  } catch (error) {
    return { error: 'Token inválido o expirado', status: 401 }
  }
}

/**
 * GET /api/v1/stats
 * Obtener estadísticas de documentos del proveedor
 * 
 * Query params:
 * - period: all, today, week, month, year (default: all)
 * - start_date: fecha inicio (ISO string)
 * - end_date: fecha fin (ISO string)
 * 
 * Response:
 * {
 *   "success": true,
 *   "stats": {
 *     "total": 150,
 *     "pending": 10,
 *     "processing": 5,
 *     "completed": 130,
 *     "error": 5,
 *     "byType": {
 *       "factura": 100,
 *       "recibo": 30,
 *       "nomina": 20
 *     },
 *     "recentActivity": [...],
 *     "period": {
 *       "start": "2024-01-01T00:00:00Z",
 *       "end": "2024-12-31T23:59:59Z"
 *     }
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const auth = await verifyApiAuth(request)
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error, code: 'UNAUTHORIZED' },
        { status: auth.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'all'
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    const providerId = auth.user.providerId

    // Obtener información del proveedor
    const { data: providerData, error: providerError } = await pgClient.query(
      'SELECT name, nif FROM suppliers WHERE supplier_id = $1',
      [providerId]
    )

    if (providerError || !providerData || providerData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Proveedor no encontrado', code: 'PROVIDER_NOT_FOUND' },
        { status: 404 }
      )
    }

    const provider = providerData[0]

    // Calcular fechas según el período
    let periodStart: Date | null = null
    let periodEnd: Date | null = null

    if (startDate && endDate) {
      periodStart = new Date(startDate)
      periodEnd = new Date(endDate)
    } else {
      const now = new Date()
      periodEnd = now

      switch (period) {
        case 'today':
          periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'year':
          periodStart = new Date(now.getFullYear(), 0, 1)
          break
        case 'all':
        default:
          periodStart = null
          periodEnd = null
          break
      }
    }

    // Construir query base
    let baseWhere = `WHERE (processed_json->>'supplier'->>'nif' = $1 OR processed_json->>'supplier'->>'name' ILIKE $2)`
    const baseParams = [provider.nif, `%${provider.name}%`]
    let paramIndex = 3

    if (periodStart && periodEnd) {
      baseWhere += ` AND upload_timestamp >= $${paramIndex} AND upload_timestamp <= $${paramIndex + 1}`
      baseParams.push(periodStart.toISOString(), periodEnd.toISOString())
      paramIndex += 2
    }

    // Obtener estadísticas generales
    const { data: statsData, error: statsError } = await pgClient.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
        COUNT(CASE WHEN status = 'completed' OR status = 'processed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'error' THEN 1 END) as error
      FROM document_processing 
      ${baseWhere}
    `, baseParams)

    if (statsError) {
      console.error('❌ [API v1 Stats] Error consultando estadísticas:', statsError)
      return NextResponse.json(
        { success: false, error: 'Error consultando estadísticas', code: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    const stats = statsData?.[0] || {
      total: 0, pending: 0, processing: 0, completed: 0, error: 0
    }

    // Obtener estadísticas por tipo de documento
    const { data: typeStatsData, error: typeStatsError } = await pgClient.query(`
      SELECT 
        document_type,
        COUNT(*) as count
      FROM document_processing 
      ${baseWhere}
      GROUP BY document_type
      ORDER BY count DESC
    `, baseParams)

    const byType: Record<string, number> = {}
    if (!typeStatsError && typeStatsData) {
      typeStatsData.forEach(row => {
        byType[row.document_type] = parseInt(row.count)
      })
    }

    // Obtener actividad reciente (últimos 10 documentos)
    const { data: recentData, error: recentError } = await pgClient.query(`
      SELECT 
        job_id,
        document_type,
        status,
        upload_timestamp,
        processed_json->>'document_number' as document_number
      FROM document_processing 
      ${baseWhere}
      ORDER BY upload_timestamp DESC
      LIMIT 10
    `, baseParams)

    const recentActivity = []
    if (!recentError && recentData) {
      recentActivity.push(...recentData.map(row => ({
        id: row.job_id,
        type: row.document_type,
        number: row.document_number,
        status: row.status,
        uploadedAt: row.upload_timestamp
      })))
    }

    console.log(`✅ [API v1 Stats] Estadísticas obtenidas para proveedor: ${provider.name}`)

    return NextResponse.json({
      success: true,
      stats: {
        total: parseInt(stats.total),
        pending: parseInt(stats.pending),
        processing: parseInt(stats.processing),
        completed: parseInt(stats.completed),
        error: parseInt(stats.error),
        byType,
        recentActivity,
        period: periodStart && periodEnd ? {
          start: periodStart.toISOString(),
          end: periodEnd.toISOString()
        } : null
      }
    })

  } catch (error) {
    console.error('❌ [API v1 Stats] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}