// Middleware de autenticación y rate limiting para APIs
// /middleware/api-auth.ts

import { NextRequest, NextResponse } from 'next/server';
import { apiKeyManager } from '@/lib/api-key-manager';
import { rateLimiter } from '@/lib/rate-limiter';

export interface ApiAuthContext {
  apiKey?: any;
  userId?: string;
  scopes?: string[];
  rateLimitRemaining?: number;
}

export interface ApiAuthOptions {
  requireApiKey?: boolean;
  requiredScopes?: string[];
  rateLimit?: {
    limit: number;
    windowSeconds: number;
  };
  skipPaths?: string[];
}

/**
 * Middleware de autenticación y rate limiting para APIs públicas
 */
export function createApiAuthMiddleware(options: ApiAuthOptions = {}) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    try {
      const pathname = request.nextUrl.pathname;

      // Verificar si se debe saltar este path
      if (options.skipPaths?.some(path => pathname.startsWith(path))) {
        return null;
      }

      // Solo aplicar a rutas de API v1
      if (!pathname.startsWith('/api/v1/')) {
        return null;
      }

      let apiKey = null;
      let userId = null;
      let scopes: string[] = [];

      // Extraer API key del header Authorization
      const authHeader = request.headers.get('authorization');
      const apiKeyHeader = request.headers.get('x-api-key');
      
      let rawApiKey: string | null = null;

      if (authHeader?.startsWith('Bearer ')) {
        rawApiKey = authHeader.substring(7);
      } else if (apiKeyHeader) {
        rawApiKey = apiKeyHeader;
      }

      // Validar API key si se requiere o se proporciona
      if (rawApiKey) {
        const validation = await apiKeyManager.validateApiKey(rawApiKey);
        
        if (!validation.valid) {
          return NextResponse.json(
            { 
              error: 'Invalid API key',
              message: validation.error || 'API key validation failed'
            },
            { status: 401 }
          );
        }

        apiKey = validation.apiKey;
        userId = apiKey?.user_id;
        scopes = apiKey?.scopes || [];

        // Verificar scopes requeridos
        if (options.requiredScopes?.length) {
          const hasRequiredScopes = options.requiredScopes.every(
            scope => scopes.includes(scope) || scopes.includes('*')
          );

          if (!hasRequiredScopes) {
            return NextResponse.json(
              {
                error: 'Insufficient scope',
                message: `Required scopes: ${options.requiredScopes.join(', ')}`,
                provided: scopes
              },
              { status: 403 }
            );
          }
        }
      } else if (options.requireApiKey) {
        return NextResponse.json(
          {
            error: 'API key required',
            message: 'Please provide an API key in the Authorization header or X-API-Key header'
          },
          { status: 401 }
        );
      }

      // Aplicar rate limiting
      let rateLimitRemaining = null;
      
      if (options.rateLimit || apiKey) {
        const limit = apiKey?.rate_limit || options.rateLimit?.limit || 1000;
        const windowSeconds = options.rateLimit?.windowSeconds || 3600;
        
        // Generar clave de rate limit
        const rateLimitKey = apiKey 
          ? `api_key:${apiKey.id}`
          : `ip:${getClientIP(request)}:${pathname}`;

        const rateLimitResult = await rateLimiter.checkRateLimit(
          rateLimitKey,
          limit,
          windowSeconds
        );

        if (!rateLimitResult.allowed) {
          return NextResponse.json(
            {
              error: 'Rate limit exceeded',
              message: 'Too many requests. Please try again later.',
              retryAfter: rateLimitResult.retryAfter
            },
            {
              status: 429,
              headers: {
                'X-RateLimit-Limit': String(limit),
                'X-RateLimit-Remaining': String(rateLimitResult.remaining),
                'X-RateLimit-Reset': String(rateLimitResult.resetTime),
                'Retry-After': String(rateLimitResult.retryAfter || windowSeconds)
              }
            }
          );
        }

        rateLimitRemaining = rateLimitResult.remaining;

        // Registrar el uso si hay API key
        if (apiKey) {
          const startTime = Date.now();
          
          // Usar un header especial para registrar el tiempo después
          const responseTimeHeader = 'x-api-response-time';
          request.headers.set('x-api-start-time', String(startTime));
        }
      }

      // Agregar contexto al request para uso posterior
      const apiContext: ApiAuthContext = {
        apiKey,
        userId,
        scopes,
        rateLimitRemaining
      };

      // Agregar headers de respuesta
      const response = NextResponse.next();
      
      if (apiKey) {
        response.headers.set('X-API-Key-ID', apiKey.id);
        response.headers.set('X-User-ID', userId || '');
      }

      if (rateLimitRemaining !== null) {
        response.headers.set('X-RateLimit-Remaining', String(rateLimitRemaining));
      }

      // Agregar contexto a las headers para que esté disponible en la API
      response.headers.set('X-API-Context', JSON.stringify(apiContext));

      return response;

    } catch (error) {
      console.error('❌ [API_AUTH] Error en middleware:', error);
      
      return NextResponse.json(
        {
          error: 'Internal server error',
          message: 'Authentication middleware error'
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Obtiene la IP del cliente
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cloudflareIP = request.headers.get('cf-connecting-ip');
  
  if (cloudflareIP) return cloudflareIP;
  if (realIP) return realIP;
  if (forwarded) return forwarded.split(',')[0].trim();
  
  return 'unknown';
}

/**
 * Helper para extraer el contexto de API en las rutas
 */
export function getApiContext(request: NextRequest): ApiAuthContext {
  try {
    const contextHeader = request.headers.get('X-API-Context');
    if (contextHeader) {
      return JSON.parse(contextHeader);
    }
  } catch (error) {
    console.error('❌ [API_AUTH] Error parsing API context:', error);
  }
  
  return {};
}

/**
 * Middleware para registrar el uso de API key después de la respuesta
 */
export async function logApiKeyUsage(
  request: NextRequest, 
  response: NextResponse, 
  apiKeyId: string
): Promise<void> {
  try {
    const startTime = request.headers.get('x-api-start-time');
    if (!startTime) return;

    const responseTime = Date.now() - parseInt(startTime);
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';
    const endpoint = request.nextUrl.pathname;
    const method = request.method;

    await apiKeyManager.logApiKeyUsage(
      apiKeyId,
      endpoint,
      method,
      clientIP,
      response.status,
      responseTime,
      {
        userAgent,
        requestSize: parseInt(request.headers.get('content-length') || '0'),
        responseSize: parseInt(response.headers.get('content-length') || '0')
      }
    );

  } catch (error) {
    console.error('❌ [API_AUTH] Error logging API usage:', error);
  }
}

// Middlewares predefinidos para diferentes casos de uso

/**
 * Middleware para APIs públicas con rate limiting básico
 */
export const publicApiAuth = createApiAuthMiddleware({
  requireApiKey: false,
  rateLimit: {
    limit: 100,
    windowSeconds: 3600
  }
});

/**
 * Middleware para APIs que requieren autenticación
 */
export const authenticatedApiAuth = createApiAuthMiddleware({
  requireApiKey: true,
  rateLimit: {
    limit: 1000,
    windowSeconds: 3600
  }
});

/**
 * Middleware para APIs de solo lectura
 */
export const readOnlyApiAuth = createApiAuthMiddleware({
  requireApiKey: true,
  requiredScopes: ['documents:read'],
  rateLimit: {
    limit: 2000,
    windowSeconds: 3600
  }
});

/**
 * Middleware para APIs de escritura
 */
export const writeApiAuth = createApiAuthMiddleware({
  requireApiKey: true,
  requiredScopes: ['documents:write'],
  rateLimit: {
    limit: 500,
    windowSeconds: 3600
  }
});

/**
 * Middleware para APIs administrativas
 */
export const adminApiAuth = createApiAuthMiddleware({
  requireApiKey: true,
  requiredScopes: ['admin:*'],
  rateLimit: {
    limit: 200,
    windowSeconds: 3600
  }
});