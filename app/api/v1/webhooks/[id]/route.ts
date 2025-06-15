// API para operaciones específicas de webhook
// /app/api/v1/webhooks/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { postgresqlClient } from '@/lib/postgresql-client';

// DELETE: Eliminar webhook
export async function DELETE(
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

    // Verificar que el webhook existe y pertenece al usuario
    const checkResult = await postgresqlClient.query(`
      SELECT id FROM provider_webhooks 
      WHERE id = $1 AND provider_user_id = $2
    `, [webhookId, session.user.id]);

    if (!checkResult.data?.[0]) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    // Eliminar webhook
    await postgresqlClient.query(`
      DELETE FROM provider_webhooks 
      WHERE id = $1 AND provider_user_id = $2
    `, [webhookId, session.user.id]);

    console.log(`✅ [WEBHOOK] Webhook deleted: ${webhookId} by user ${session.user.id}`);

    return NextResponse.json({
      success: true,
      message: 'Webhook deleted successfully'
    });

  } catch (error) {
    console.error('❌ [WEBHOOK_DELETE] Error deleting webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: Actualizar webhook
export async function PATCH(
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
    const body = await request.json();
    const { url, events, active } = body;

    // Verificar que el webhook existe y pertenece al usuario
    const checkResult = await postgresqlClient.query(`
      SELECT id FROM provider_webhooks 
      WHERE id = $1 AND provider_user_id = $2
    `, [webhookId, session.user.id]);

    if (!checkResult.data?.[0]) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    // Preparar campos a actualizar
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (url !== undefined) {
      // Validar URL
      try {
        new URL(url);
      } catch {
        return NextResponse.json(
          { error: 'Invalid URL format' },
          { status: 400 }
        );
      }
      
      updates.push(`url = $${paramIndex}`);
      values.push(url);
      paramIndex++;
    }

    if (events !== undefined) {
      if (!Array.isArray(events) || events.length === 0) {
        return NextResponse.json(
          { error: 'Events must be a non-empty array' },
          { status: 400 }
        );
      }
      
      updates.push(`events = $${paramIndex}`);
      values.push(JSON.stringify(events));
      paramIndex++;
    }

    if (active !== undefined) {
      updates.push(`active = $${paramIndex}`);
      values.push(active);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Agregar updated_at
    updates.push(`updated_at = NOW()`);
    
    // Agregar condiciones WHERE
    values.push(webhookId, session.user.id);
    const whereClause = `WHERE id = $${paramIndex} AND provider_user_id = $${paramIndex + 1}`;

    // Ejecutar actualización
    const query = `
      UPDATE provider_webhooks 
      SET ${updates.join(', ')} 
      ${whereClause}
      RETURNING *
    `;

    const result = await postgresqlClient.query(query, values);

    if (!result.data?.[0]) {
      return NextResponse.json(
        { error: 'Failed to update webhook' },
        { status: 500 }
      );
    }

    const updatedWebhook = {
      ...result.data[0],
      events: JSON.parse(result.data[0].events)
    };

    console.log(`✅ [WEBHOOK] Webhook updated: ${webhookId} by user ${session.user.id}`);

    return NextResponse.json({
      success: true,
      data: updatedWebhook,
      message: 'Webhook updated successfully'
    });

  } catch (error) {
    console.error('❌ [WEBHOOK_UPDATE] Error updating webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}