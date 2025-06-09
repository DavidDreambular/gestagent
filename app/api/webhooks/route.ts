// API Route para webhooks de integración
// /app/api/webhooks/route.ts
// Recepción y procesamiento de webhooks de sistemas externos

import { NextRequest, NextResponse } from 'next/server';
import { PostgreSQLClient } from '@/lib/postgresql-client';
import crypto from 'crypto';
import { AuditService } from '@/services/audit';

const pgClient = new PostgreSQLClient();
const auditService = new AuditService();

// Tipos para webhooks
interface WebhookPayload {
  event: string;
  data: any;
  timestamp: string;
  source: string;
  signature?: string;
}

interface ProcessedWebhook {
  id: string;
  event: string;
  source: string;
  status: 'received' | 'processing' | 'processed' | 'failed';
  payload: any;
  response?: any;
  error?: string;
  timestamp: string;
  processed_at?: string;
}

export const dynamic = 'force-dynamic';

// POST - Recibir webhook
export async function POST(request: NextRequest) {
  const webhookId = crypto.randomUUID();
  
  try {
    console.log(`🔗 [WEBHOOK] Webhook recibido ID: ${webhookId}`);
    
    // Obtener el payload
    const payload: WebhookPayload = await request.json();
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') || payload.source || 'unknown';

    // Validar estructura básica
    if (!payload.event || !payload.data) {
      console.error(`❌ [WEBHOOK-${webhookId}] Payload inválido:`, payload);
      return NextResponse.json(
        { 
          error: 'Payload inválido',
          required: ['event', 'data'],
          webhookId
        },
        { status: 400 }
      );
    }

    // Verificar firma si está presente
    if (payload.signature && source !== 'unknown') {
      const isValid = verifyWebhookSignature(payload, source);
      if (!isValid) {
        console.error(`🔒 [WEBHOOK-${webhookId}] Firma inválida para source: ${source}`);
        await logWebhook({
          id: webhookId,
          event: payload.event,
          source,
          status: 'failed',
          payload,
          error: 'Firma inválida',
          timestamp: new Date().toISOString()
        });
        
        return NextResponse.json(
          { error: 'Firma inválida', webhookId },
          { status: 401 }
        );
      }
    }

    // Registrar webhook recibido
    await logWebhook({
      id: webhookId,
      event: payload.event,
      source,
      status: 'received',
      payload,
      timestamp: new Date().toISOString()
    });

    console.log(`📝 [WEBHOOK-${webhookId}] Procesando evento: ${payload.event} desde ${source}`);

    // Procesar webhook según el evento
    const result = await processWebhookEvent(webhookId, payload, source);

    // Actualizar estado del webhook
    await updateWebhookStatus(webhookId, 'processed', result);

    // Registrar en auditoría
    await AuditService.logAction({
      action: 'webhook_processed',
      resourceType: 'webhook',
      resourceId: webhookId,
      details: {
        webhook_id: webhookId,
        event: payload.event,
        source,
        result
      }
    });

    return NextResponse.json({
      success: true,
      webhookId,
      event: payload.event,
      source,
      message: 'Webhook procesado correctamente',
      result
    });

  } catch (error) {
    console.error(`💥 [WEBHOOK-${webhookId}] Error procesando webhook:`, error);
    
    // Actualizar estado con error
    await updateWebhookStatus(webhookId, 'failed', null, error instanceof Error ? error.message : 'Error desconocido');

    return NextResponse.json(
      { 
        error: 'Error procesando webhook',
        webhookId,
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// GET - Listar webhooks recibidos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source');
    const event = searchParams.get('event');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    if (source) {
      paramCount++;
      conditions.push(`source = $${paramCount}`);
      params.push(source);
    }

    if (event) {
      paramCount++;
      conditions.push(`event = $${paramCount}`);
      params.push(event);
    }

    if (status) {
      paramCount++;
      conditions.push(`status = $${paramCount}`);
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    try {
      const query = `
        SELECT * FROM webhooks 
        ${whereClause}
        ORDER BY timestamp DESC 
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;
      
      params.push(limit, offset);
      const result = await pgClient.query<ProcessedWebhook>(query, params);

      const webhooks = result.data || [];

      return NextResponse.json({
        success: true,
        data: webhooks,
        pagination: {
          limit,
          offset,
          total: webhooks.length
        },
        source: 'database'
      });

    } catch (postgresqlError) {
      console.warn('Error consultando webhooks de PostgreSQL:', postgresqlError);
      
      // Fallback a datos de ejemplo
      const mockWebhooks: ProcessedWebhook[] = [
        {
          id: 'webhook-001',
          event: 'document.processed',
          source: 'mistral',
          status: 'processed',
          payload: { documentId: 'doc-123', confidence: 0.95 },
          response: { success: true },
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          processed_at: new Date(Date.now() - 3595000).toISOString()
        },
        {
          id: 'webhook-002',
          event: 'invoice.validation.completed',
          source: 'accounting_system',
          status: 'processed',
          payload: { invoiceId: 'inv-456', status: 'validated' },
          response: { updated: true },
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          processed_at: new Date(Date.now() - 7195000).toISOString()
        }
      ];

      return NextResponse.json({
        success: true,
        data: mockWebhooks.slice(offset, offset + limit),
        pagination: {
          limit,
          offset,
          total: mockWebhooks.length
        },
        source: 'mock',
        warning: 'Usando datos de ejemplo'
      });
    }

  } catch (error) {
    console.error('Error en GET /api/webhooks:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Función para verificar firma del webhook
function verifyWebhookSignature(payload: WebhookPayload, source: string): boolean {
  try {
    const secretKey = getWebhookSecret(source);
    if (!secretKey) return true; // Si no hay clave, no verificar

    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(JSON.stringify(payload.data))
      .digest('hex');

    return payload.signature === expectedSignature;
  } catch (error) {
    console.error('Error verificando firma de webhook:', error);
    return false;
  }
}

// Función para obtener secreto del webhook por fuente
function getWebhookSecret(source: string): string | null {
  const secrets: { [key: string]: string } = {
    'mistral': process.env.MISTRAL_WEBHOOK_SECRET || '',
    'accounting_system': process.env.ACCOUNTING_WEBHOOK_SECRET || '',
    'stripe': process.env.STRIPE_WEBHOOK_SECRET || ''
  };

  return secrets[source] || null;
}

// Función para procesar eventos de webhook
async function processWebhookEvent(webhookId: string, payload: WebhookPayload, source: string): Promise<any> {
  console.log(`⚡ [WEBHOOK-${webhookId}] Procesando evento: ${payload.event}`);

  switch (payload.event) {
    case 'document.processed':
      return await handleDocumentProcessed(payload.data);
    
    case 'invoice.validation.completed':
      return await handleInvoiceValidation(payload.data);
    
    case 'payment.completed':
      return await handlePaymentCompleted(payload.data);
    
    case 'user.registered':
      return await handleUserRegistered(payload.data);
    
    default:
      console.warn(`⚠️ [WEBHOOK-${webhookId}] Evento no reconocido: ${payload.event}`);
      return { 
        processed: false, 
        reason: 'Evento no reconocido',
        event: payload.event 
      };
  }
}

// Handlers específicos para eventos
async function handleDocumentProcessed(data: any): Promise<any> {
  console.log('📄 Procesando documento completado:', data);
  
  // Actualizar estado del documento en la base de datos
  if (data.documentId) {
    try {
      const updateQuery = `
        UPDATE documents 
        SET status = 'completed', 
            processed_json = $1,
            version = version + 1
        WHERE job_id = $2
      `;
      
      await pgClient.query(updateQuery, [
        JSON.stringify(data.extractedData || {}),
        data.documentId
      ]);

      return { updated: true, documentId: data.documentId };
    } catch (error) {
      console.error('Error actualizando documento:', error);
      return { updated: false, error: 'Error de base de datos' };
    }
  }

  return { updated: false, reason: 'documentId no proporcionado' };
}

async function handleInvoiceValidation(data: any): Promise<any> {
  console.log('💰 Procesando validación de factura:', data);
  return { processed: true, invoiceId: data.invoiceId };
}

async function handlePaymentCompleted(data: any): Promise<any> {
  console.log('💳 Procesando pago completado:', data);
  return { processed: true, paymentId: data.paymentId };
}

async function handleUserRegistered(data: any): Promise<any> {
  console.log('👤 Procesando usuario registrado:', data);
  return { processed: true, userId: data.userId };
}

// Función para registrar webhook en base de datos
async function logWebhook(webhook: ProcessedWebhook): Promise<void> {
  try {
    const insertQuery = `
      INSERT INTO webhooks (id, event, source, status, payload, response, error, timestamp, processed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    
    await pgClient.query(insertQuery, [
      webhook.id,
      webhook.event,
      webhook.source,
      webhook.status,
      JSON.stringify(webhook.payload),
      webhook.response ? JSON.stringify(webhook.response) : null,
      webhook.error,
      webhook.timestamp,
      webhook.processed_at
    ]);
  } catch (error) {
    console.error('Error registrando webhook en BD:', error);
  }
}

// Función para actualizar estado del webhook
async function updateWebhookStatus(webhookId: string, status: string, response?: any, error?: string): Promise<void> {
  try {
    const updateQuery = `
      UPDATE webhooks 
      SET status = $1, response = $2, error = $3, processed_at = $4
      WHERE id = $5
    `;
    
    await pgClient.query(updateQuery, [
      status,
      response ? JSON.stringify(response) : null,
      error,
      new Date().toISOString(),
      webhookId
    ]);
  } catch (dbError) {
    console.error('Error actualizando estado de webhook:', dbError);
  }
} 