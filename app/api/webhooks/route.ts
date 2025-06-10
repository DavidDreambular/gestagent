// API Route para webhooks de integración
// /app/api/webhooks/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { memoryDB } from '@/lib/memory-db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Tipos para webhooks
interface WebhookPayload {
  event: string;
  data: any;
  timestamp?: string;
  source?: string;
  signature?: string;
}

// POST - Recibir webhook externo
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
        
        // Registrar webhook fallido
        await memoryDB.createWebhook({
          id: webhookId,
          event: payload.event,
          source,
          status: 'failed',
          payload,
          error: 'Firma inválida',
          timestamp: new Date()
        });
        
        return NextResponse.json(
          { error: 'Firma inválida', webhookId },
          { status: 401 }
        );
      }
    }

    // Registrar webhook recibido
    await memoryDB.createWebhook({
      id: webhookId,
      event: payload.event,
      source,
      status: 'received',
      payload,
      timestamp: new Date()
    });

    console.log(`📝 [WEBHOOK-${webhookId}] Procesando evento: ${payload.event} desde ${source}`);

    // Procesar webhook según el evento
    const result = await processWebhookEvent(webhookId, payload, source);

    // Actualizar estado del webhook
    await memoryDB.updateWebhook(webhookId, {
      status: 'processed',
      response: result
    });

    // Registrar en auditoría
    await memoryDB.createAuditLog({
      entity_type: 'webhook',
      entity_id: webhookId,
      action: 'processed',
      user_id: 'system',
      changes: {
        webhook_id: webhookId,
        event: payload.event,
        source,
        result
      },
      notes: 'Webhook procesado automáticamente'
    });

    return NextResponse.json({
      success: true,
      webhookId,
      event: payload.event,
      source,
      message: 'Webhook procesado correctamente',
      result
    });

  } catch (error: any) {
    console.error(`💥 [WEBHOOK-${webhookId}] Error procesando webhook:`, error);
    
    // Actualizar estado con error
    await memoryDB.updateWebhook(webhookId, {
      status: 'failed',
      error: error.message || 'Error desconocido'
    });

    return NextResponse.json(
      { 
        error: 'Error procesando webhook',
        webhookId,
        details: error.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// GET - Listar webhooks recibidos (solo admin)
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Solo administradores pueden ver webhooks
    if (session.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Solo administradores pueden acceder a los webhooks' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') || undefined;
    const event = searchParams.get('event') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log(`🔍 [WEBHOOK API] Listando webhooks con filtros:`, {
      source, event, status, limit, offset
    });

    // Construir filtros
    const filters: any = {};
    if (source) filters.source = source;
    if (event) filters.event = event;
    if (status) filters.status = status;

    // Obtener webhooks
    const allWebhooks = await memoryDB.getAllWebhooks(filters);

    // Aplicar paginación
    const total = allWebhooks.length;
    const paginatedWebhooks = allWebhooks.slice(offset, offset + limit);

    // Calcular estadísticas
    const stats = {
      total: total,
      by_status: allWebhooks.reduce((acc, w) => {
        acc[w.status] = (acc[w.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      by_source: allWebhooks.reduce((acc, w) => {
        acc[w.source] = (acc[w.source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      success_rate: total > 0 
        ? ((allWebhooks.filter(w => w.status === 'processed').length / total) * 100).toFixed(1)
        : 0
    };

    console.log(`✅ [WEBHOOK API] Retornando ${paginatedWebhooks.length} webhooks de ${total} totales`);

    return NextResponse.json({
      success: true,
      data: paginatedWebhooks,
      stats,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total
      },
      source: 'memory_db'
    });

  } catch (error: any) {
    console.error('❌ [WEBHOOK API] Error en GET:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// PUT - Configurar webhook (crear/actualizar configuración)
export async function PUT(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Solo administradores pueden configurar webhooks
    if (session.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Solo administradores pueden configurar webhooks' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { source, webhook_url, secret, events, is_active } = body;

    if (!source || !webhook_url) {
      return NextResponse.json(
        { error: 'Source y webhook_url son requeridos' },
        { status: 400 }
      );
    }

    console.log(`⚙️ [WEBHOOK CONFIG] Configurando webhook para ${source}`);

    // Por ahora solo registramos la configuración en auditoría
    // En una implementación real, esto se guardaría en una tabla de configuración
    await memoryDB.createAuditLog({
      entity_type: 'webhook_config',
      entity_id: source,
      action: 'configured',
      user_id: session.user?.id || 'unknown',
      changes: {
        source,
        webhook_url,
        has_secret: !!secret,
        events: events || ['*'],
        is_active: is_active !== false
      },
      notes: 'Configuración de webhook actualizada'
    });

    return NextResponse.json({
      success: true,
      message: 'Configuración de webhook actualizada',
      source,
      events: events || ['*'],
      is_active: is_active !== false
    });

  } catch (error: any) {
    console.error('❌ [WEBHOOK CONFIG] Error:', error);
    return NextResponse.json(
      { 
        error: 'Error configurando webhook',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar webhook específico
export async function DELETE(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Solo administradores pueden eliminar webhooks
    if (session.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Solo administradores pueden eliminar webhooks' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get('id');

    if (!webhookId) {
      return NextResponse.json(
        { error: 'ID de webhook requerido' },
        { status: 400 }
      );
    }

    console.log(`🗑️ [WEBHOOK] Eliminando webhook: ${webhookId}`);

    // Verificar que el webhook existe
    const webhook = await memoryDB.getWebhookById(webhookId);
    if (!webhook) {
      return NextResponse.json(
        { error: 'Webhook no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar webhook
    const deleted = await memoryDB.deleteWebhook(webhookId);

    if (deleted) {
      // Registrar en auditoría
      await memoryDB.createAuditLog({
        entity_type: 'webhook',
        entity_id: webhookId,
        action: 'deleted',
        user_id: session.user?.id || 'unknown',
        changes: webhook,
        notes: 'Webhook eliminado por administrador'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook eliminado correctamente',
      webhookId
    });

  } catch (error: any) {
    console.error('❌ [WEBHOOK DELETE] Error:', error);
    return NextResponse.json(
      { 
        error: 'Error eliminando webhook',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
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
    'stripe': process.env.STRIPE_WEBHOOK_SECRET || '',
    'sage': process.env.SAGE_WEBHOOK_SECRET || ''
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

    case 'template.training.completed':
      return await handleTemplateTrainingCompleted(payload.data);
    
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
  
  if (data.documentId) {
    try {
      // Actualizar documento en memoria
      const document = await memoryDB.getDocumentByJobId(data.documentId);
      if (document) {
        await memoryDB.updateDocument(data.documentId, {
          status: 'completed',
          processed_json: data.extractedData || document.processed_json
        });

        // Crear notificación
        if (document.user_id) {
          await memoryDB.createNotification({
            user_id: document.user_id,
            type: 'success',
            title: 'Documento procesado',
            message: `El documento ${document.file_path?.split('/').pop()} ha sido procesado exitosamente`,
            data: { document_id: data.documentId }
          });
        }

        return { updated: true, documentId: data.documentId };
      }
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

async function handleTemplateTrainingCompleted(data: any): Promise<any> {
  console.log('🧠 Procesando entrenamiento de plantilla completado:', data);
  
  if (data.templateId && data.success_rate) {
    try {
      await memoryDB.updateExtractionTemplate(data.templateId, {
        success_rate: data.success_rate,
        usage_count: data.usage_count || 0
      });

      return { updated: true, templateId: data.templateId };
    } catch (error) {
      console.error('Error actualizando plantilla:', error);
      return { updated: false, error: 'Error actualizando plantilla' };
    }
  }

  return { updated: false, reason: 'templateId o success_rate no proporcionados' };
}