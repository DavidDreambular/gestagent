import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import pgClient from '@/lib/postgresql-client'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('portal-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Verificar y decodificar el token
    const decoded = jwt.verify(
      token,
      process.env.NEXTAUTH_SECRET || 'fallback-secret'
    ) as any

    if (!decoded || decoded.role !== 'provider') {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    const providerId = decoded.providerId

    // Obtener estadísticas de documentos del proveedor
    const { data: statsData, error: statsError } = await pgClient.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' OR status = 'processing' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as processed,
        COUNT(CASE WHEN status = 'error' THEN 1 END) as failed,
        COUNT(CASE WHEN DATE_PART('month', upload_timestamp) = DATE_PART('month', CURRENT_DATE) 
                  AND DATE_PART('year', upload_timestamp) = DATE_PART('year', CURRENT_DATE) THEN 1 END) as monthly
      FROM document_processing 
      WHERE processed_json->>'supplier'->>'nif' IN (
        SELECT nif FROM suppliers WHERE supplier_id = $1
      )
      OR processed_json->>'supplier'->>'name' ILIKE (
        SELECT '%' || name || '%' FROM suppliers WHERE supplier_id = $1 LIMIT 1
      )
    `, [providerId])

    if (statsError) {
      console.error('❌ [Portal Stats] Error consultando estadísticas:', statsError)
      return NextResponse.json(
        { error: 'Error consultando estadísticas' },
        { status: 500 }
      )
    }

    const stats = statsData?.[0] || {
      total: 0,
      pending: 0,
      processed: 0,
      failed: 0,
      monthly: 0
    }

    return NextResponse.json({
      total: parseInt(stats.total) || 0,
      pending: parseInt(stats.pending) || 0,
      processed: parseInt(stats.processed) || 0,
      failed: parseInt(stats.failed) || 0,
      monthly: parseInt(stats.monthly) || 0
    })

  } catch (error) {
    console.error('❌ [Portal Stats] Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}