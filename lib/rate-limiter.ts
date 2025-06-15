// Sistema de Rate Limiting
// /lib/rate-limiter.ts

import { NextRequest, NextResponse } from 'next/server';
import { postgresqlClient } from '@/lib/postgresql-client';

export interface RateLimitRule {
  id: string;
  name: string;
  path_pattern: string;
  method: string;
  limit: number;
  window_seconds: number;
  burst_limit?: number;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export interface RateLimitOptions {
  limit?: number;
  windowSeconds?: number;
  burstLimit?: number;
  keyGenerator?: (req: NextRequest) => string;
  skipIf?: (req: NextRequest) => boolean;
  onLimitReached?: (req: NextRequest, info: RateLimitResult) => void;
}

class RateLimiter {
  private readonly DEFAULT_LIMIT = 100;
  private readonly DEFAULT_WINDOW = 3600; // 1 hora
  private readonly DEFAULT_BURST_LIMIT = 10;

  /**
   * Middleware de rate limiting
   */
  createMiddleware(options: RateLimitOptions = {}) {
    return async (req: NextRequest): Promise<NextResponse | null> => {
      try {
        // Verificar si se debe saltar el rate limiting
        if (options.skipIf && options.skipIf(req)) {
          return null;
        }

        // Generar clave única para el rate limit
        const key = options.keyGenerator 
          ? options.keyGenerator(req)
          : this.generateDefaultKey(req);

        // Verificar rate limit
        const result = await this.checkRateLimit(
          key,
          options.limit || this.DEFAULT_LIMIT,
          options.windowSeconds || this.DEFAULT_WINDOW,
          options.burstLimit
        );

        // Si se excede el límite
        if (!result.allowed) {
          if (options.onLimitReached) {
            options.onLimitReached(req, result);
          }

          return new NextResponse(
            JSON.stringify({
              error: 'Rate limit exceeded',
              message: 'Too many requests. Please try again later.',
              retryAfter: result.retryAfter
            }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'X-RateLimit-Limit': String(options.limit || this.DEFAULT_LIMIT),
                'X-RateLimit-Remaining': String(result.remaining),
                'X-RateLimit-Reset': String(result.resetTime),
                'Retry-After': String(result.retryAfter || 3600)
              }
            }
          );
        }

        // Registrar el request
        await this.logRequest(key, req);

        return null; // Continuar con el request

      } catch (error) {
        console.error('❌ [RATE_LIMITER] Error en middleware:', error);
        // En caso de error, permitir el request para no bloquear la aplicación
        return null;
      }
    };
  }

  /**
   * Genera una clave por defecto basada en IP y ruta
   */
  private generateDefaultKey(req: NextRequest): string {
    const ip = this.getClientIP(req);
    const path = req.nextUrl.pathname;
    return `${ip}:${path}`;
  }

  /**
   * Obtiene la IP del cliente
   */
  private getClientIP(req: NextRequest): string {
    // Intentar obtener IP real a través de headers
    const forwarded = req.headers.get('x-forwarded-for');
    const realIP = req.headers.get('x-real-ip');
    const cloudflareIP = req.headers.get('cf-connecting-ip');
    
    if (cloudflareIP) return cloudflareIP;
    if (realIP) return realIP;
    if (forwarded) return forwarded.split(',')[0].trim();
    
    return 'unknown';
  }

