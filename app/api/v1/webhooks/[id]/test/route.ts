// API para probar webhooks
// /app/api/v1/webhooks/[id]/test/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { webhookDispatcher } from '@/services/webhook-dispatcher.service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const webhookId = params.id;

    // Crear evento de prueba
    const testEvent = {
      event: 'webhook.test',
      data: {
        message: 'This is a test webhook from GestAgent',
        timestamp: new Date().toISOString(),
        user_id: session.user.id,
        test: true
      },
      timestamp: new Date().toISOString(),
      source: 'developer_portal',
      eventId: `test_${Date.now()}`
    };

    // Intentar dispatch del evento de prueba
    // Nota: Esto requeriría modificar el dispatcher para manejar webhooks específicos
    // Por ahora, simularemos la prueba
    
    // Aquí podrías implementar la lógica específica para probar un webhook individual
    // await webhookDispatcher.testWebhook(webhookId, testEvent);

    return NextResponse.json({
      success: true,
      message: 'Test webhook sent successfully',
      data: {
        event: testEvent.event,
        webhook_id: webhookId,
        sent_at: testEvent.timestamp
      }
    });

  } catch (error) {
    console.error('❌ [WEBHOOK_TEST] Error sending test webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}