// Sistema de gestión de API Keys
// /lib/api-key-manager.ts

import crypto from 'crypto';
import { postgresqlClient } from '@/lib/postgresql-client';

export interface ApiKey {
  id: string;
  key_hash: string;
  key_prefix: string;
  name: string;
  description?: string;
  user_id: string;
  scopes: string[];
  status: 'active' | 'inactive' | 'revoked';
  rate_limit: number;
  last_used_at?: string;
  usage_count: number;
  created_at: string;
  expires_at?: string;
}

export interface ApiKeyUsage {
  id: string;
  api_key_id: string;
  endpoint: string;
  method: string;
  ip_address: string;
  user_agent?: string;
  response_status: number;
  response_time_ms: number;
  timestamp: string;
  request_size?: number;
  response_size?: number;
}

export interface CreateApiKeyOptions {
  name: string;
  description?: string;
  userId: string;
  scopes?: string[];
  rateLimit?: number;
  expiresInDays?: number;
}

export interface ApiKeyValidationResult {
  valid: boolean;
  apiKey?: ApiKey;
  error?: string;
  remainingRequests?: number;
}

class ApiKeyManager {
  private readonly API_KEY_PREFIX = 'gst_';
  private readonly DEFAULT_RATE_LIMIT = 1000; // requests per hour
  private readonly DEFAULT_SCOPES = ['documents:read', 'documents:write'];

  /**
   * Genera una nueva API key
   */
  generateApiKey(): { key: string; hash: string; prefix: string } {
    const randomBytes = crypto.randomBytes(32).toString('hex');
    const key = `${this.API_KEY_PREFIX}${randomBytes}`;
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    const prefix = key.substring(0, 12) + '...';
    
    return { key, hash, prefix };
  }

