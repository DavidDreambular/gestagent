// API para obtener la clave secreta de un webhook
// /app/api/v1/webhooks/[id]/secret/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { postgresqlClient } from '@/lib/postgresql-client';

export async function GET(
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

    // Obtener webhook y verificar que pertenece al usuario
    const result = await postgresqlClient.query(`
      SELECT secret_key 
      FROM provider_webhooks 
      WHERE id = $1 AND provider_user_id = $2
    `, [webhookId, session.user.id]);

    if (!result.data?.[0]) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        secret_key: result.data[0].secret_key
      }
    });

  } catch (error) {
    console.error('❌ [WEBHOOK_SECRET] Error getting webhook secret:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}