// API para estadísticas de desarrolladores
// /app/api/developer/stats/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { apiKeyManager } from '@/lib/api-key-manager';
import { rateLimiter } from '@/lib/rate-limiter';

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
      `dev_stats:${session.user.id}`,
      30, // 30 requests por hora
      3600
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Obtener estadísticas de API keys del usuario
    const apiKeyStats = await apiKeyManager.getApiKeyStats(undefined, session.user.id);
    
    // Calcular estadísticas agregadas
    const totalRequests = apiKeyStats.reduce((sum: number, key: any) => sum + (key.usage_count || 0), 0);
    const requestsToday = apiKeyStats.reduce((sum: number, key: any) => sum + (key.usage_last_hour || 0), 0);
    const avgResponseTime = apiKeyStats.length > 0 
      ? Math.round(apiKeyStats.reduce((sum: number, key: any) => sum + (key.avg_response_time || 0), 0) / apiKeyStats.length)
      : 0;
    const totalErrors = apiKeyStats.reduce((sum: number, key: any) => sum + (key.error_count || 0), 0);
    const errorRate = totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(2) : '0.00';

    // Estadísticas por endpoint (top 10)
    const endpointStats = await getEndpointStats(session.user.id);
    
    // Estadísticas por día (últimos 30 días)
    const dailyStats = await getDailyStats(session.user.id);

    // Distribución de códigos de respuesta
    const responseCodeStats = await getResponseCodeStats(session.user.id);

    const stats = {
      overview: {
        totalRequests,
        requestsToday,
        avgResponseTime,
        errorRate: parseFloat(errorRate),
        activeApiKeys: apiKeyStats.filter((key: any) => key.status === 'active').length,
        totalApiKeys: apiKeyStats.length
      },
      apiKeys: apiKeyStats.map((key: any) => ({
        id: key.id,
        name: key.name,
        key_prefix: key.key_prefix,
        usage_count: key.usage_count,
        usage_last_hour: key.usage_last_hour || 0,
        avg_response_time: key.avg_response_time || 0,
        error_count: key.error_count || 0,
        last_used_at: key.last_used_at
      })),
      endpoints: endpointStats,
      daily: dailyStats,
      responseCodes: responseCodeStats
    };

    return NextResponse.json({
      success: true,
      data: stats,
      meta: {
        generatedAt: new Date().toISOString(),
        rateLimitRemaining: rateLimitResult.remaining
      }
    });

  } catch (error) {
    console.error('❌ [DEV_STATS] Error obteniendo estadísticas:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Obtener estadísticas por endpoint
async function getEndpointStats(userId: string) {
  try {
    // Esta sería una query más compleja que requiere unir las tablas de api_keys y api_key_usage
    // Por ahora retornamos datos de ejemplo
    return [
      { endpoint: '/api/v1/documents', requests: 1250, avgResponseTime: 245 },
      { endpoint: '/api/v1/suppliers', requests: 890, avgResponseTime: 120 },
      { endpoint: '/api/v1/customers', requests: 567, avgResponseTime: 95 },
      { endpoint: '/api/v1/stats', requests: 234, avgResponseTime: 78 }
    ];
  } catch (error) {
    console.error('Error getting endpoint stats:', error);
    return [];
  }
}

// Obtener estadísticas diarias
async function getDailyStats(userId: string) {
  try {
    // Generar datos de ejemplo para los últimos 30 días
    const dailyData = [];
    const now = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      dailyData.push({
        date: date.toISOString().split('T')[0],
        requests: Math.floor(Math.random() * 200) + 50,
        errors: Math.floor(Math.random() * 10),
        avgResponseTime: Math.floor(Math.random() * 100) + 100
      });
    }
    
    return dailyData;
  } catch (error) {
    console.error('Error getting daily stats:', error);
    return [];
  }
}

// Obtener distribución de códigos de respuesta
async function getResponseCodeStats(userId: string) {
  try {
    return [
      { code: 200, count: 5432, percentage: 85.2 },
      { code: 400, count: 567, percentage: 8.9 },
      { code: 401, count: 234, percentage: 3.7 },
      { code: 403, count: 89, percentage: 1.4 },
      { code: 429, count: 34, percentage: 0.5 },
      { code: 500, count: 21, percentage: 0.3 }
    ];
  } catch (error) {
    console.error('Error getting response code stats:', error);
    return [];
  }
}