  /**
   * Verifica si una clave excede el rate limit
   */
  async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
    burstLimit?: number
  ): Promise<RateLimitResult> {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - windowSeconds * 1000);

      // Obtener requests en la ventana actual
      const result = await postgresqlClient.query(`
        SELECT COUNT(*) as request_count,
               MAX(timestamp) as last_request
        FROM rate_limit_requests 
        WHERE key = $1 AND timestamp > $2
      `, [key, windowStart.toISOString()]);

      const currentCount = parseInt(result.data?.[0]?.request_count || '0');
      const lastRequest = result.data?.[0]?.last_request;

      // Verificar burst limit si está configurado
      if (burstLimit && lastRequest) {
        const timeSinceLastRequest = now.getTime() - new Date(lastRequest).getTime();
        if (timeSinceLastRequest < 1000 && currentCount >= burstLimit) {
          return {
            allowed: false,
            remaining: 0,
            resetTime: Math.floor((windowStart.getTime() + windowSeconds * 1000) / 1000),
            retryAfter: 1
          };
        }
      }

      const remaining = Math.max(0, limit - currentCount);
      const allowed = currentCount < limit;

      return {
        allowed,
        remaining,
        resetTime: Math.floor((windowStart.getTime() + windowSeconds * 1000) / 1000),
        retryAfter: allowed ? undefined : windowSeconds
      };

    } catch (error) {
      console.error('❌ [RATE_LIMITER] Error verificando rate limit:', error);
      // En caso de error, permitir el request
      return {
        allowed: true,
        remaining: limit,
        resetTime: Math.floor(Date.now() / 1000) + windowSeconds
      };
    }
  }

  /**
   * Registra un request para rate limiting
   */
  async logRequest(key: string, req: NextRequest): Promise<void> {
    try {
      const requestId = crypto.randomUUID();
      const ip = this.getClientIP(req);
      const userAgent = req.headers.get('user-agent') || '';
      const path = req.nextUrl.pathname;
      const method = req.method;

      await postgresqlClient.query(`
        INSERT INTO rate_limit_requests 
        (id, key, ip_address, path, method, user_agent, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [requestId, key, ip, path, method, userAgent]);

    } catch (error) {
      console.error('❌ [RATE_LIMITER] Error registrando request:', error);
      // No lanzar error para no interrumpir el flujo
    }
  }

  /**
   * Obtiene estadísticas de rate limiting
   */
  async getRateLimitStats(timeRange: 'hour' | 'day' | 'week' = 'hour'): Promise<any> {
    try {
      let interval = '1 hour';
      if (timeRange === 'day') interval = '1 day';
      if (timeRange === 'week') interval = '1 week';

      const result = await postgresqlClient.query(`
        SELECT 
          key,
          COUNT(*) as request_count,
          COUNT(DISTINCT ip_address) as unique_ips,
          AVG(EXTRACT(EPOCH FROM (timestamp - LAG(timestamp) OVER (PARTITION BY key ORDER BY timestamp)))) as avg_interval,
          MIN(timestamp) as first_request,
          MAX(timestamp) as last_request
        FROM rate_limit_requests 
        WHERE timestamp > NOW() - INTERVAL '${interval}'
        GROUP BY key
        ORDER BY request_count DESC
        LIMIT 50
      `);

      return result.data || [];

    } catch (error) {
      console.error('❌ [RATE_LIMITER] Error obteniendo estadísticas:', error);
      return [];
    }
  }

  /**
   * Crea una regla de rate limiting personalizada
   */
  async createRateLimitRule(rule: Omit<RateLimitRule, 'id' | 'created_at'>): Promise<string> {
    try {
      const id = crypto.randomUUID();

      await postgresqlClient.query(`
        INSERT INTO rate_limit_rules 
        (id, name, path_pattern, method, limit, window_seconds, burst_limit, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `, [
        id, rule.name, rule.path_pattern, rule.method,
        rule.limit, rule.window_seconds, rule.burst_limit, rule.status
      ]);

      console.log(`✅ [RATE_LIMITER] Regla creada: ${rule.name}`);
      return id;

    } catch (error) {
      console.error('❌ [RATE_LIMITER] Error creando regla:', error);
      throw error;
    }
  }

  /**
   * Obtiene reglas de rate limiting activas
   */
  async getActiveRules(): Promise<RateLimitRule[]> {
    try {
      const result = await postgresqlClient.query(`
        SELECT * FROM rate_limit_rules 
        WHERE status = 'active'
        ORDER BY created_at DESC
      `);

      return result.data || [];

    } catch (error) {
      console.error('❌ [RATE_LIMITER] Error obteniendo reglas:', error);
      return [];
    }
  }

  /**
   * Aplica reglas dinámicas de rate limiting
   */
  async applyDynamicRules(req: NextRequest): Promise<RateLimitResult | null> {
    try {
      const rules = await this.getActiveRules();
      const path = req.nextUrl.pathname;
      const method = req.method;

      // Buscar regla que coincida
      const matchingRule = rules.find(rule => {
        const pathMatches = this.matchPattern(path, rule.path_pattern);
        const methodMatches = rule.method === '*' || rule.method === method;
        return pathMatches && methodMatches;
      });

      if (!matchingRule) {
        return null; // No hay regla específica
      }

      // Aplicar la regla encontrada
      const key = `rule:${matchingRule.id}:${this.getClientIP(req)}`;
      return await this.checkRateLimit(
        key,
        matchingRule.limit,
        matchingRule.window_seconds,
        matchingRule.burst_limit
      );

    } catch (error) {
      console.error('❌ [RATE_LIMITER] Error aplicando reglas dinámicas:', error);
      return null;
    }
  }

  /**
   * Verifica si un path coincide con un patrón
   */
  private matchPattern(path: string, pattern: string): boolean {
    // Convertir patrón simple a regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
      .replace(/\//g, '\\/');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  /**
   * Limpia registros antiguos de rate limiting
   */
  async cleanupOldRecords(daysToKeep: number = 7): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();

      const result = await postgresqlClient.query(`
        DELETE FROM rate_limit_requests 
        WHERE timestamp < $1
      `, [cutoffDate]);

      const deletedCount = result.count || 0;
      console.log(`🧹 [RATE_LIMITER] Eliminados ${deletedCount} registros antiguos`);

      return deletedCount;

    } catch (error) {
      console.error('❌ [RATE_LIMITER] Error limpiando registros:', error);
      return 0;
    }
  }

  /**
   * Inicializa las tablas de rate limiting
   */
  async initializeTables(): Promise<void> {
    try {
      console.log('🏗️ [RATE_LIMITER] Inicializando tablas de rate limiting...');

      // Tabla de requests para rate limiting
      await postgresqlClient.query(`
        CREATE TABLE IF NOT EXISTS rate_limit_requests (
          id UUID PRIMARY KEY,
          key VARCHAR(200) NOT NULL,
          ip_address INET NOT NULL,
          path VARCHAR(500) NOT NULL,
          method VARCHAR(10) NOT NULL,
          user_agent TEXT,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Tabla de reglas de rate limiting
      await postgresqlClient.query(`
        CREATE TABLE IF NOT EXISTS rate_limit_rules (
          id UUID PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          path_pattern VARCHAR(200) NOT NULL,
          method VARCHAR(10) NOT NULL,
          limit INTEGER NOT NULL,
          window_seconds INTEGER NOT NULL,
          burst_limit INTEGER,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Índices para optimización
      await postgresqlClient.query(`
        CREATE INDEX IF NOT EXISTS idx_rate_limit_key_timestamp ON rate_limit_requests(key, timestamp);
        CREATE INDEX IF NOT EXISTS idx_rate_limit_ip ON rate_limit_requests(ip_address);
        CREATE INDEX IF NOT EXISTS idx_rate_limit_path ON rate_limit_requests(path);
        CREATE INDEX IF NOT EXISTS idx_rate_limit_rules_status ON rate_limit_rules(status);
      `);

      console.log('✅ [RATE_LIMITER] Tablas de rate limiting inicializadas');

    } catch (error) {
      console.error('❌ [RATE_LIMITER] Error inicializando tablas:', error);
      throw error;
    }
  }
}

// Instancia singleton
export const rateLimiter = new RateLimiter();

// Helper functions para usar en middleware
export const createRateLimit = (options?: RateLimitOptions) => 
  rateLimiter.createMiddleware(options);

// Rate limiters predefinidos
export const apiRateLimit = createRateLimit({
  limit: 1000,
  windowSeconds: 3600,
  burstLimit: 10,
  keyGenerator: (req) => `api:${req.headers.get('x-api-key') || 'anonymous'}:${req.nextUrl.pathname}`
});

export const publicRateLimit = createRateLimit({
  limit: 100,
  windowSeconds: 3600,
  burstLimit: 5,
  keyGenerator: (req) => {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
               req.headers.get('x-real-ip') || 
               'unknown';
    return `public:${ip}`;
  }
});

export const authRateLimit = createRateLimit({
  limit: 5,
  windowSeconds: 300, // 5 minutos
  burstLimit: 2,
  keyGenerator: (req) => {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
               req.headers.get('x-real-ip') || 
               'unknown';
    return `auth:${ip}`;
  }
});

// Inicializar tablas al importar el módulo
rateLimiter.initializeTables().catch(console.error);