  /**
   * Crea una nueva API key
   */
  async createApiKey(options: CreateApiKeyOptions): Promise<{ apiKey: ApiKey; rawKey: string }> {
    try {
      const { key, hash, prefix } = this.generateApiKey();
      const id = crypto.randomUUID();
      
      const expiresAt = options.expiresInDays 
        ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const apiKeyData: Omit<ApiKey, 'id'> = {
        key_hash: hash,
        key_prefix: prefix,
        name: options.name,
        description: options.description,
        user_id: options.userId,
        scopes: options.scopes || this.DEFAULT_SCOPES,
        status: 'active',
        rate_limit: options.rateLimit || this.DEFAULT_RATE_LIMIT,
        usage_count: 0,
        created_at: new Date().toISOString(),
        expires_at: expiresAt
      };

      const result = await postgresqlClient.query(`
        INSERT INTO api_keys 
        (id, key_hash, key_prefix, name, description, user_id, scopes, status, rate_limit, usage_count, created_at, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        id, hash, prefix, options.name, options.description, options.userId,
        JSON.stringify(apiKeyData.scopes), apiKeyData.status, apiKeyData.rate_limit,
        apiKeyData.usage_count, apiKeyData.created_at, expiresAt
      ]);

      if (!result.data?.[0]) {
        throw new Error('Failed to create API key');
      }

      const createdApiKey = {
        ...result.data[0],
        scopes: JSON.parse(result.data[0].scopes)
      } as ApiKey;

      console.log(`✅ [API_KEYS] Nueva API key creada: ${prefix} para usuario ${options.userId}`);

      return {
        apiKey: createdApiKey,
        rawKey: key
      };

    } catch (error) {
      console.error('❌ [API_KEYS] Error creando API key:', error);
      throw error;
    }
  }

  /**
   * Valida una API key
   */
  async validateApiKey(key: string): Promise<ApiKeyValidationResult> {
    try {
      if (!key.startsWith(this.API_KEY_PREFIX)) {
        return { valid: false, error: 'Invalid API key format' };
      }

      const hash = crypto.createHash('sha256').update(key).digest('hex');

      const result = await postgresqlClient.query(`
        SELECT * FROM api_keys 
        WHERE key_hash = $1 AND status = 'active'
      `, [hash]);

      if (!result.data?.[0]) {
        return { valid: false, error: 'API key not found or inactive' };
      }

      const apiKey = {
        ...result.data[0],
        scopes: JSON.parse(result.data[0].scopes)
      } as ApiKey;

      // Verificar expiración
      if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
        await this.revokeApiKey(apiKey.id);
        return { valid: false, error: 'API key expired' };
      }

      // Verificar rate limit
      const remainingRequests = await this.checkRateLimit(apiKey.id, apiKey.rate_limit);
      if (remainingRequests <= 0) {
        return { 
          valid: false, 
          error: 'Rate limit exceeded',
          remainingRequests: 0
        };
      }

      return {
        valid: true,
        apiKey,
        remainingRequests
      };

    } catch (error) {
      console.error('❌ [API_KEYS] Error validando API key:', error);
      return { valid: false, error: 'Validation error' };
    }
  }

  /**
   * Verifica el rate limit de una API key
   */
  async checkRateLimit(apiKeyId: string, rateLimit: number): Promise<number> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const result = await postgresqlClient.query(`
        SELECT COUNT(*) as usage_count 
        FROM api_key_usage 
        WHERE api_key_id = $1 AND timestamp > $2
      `, [apiKeyId, oneHourAgo]);

      const currentUsage = parseInt(result.data?.[0]?.usage_count || '0');
      return Math.max(0, rateLimit - currentUsage);

    } catch (error) {
      console.error('❌ [API_KEYS] Error verificando rate limit:', error);
      return 0;
    }
  }

  /**
   * Registra el uso de una API key
   */
  async logApiKeyUsage(
    apiKeyId: string,
    endpoint: string,
    method: string,
    ipAddress: string,
    responseStatus: number,
    responseTimeMs: number,
    options?: {
      userAgent?: string;
      requestSize?: number;
      responseSize?: number;
    }
  ): Promise<void> {
    try {
      const usageId = crypto.randomUUID();

      await postgresqlClient.query(`
        INSERT INTO api_key_usage 
        (id, api_key_id, endpoint, method, ip_address, user_agent, response_status, response_time_ms, timestamp, request_size, response_size)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10)
      `, [
        usageId, apiKeyId, endpoint, method, ipAddress, 
        options?.userAgent, responseStatus, responseTimeMs,
        options?.requestSize, options?.responseSize
      ]);

      // Actualizar contador de uso y última utilización
      await postgresqlClient.query(`
        UPDATE api_keys 
        SET usage_count = usage_count + 1, last_used_at = NOW()
        WHERE id = $1
      `, [apiKeyId]);

    } catch (error) {
      console.error('❌ [API_KEYS] Error registrando uso:', error);
      // No lanzar error para no interrumpir el flujo de la API
    }
  }

  /**
   * Obtiene las API keys de un usuario
   */
  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    try {
      const result = await postgresqlClient.query(`
        SELECT * FROM api_keys 
        WHERE user_id = $1 
        ORDER BY created_at DESC
      `, [userId]);

      if (!result.data) return [];

      return result.data.map(row => ({
        ...row,
        scopes: JSON.parse(row.scopes)
      })) as ApiKey[];

    } catch (error) {
      console.error('❌ [API_KEYS] Error obteniendo API keys:', error);
      return [];
    }
  }

  /**
   * Revoca una API key
   */
  async revokeApiKey(apiKeyId: string): Promise<boolean> {
    try {
      const result = await postgresqlClient.query(`
        UPDATE api_keys 
        SET status = 'revoked' 
        WHERE id = $1
        RETURNING *
      `, [apiKeyId]);

      const success = result.data && result.data.length > 0;
      
      if (success) {
        console.log(`✅ [API_KEYS] API key revocada: ${apiKeyId}`);
      }

      return success;

    } catch (error) {
      console.error('❌ [API_KEYS] Error revocando API key:', error);
      return false;
    }
  }

  /**
   * Actualiza los scopes de una API key
   */
  async updateApiKeyScopes(apiKeyId: string, scopes: string[]): Promise<boolean> {
    try {
      const result = await postgresqlClient.query(`
        UPDATE api_keys 
        SET scopes = $1 
        WHERE id = $2
        RETURNING *
      `, [JSON.stringify(scopes), apiKeyId]);

      const success = result.data && result.data.length > 0;
      
      if (success) {
        console.log(`✅ [API_KEYS] Scopes actualizados para API key: ${apiKeyId}`);
      }

      return success;

    } catch (error) {
      console.error('❌ [API_KEYS] Error actualizando scopes:', error);
      return false;
    }
  }

  /**
   * Obtiene estadísticas de uso de API keys
   */
  async getApiKeyStats(apiKeyId?: string, userId?: string): Promise<any> {
    try {
      let whereClause = '1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (apiKeyId) {
        whereClause += ` AND ak.id = $${paramIndex}`;
        params.push(apiKeyId);
        paramIndex++;
      }

      if (userId) {
        whereClause += ` AND ak.user_id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
      }

      const result = await postgresqlClient.query(`
        SELECT 
          ak.id,
          ak.name,
          ak.key_prefix,
          ak.usage_count,
          ak.rate_limit,
          ak.last_used_at,
          ak.created_at,
          COUNT(aku.id) as usage_last_hour,
          AVG(aku.response_time_ms) as avg_response_time,
          COUNT(CASE WHEN aku.response_status >= 400 THEN 1 END) as error_count
        FROM api_keys ak
        LEFT JOIN api_key_usage aku ON ak.id = aku.api_key_id 
          AND aku.timestamp > NOW() - INTERVAL '1 hour'
        WHERE ${whereClause}
        GROUP BY ak.id, ak.name, ak.key_prefix, ak.usage_count, ak.rate_limit, ak.last_used_at, ak.created_at
        ORDER BY ak.created_at DESC
      `, params);

      return result.data || [];

    } catch (error) {
      console.error('❌ [API_KEYS] Error obteniendo estadísticas:', error);
      return [];
    }
  }

  /**
   * Limpia logs de uso antiguos
   */
  async cleanupOldUsageLogs(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();

      const result = await postgresqlClient.query(`
        DELETE FROM api_key_usage 
        WHERE timestamp < $1
      `, [cutoffDate]);

      const deletedCount = result.count || 0;
      console.log(`🧹 [API_KEYS] Eliminados ${deletedCount} logs de uso antiguos`);

      return deletedCount;

    } catch (error) {
      console.error('❌ [API_KEYS] Error limpiando logs:', error);
      return 0;
    }
  }

  /**
   * Inicializa las tablas de API keys
   */
  async initializeTables(): Promise<void> {
    try {
      console.log('🏗️ [API_KEYS] Inicializando tablas de API keys...');

      // Tabla de API keys
      await postgresqlClient.query(`
        CREATE TABLE IF NOT EXISTS api_keys (
          id UUID PRIMARY KEY,
          key_hash VARCHAR(64) UNIQUE NOT NULL,
          key_prefix VARCHAR(20) NOT NULL,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          user_id VARCHAR(100) NOT NULL,
          scopes JSONB NOT NULL DEFAULT '[]',
          status VARCHAR(20) DEFAULT 'active',
          rate_limit INTEGER DEFAULT 1000,
          usage_count INTEGER DEFAULT 0,
          last_used_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          expires_at TIMESTAMP WITH TIME ZONE
        )
      `);

      // Tabla de uso de API keys
      await postgresqlClient.query(`
        CREATE TABLE IF NOT EXISTS api_key_usage (
          id UUID PRIMARY KEY,
          api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
          endpoint VARCHAR(200) NOT NULL,
          method VARCHAR(10) NOT NULL,
          ip_address INET NOT NULL,
          user_agent TEXT,
          response_status INTEGER NOT NULL,
          response_time_ms INTEGER NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          request_size INTEGER,
          response_size INTEGER
        )
      `);

      // Índices para optimización
      await postgresqlClient.query(`
        CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
        CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);
        CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
        CREATE INDEX IF NOT EXISTS idx_api_usage_key_id ON api_key_usage(api_key_id);
        CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON api_key_usage(timestamp);
        CREATE INDEX IF NOT EXISTS idx_api_usage_ip ON api_key_usage(ip_address);
      `);

      console.log('✅ [API_KEYS] Tablas de API keys inicializadas');

    } catch (error) {
      console.error('❌ [API_KEYS] Error inicializando tablas:', error);
      throw error;
    }
  }
}

// Instancia singleton
export const apiKeyManager = new ApiKeyManager();

// Inicializar tablas al importar el módulo
apiKeyManager.initializeTables().catch(console.error);