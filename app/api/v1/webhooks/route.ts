import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import pgClient from '@/lib/postgresql-client'
import crypto from 'crypto'

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
 * GET /api/v1/webhooks
 * Obtener lista de webhooks configurados
 * 
 * Response:
 * {
 *   "success": true,
 *   "webhooks": [
 *     {
 *       "id": "uuid",
 *       "url": "https://mi-sistema.com/webhook",
 *       "events": ["document.uploaded", "document.processed"],
 *       "active": true,
 *       "createdAt": "2024-01-01T00:00:00Z"
 *     }
 *   ]
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

    const userId = auth.user.userId

    // Obtener webhooks del proveedor
    const { data: webhooksData, error: webhooksError } = await pgClient.query(`
      SELECT 
        id,
        url,
        events,
        active,
        secret_key,
        created_at,
        updated_at,
        last_triggered_at,
        total_calls,
        failed_calls
      FROM provider_webhooks 
      WHERE provider_user_id = $1
      ORDER BY created_at DESC
    `, [userId])

    if (webhooksError) {
      console.error('❌ [API v1 Webhooks] Error consultando webhooks:', webhooksError)
      return NextResponse.json(
        { success: false, error: 'Error consultando webhooks', code: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    const webhooks = (webhooksData || []).map(webhook => ({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events || [],
      active: webhook.active,
      createdAt: webhook.created_at,
      updatedAt: webhook.updated_at,
      lastTriggeredAt: webhook.last_triggered_at,
      stats: {
        totalCalls: webhook.total_calls || 0,
        failedCalls: webhook.failed_calls || 0
      }
      // No incluimos el secret_key por seguridad
    }))

    return NextResponse.json({
      success: true,
      webhooks
    })

  } catch (error) {
    console.error('❌ [API v1 Webhooks] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/webhooks
 * Crear un nuevo webhook
 * 
 * Body:
 * {
 *   "url": "https://mi-sistema.com/webhook",
 *   "events": ["document.uploaded", "document.processed", "document.error"]
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "webhook": {
 *     "id": "uuid",
 *     "url": "https://mi-sistema.com/webhook",
 *     "events": ["document.uploaded", "document.processed"],
 *     "secretKey": "webhook_secret_...",
 *     "active": true
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const auth = await verifyApiAuth(request)
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error, code: 'UNAUTHORIZED' },
        { status: auth.status }
      )
    }

    const { url, events } = await request.json()
    const userId = auth.user.userId

    // Validaciones
    if (!url || !events || !Array.isArray(events)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'URL y eventos son requeridos',
          code: 'MISSING_REQUIRED_FIELDS'
        },
        { status: 400 }
      )
    }

    // Validar URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { 
          success: false, 
          error: 'URL inválida',
          code: 'INVALID_URL'
        },
        { status: 400 }
      )
    }

    // Validar eventos soportados
    const supportedEvents = [
      'document.uploaded',
      'document.processing',
      'document.processed',
      'document.error',
      'document.updated'
    ]

    const invalidEvents = events.filter(event => !supportedEvents.includes(event))
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Eventos no soportados: ${invalidEvents.join(', ')}`,
          code: 'INVALID_EVENTS',
          supportedEvents
        },
        { status: 400 }
      )
    }

    // Verificar límite de webhooks por usuario (máximo 5)
    const { data: countData, error: countError } = await pgClient.query(
      'SELECT COUNT(*) as count FROM provider_webhooks WHERE provider_user_id = $1',
      [userId]
    )

    if (countError) {
      console.error('❌ [API v1 Webhooks] Error verificando límite:', countError)
      return NextResponse.json(
        { success: false, error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
        { status: 500 }
      )
    }

    const currentCount = parseInt(countData?.[0]?.count || '0')
    if (currentCount >= 5) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Límite de webhooks alcanzado (máximo 5)',
          code: 'WEBHOOK_LIMIT_REACHED'
        },
        { status: 400 }
      )
    }

    // Generar secret key para verificación de webhooks
    const secretKey = `whsec_${crypto.randomBytes(32).toString('hex')}`

    // Crear webhook en la base de datos
    const { data: webhookData, error: webhookError } = await pgClient.query(`
      INSERT INTO provider_webhooks (
        provider_user_id,
        url,
        events,
        secret_key,
        active,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, true, NOW(), NOW())
      RETURNING *
    `, [userId, url, JSON.stringify(events), secretKey])

    if (webhookError) {
      console.error('❌ [API v1 Webhooks] Error creando webhook:', webhookError)
      return NextResponse.json(
        { success: false, error: 'Error creando webhook', code: 'DATABASE_ERROR' },
        { status: 500 }
      )
    }

    const webhook = webhookData[0]

    // Registrar en audit logs
    try {
      await pgClient.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          userId,
          'CREATE',
          'webhook',
          webhook.id,
          JSON.stringify({
            url: url,
            events: events,
            created_by: 'api_integration'
          })
        ]
      )
    } catch (auditError) {
      console.log('Audit log not available:', auditError)
    }

    console.log(`✅ [API v1 Webhooks] Webhook creado: ${webhook.id}`)

    return NextResponse.json({
      success: true,
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        secretKey: webhook.secret_key,
        active: webhook.active,
        createdAt: webhook.created_at
      },
      message: 'Webhook creado exitosamente'
    }, { status: 201 })

  } catch (error) {
    console.error('❌ [API v1 Webhooks] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}