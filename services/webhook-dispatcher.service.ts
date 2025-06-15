// Servicio de dispatching de webhooks
// /services/webhook-dispatcher.service.ts

import crypto from 'crypto';
import { postgresqlClient } from '@/lib/postgresql-client';

export interface WebhookEvent {
  event: string;
  data: any;
  timestamp: string;
  source: string;
  eventId: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event: string;
  payload: any;
  response_status?: number;
  response_body?: string;
  response_time_ms?: number;
  error?: string;
  attempts: number;
  max_attempts: number;
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  created_at: string;
  next_retry_at?: string;
  delivered_at?: string;
}

export interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  secret_key: string;
  active: boolean;
  provider_user_id: string;
  timeout_seconds: number;
  max_retries: number;
}

class WebhookDispatcherService {
  private readonly DEFAULT_TIMEOUT = 30000; // 30 segundos
  private readonly DEFAULT_MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [1000, 5000, 30000]; // 1s, 5s, 30s

  /**
   * Dispara un evento a todos los webhooks suscritos
   */
  async dispatchEvent(event: WebhookEvent): Promise<void> {
    try {
      console.log(`🔔 [WEBHOOK] Dispatching event: ${event.event}`);

      // Obtener webhooks suscritos a este evento
      const webhooks = await this.getSubscribedWebhooks(event.event);
      
      if (webhooks.length === 0) {
        console.log(`ℹ️  [WEBHOOK] No webhooks found for event: ${event.event}`);
        return;
      }

      console.log(`📡 [WEBHOOK] Found ${webhooks.length} webhooks for event: ${event.event}`);

      // Crear deliveries para cada webhook
      const deliveries = await Promise.all(
        webhooks.map(webhook => this.createDelivery(webhook, event))
      );

      // Procesar deliveries de forma asíncrona
      deliveries.forEach(delivery => {
        this.processDelivery(delivery).catch(error => {
          console.error(`❌ [WEBHOOK] Error processing delivery ${delivery.id}:`, error);
        });
      });

    } catch (error) {
      console.error('❌ [WEBHOOK] Error dispatching event:', error);
    }
  }

  /**
   * Obtiene webhooks suscritos a un evento específico
   */
  private async getSubscribedWebhooks(eventName: string): Promise<WebhookConfig[]> {
    try {
      const result = await postgresqlClient.query(`
        SELECT 
          id, url, events, secret_key, active, provider_user_id,
          timeout_seconds, max_retries
        FROM provider_webhooks 
        WHERE active = true 
        AND events @> $1::jsonb
      `, [JSON.stringify([eventName])]);

      return result.data?.map(row => ({
        ...row,
        events: Array.isArray(row.events) ? row.events : JSON.parse(row.events),
        timeout_seconds: row.timeout_seconds || this.DEFAULT_TIMEOUT / 1000,
        max_retries: row.max_retries || this.DEFAULT_MAX_RETRIES
      })) || [];

    } catch (error) {
      console.error('❌ [WEBHOOK] Error getting subscribed webhooks:', error);
      return [];
    }
  }

