// API para gestión de API Keys de desarrolladores
// /app/api/developer/keys/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { apiKeyManager } from '@/lib/api-key-manager';
import { rateLimiter } from '@/lib/rate-limiter';

// GET: Obtener API keys del usuario
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Rate limiting
    const rateLimitResult = await rateLimiter.checkRateLimit(
      `api_keys:${session.user.id}`,
      50, // 50 requests por hora
      3600
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.resetTime)
          }
        }
      );
    }

    // Obtener API keys del usuario
    const apiKeys = await apiKeyManager.getUserApiKeys(session.user.id);

    // Obtener estadísticas para cada API key
    const keysWithStats = await Promise.all(
      apiKeys.map(async (key) => {
        const stats = await apiKeyManager.getApiKeyStats(key.id);
        return {
          ...key,
          stats: stats[0] || {}
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: keysWithStats,
      meta: {
        total: keysWithStats.length,
        active: keysWithStats.filter(k => k.status === 'active').length,
        rateLimitRemaining: rateLimitResult.remaining
      }
    });

  } catch (error) {
    console.error('❌ [API_KEYS] Error obteniendo API keys:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Crear nueva API key
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Rate limiting más estricto para creación
    const rateLimitResult = await rateLimiter.checkRateLimit(
      `create_api_key:${session.user.id}`,
      5, // Solo 5 creaciones por hora
      3600
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded for API key creation' },
        { status: 429 }
      );
    }

    // Parsear datos del request
    const body = await request.json();
    const { name, description, scopes, rateLimit, expiresInDays } = body;

    // Validaciones
    if (!name || name.trim().length < 3) {
      return NextResponse.json(
        { error: 'Name must be at least 3 characters long' },
        { status: 400 }
      );
    }

    if (scopes && !Array.isArray(scopes)) {
      return NextResponse.json(
        { error: 'Scopes must be an array' },
        { status: 400 }
      );
    }

    if (rateLimit && (rateLimit < 10 || rateLimit > 10000)) {
      return NextResponse.json(
        { error: 'Rate limit must be between 10 and 10000' },
        { status: 400 }
      );
    }

    // Verificar límite de API keys por usuario
    const existingKeys = await apiKeyManager.getUserApiKeys(session.user.id);
    const activeKeys = existingKeys.filter(k => k.status === 'active');
    
    if (activeKeys.length >= 10) {
      return NextResponse.json(
        { error: 'Maximum number of active API keys reached (10)' },
        { status: 400 }
      );
    }

    // Crear la API key
    const { apiKey, rawKey } = await apiKeyManager.createApiKey({
      name: name.trim(),
      description: description?.trim(),
      userId: session.user.id,
      scopes: scopes || ['documents:read', 'documents:write'],
      rateLimit: rateLimit || 1000,
      expiresInDays: expiresInDays || undefined
    });

    // Registrar el request
    await rateLimiter.logRequest(
      `create_api_key:${session.user.id}`,
      request
    );

    return NextResponse.json({
      success: true,
      data: {
        apiKey: {
          ...apiKey,
          key_hash: undefined // No devolver el hash
        },
        rawKey, // Solo se devuelve una vez
        warning: 'This is the only time you will see the complete API key. Please save it securely.'
      }
    }, { status: 201 });

  } catch (error) {
    console.error('❌ [API_KEYS] Error creando API key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: Actualizar API key
export async function PATCH(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { apiKeyId, scopes } = body;

    if (!apiKeyId) {
      return NextResponse.json(
        { error: 'API key ID is required' },
        { status: 400 }
      );
    }

    // Verificar que la API key pertenece al usuario
    const userApiKeys = await apiKeyManager.getUserApiKeys(session.user.id);
    const apiKey = userApiKeys.find(k => k.id === apiKeyId);

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    // Actualizar scopes si se proporcionan
    if (scopes) {
      if (!Array.isArray(scopes)) {
        return NextResponse.json(
          { error: 'Scopes must be an array' },
          { status: 400 }
        );
      }

      const success = await apiKeyManager.updateApiKeyScopes(apiKeyId, scopes);
      
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to update API key' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'API key updated successfully'
    });

  } catch (error) {
    console.error('❌ [API_KEYS] Error actualizando API key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Revocar API key
export async function DELETE(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const apiKeyId = searchParams.get('id');

    if (!apiKeyId) {
      return NextResponse.json(
        { error: 'API key ID is required' },
        { status: 400 }
      );
    }

    // Verificar que la API key pertenece al usuario
    const userApiKeys = await apiKeyManager.getUserApiKeys(session.user.id);
    const apiKey = userApiKeys.find(k => k.id === apiKeyId);

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    // Revocar la API key
    const success = await apiKeyManager.revokeApiKey(apiKeyId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to revoke API key' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'API key revoked successfully'
    });

  } catch (error) {
    console.error('❌ [API_KEYS] Error revocando API key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}