  /**
   * Crea un delivery para un webhook
   */
  private async createDelivery(webhook: WebhookConfig, event: WebhookEvent): Promise<WebhookDelivery> {
    const deliveryId = crypto.randomUUID();
    
    const delivery: WebhookDelivery = {
      id: deliveryId,
      webhook_id: webhook.id,
      event: event.event,
      payload: {
        id: event.eventId,
        event: event.event,
        created: event.timestamp,
        data: event.data,
        source: event.source
      },
      attempts: 0,
      max_attempts: webhook.max_retries,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    // Guardar delivery en base de datos
    try {
      await postgresqlClient.query(`
        INSERT INTO webhook_deliveries 
        (id, webhook_id, event, payload, attempts, max_attempts, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        delivery.id,
        delivery.webhook_id,
        delivery.event,
        JSON.stringify(delivery.payload),
        delivery.attempts,
        delivery.max_attempts,
        delivery.status,
        delivery.created_at
      ]);

    } catch (error) {
      console.error('❌ [WEBHOOK] Error creating delivery:', error);
    }

    return delivery;
  }

  /**
   * Procesa un delivery de webhook
   */
  private async processDelivery(delivery: WebhookDelivery): Promise<void> {
    try {
      // Obtener configuración del webhook
      const webhook = await this.getWebhookConfig(delivery.webhook_id);
      if (!webhook) {
        await this.markDeliveryFailed(delivery.id, 'Webhook configuration not found');
        return;
      }

      // Intentar entrega
      await this.attemptDelivery(delivery, webhook);

    } catch (error) {
      console.error(`❌ [WEBHOOK] Error processing delivery ${delivery.id}:`, error);
      await this.markDeliveryFailed(delivery.id, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Intenta la entrega de un webhook
   */
  private async attemptDelivery(delivery: WebhookDelivery, webhook: WebhookConfig): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Incrementar contador de intentos
      delivery.attempts++;
      await this.updateDeliveryAttempt(delivery.id, delivery.attempts);

      console.log(`📤 [WEBHOOK] Attempting delivery ${delivery.id} (attempt ${delivery.attempts}/${delivery.max_attempts})`);

      // Generar firma
      const signature = this.generateSignature(delivery.payload, webhook.secret_key);
      
      // Preparar headers
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'GestAgent-Webhooks/1.0',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': delivery.event,
        'X-Webhook-Delivery': delivery.id,
        'X-Webhook-Timestamp': delivery.created_at
      };

      // Realizar petición HTTP
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(delivery.payload),
        signal: AbortSignal.timeout(webhook.timeout_seconds * 1000)
      });

      const responseTime = Date.now() - startTime;
      const responseBody = await response.text();

      if (response.ok) {
        // Entrega exitosa
        await this.markDeliveryDelivered(delivery.id, response.status, responseBody, responseTime);
        console.log(`✅ [WEBHOOK] Delivery ${delivery.id} successful (${response.status})`);
        
        // Actualizar estadísticas del webhook
        await this.updateWebhookStats(webhook.id, true);
        
      } else {
        // Error en la respuesta
        const error = `HTTP ${response.status}: ${responseBody}`;
        
        if (delivery.attempts >= delivery.max_attempts) {
          await this.markDeliveryFailed(delivery.id, error, response.status, responseBody, responseTime);
          console.log(`❌ [WEBHOOK] Delivery ${delivery.id} failed permanently: ${error}`);
        } else {
          await this.scheduleRetry(delivery.id, error, response.status, responseBody, responseTime);
          console.log(`⏰ [WEBHOOK] Delivery ${delivery.id} scheduled for retry: ${error}`);
        }
        
        await this.updateWebhookStats(webhook.id, false);
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      
      if (delivery.attempts >= delivery.max_attempts) {
        await this.markDeliveryFailed(delivery.id, errorMessage, undefined, undefined, responseTime);
        console.log(`❌ [WEBHOOK] Delivery ${delivery.id} failed permanently: ${errorMessage}`);
      } else {
        await this.scheduleRetry(delivery.id, errorMessage, undefined, undefined, responseTime);
        console.log(`⏰ [WEBHOOK] Delivery ${delivery.id} scheduled for retry: ${errorMessage}`);
      }
      
      await this.updateWebhookStats(webhook.id, false);
    }
  }

  /**
   * Genera firma para validación de webhook
   */
  private generateSignature(payload: any, secret: string): string {
    const payloadString = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
    
    return `sha256=${signature}`;
  }

  /**
   * Obtiene configuración de un webhook
   */
  private async getWebhookConfig(webhookId: string): Promise<WebhookConfig | null> {
    try {
      const result = await postgresqlClient.query(`
        SELECT * FROM provider_webhooks WHERE id = $1 AND active = true
      `, [webhookId]);

      if (!result.data?.[0]) return null;

      const row = result.data[0];
      return {
        ...row,
        events: Array.isArray(row.events) ? row.events : JSON.parse(row.events),
        timeout_seconds: row.timeout_seconds || this.DEFAULT_TIMEOUT / 1000,
        max_retries: row.max_retries || this.DEFAULT_MAX_RETRIES
      };

    } catch (error) {
      console.error('❌ [WEBHOOK] Error getting webhook config:', error);
      return null;
    }
  }

  /**
   * Actualiza el intento de delivery
   */
  private async updateDeliveryAttempt(deliveryId: string, attempts: number): Promise<void> {
    try {
      await postgresqlClient.query(`
        UPDATE webhook_deliveries 
        SET attempts = $1, status = 'retrying'
        WHERE id = $2
      `, [attempts, deliveryId]);

    } catch (error) {
      console.error('❌ [WEBHOOK] Error updating delivery attempt:', error);
    }
  }

  /**
   * Marca un delivery como entregado
   */
  private async markDeliveryDelivered(
    deliveryId: string, 
    responseStatus: number, 
    responseBody: string, 
    responseTime: number
  ): Promise<void> {
    try {
      await postgresqlClient.query(`
        UPDATE webhook_deliveries 
        SET 
          status = 'delivered',
          response_status = $1,
          response_body = $2,
          response_time_ms = $3,
          delivered_at = NOW()
        WHERE id = $4
      `, [responseStatus, responseBody, responseTime, deliveryId]);

    } catch (error) {
      console.error('❌ [WEBHOOK] Error marking delivery as delivered:', error);
    }
  }

  /**
   * Marca un delivery como fallido
   */
  private async markDeliveryFailed(
    deliveryId: string, 
    error: string,
    responseStatus?: number,
    responseBody?: string,
    responseTime?: number
  ): Promise<void> {
    try {
      await postgresqlClient.query(`
        UPDATE webhook_deliveries 
        SET 
          status = 'failed',
          error = $1,
          response_status = $2,
          response_body = $3,
          response_time_ms = $4
        WHERE id = $5
      `, [error, responseStatus, responseBody, responseTime, deliveryId]);

    } catch (error) {
      console.error('❌ [WEBHOOK] Error marking delivery as failed:', error);
    }
  }

  /**
   * Programa un retry para un delivery
   */
  private async scheduleRetry(
    deliveryId: string, 
    error: string,
    responseStatus?: number,
    responseBody?: string,
    responseTime?: number
  ): Promise<void> {
    try {
      // Obtener información del delivery
      const result = await postgresqlClient.query(`
        SELECT attempts FROM webhook_deliveries WHERE id = $1
      `, [deliveryId]);

      const attempts = result.data?.[0]?.attempts || 1;
      const delayMs = this.RETRY_DELAYS[Math.min(attempts - 1, this.RETRY_DELAYS.length - 1)];
      const nextRetryAt = new Date(Date.now() + delayMs).toISOString();

      await postgresqlClient.query(`
        UPDATE webhook_deliveries 
        SET 
          status = 'pending',
          error = $1,
          response_status = $2,
          response_body = $3,
          response_time_ms = $4,
          next_retry_at = $5
        WHERE id = $6
      `, [error, responseStatus, responseBody, responseTime, nextRetryAt, deliveryId]);

      // Programar el retry
      setTimeout(() => {
        this.processRetry(deliveryId).catch(console.error);
      }, delayMs);

    } catch (error) {
      console.error('❌ [WEBHOOK] Error scheduling retry:', error);
    }
  }

  /**
   * Procesa un retry
   */
  private async processRetry(deliveryId: string): Promise<void> {
    try {
      const result = await postgresqlClient.query(`
        SELECT * FROM webhook_deliveries WHERE id = $1 AND status = 'pending'
      `, [deliveryId]);

      if (!result.data?.[0]) return;

      const delivery = result.data[0];
      delivery.payload = JSON.parse(delivery.payload);
      
      await this.processDelivery(delivery);

    } catch (error) {
      console.error(`❌ [WEBHOOK] Error processing retry for ${deliveryId}:`, error);
    }
  }

  /**
   * Actualiza estadísticas del webhook
   */
  private async updateWebhookStats(webhookId: string, success: boolean): Promise<void> {
    try {
      if (success) {
        await postgresqlClient.query(`
          UPDATE provider_webhooks 
          SET 
            total_calls = total_calls + 1,
            last_triggered_at = NOW()
          WHERE id = $1
        `, [webhookId]);
      } else {
        await postgresqlClient.query(`
          UPDATE provider_webhooks 
          SET 
            total_calls = total_calls + 1,
            failed_calls = failed_calls + 1,
            last_triggered_at = NOW()
          WHERE id = $1
        `, [webhookId]);
      }

    } catch (error) {
      console.error('❌ [WEBHOOK] Error updating webhook stats:', error);
    }
  }

  /**
   * Inicializa las tablas necesarias
   */
  async initializeTables(): Promise<void> {
    try {
      console.log('🏗️ [WEBHOOK] Inicializando tablas de webhooks...');

      // Tabla de configuración de webhooks
      await postgresqlClient.query(`
        CREATE TABLE IF NOT EXISTS provider_webhooks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          provider_user_id UUID NOT NULL,
          url VARCHAR(2048) NOT NULL,
          events JSONB NOT NULL,
          secret_key VARCHAR(255) NOT NULL,
          active BOOLEAN DEFAULT true,
          timeout_seconds INTEGER DEFAULT 30,
          max_retries INTEGER DEFAULT 3,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          last_triggered_at TIMESTAMP WITH TIME ZONE,
          total_calls INTEGER DEFAULT 0,
          failed_calls INTEGER DEFAULT 0
        )
      `);

      // Tabla de deliveries de webhooks
      await postgresqlClient.query(`
        CREATE TABLE IF NOT EXISTS webhook_deliveries (
          id UUID PRIMARY KEY,
          webhook_id UUID REFERENCES provider_webhooks(id) ON DELETE CASCADE,
          event VARCHAR(100) NOT NULL,
          payload JSONB NOT NULL,
          response_status INTEGER,
          response_body TEXT,
          response_time_ms INTEGER,
          error TEXT,
          attempts INTEGER DEFAULT 0,
          max_attempts INTEGER DEFAULT 3,
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          next_retry_at TIMESTAMP WITH TIME ZONE,
          delivered_at TIMESTAMP WITH TIME ZONE
        )
      `);

      // Índices para optimización
      await postgresqlClient.query(`
        CREATE INDEX IF NOT EXISTS idx_provider_webhooks_user_id ON provider_webhooks(provider_user_id);
        CREATE INDEX IF NOT EXISTS idx_provider_webhooks_active ON provider_webhooks(active);
        CREATE INDEX IF NOT EXISTS idx_provider_webhooks_events ON provider_webhooks USING GIN(events);
        CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
        CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
        CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_next_retry ON webhook_deliveries(next_retry_at);
      `);

      console.log('✅ [WEBHOOK] Tablas de webhooks inicializadas');

    } catch (error) {
      console.error('❌ [WEBHOOK] Error inicializando tablas:', error);
      throw error;
    }
  }

  /**
   * Limpia deliveries antiguos
   */
  async cleanupOldDeliveries(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();

      const result = await postgresqlClient.query(`
        DELETE FROM webhook_deliveries 
        WHERE created_at < $1 AND status IN ('delivered', 'failed')
      `, [cutoffDate]);

      const deletedCount = result.count || 0;
      console.log(`🧹 [WEBHOOK] Eliminados ${deletedCount} deliveries antiguos`);

      return deletedCount;

    } catch (error) {
      console.error('❌ [WEBHOOK] Error limpiando deliveries:', error);
      return 0;
    }
  }
}

// Helper functions para eventos comunes
export const webhookEvents = {
  DOCUMENT_UPLOADED: 'document.uploaded',
  DOCUMENT_PROCESSED: 'document.processed',
  DOCUMENT_ERROR: 'document.error',
  SUPPLIER_CREATED: 'supplier.created',
  CUSTOMER_CREATED: 'customer.created',
  USER_CREATED: 'user.created',
  INVOICE_GENERATED: 'invoice.generated'
};

// Instancia singleton
export const webhookDispatcher = new WebhookDispatcherService();

// Inicializar tablas al importar el módulo
webhookDispatcher.initializeTables().catch(console.error);