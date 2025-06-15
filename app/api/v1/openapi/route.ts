// API para servir la especificación OpenAPI
// /app/api/v1/openapi/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    // Leer el archivo OpenAPI JSON
    const openapiPath = join(process.cwd(), 'app', 'api', 'v1', 'openapi.json');
    const openapiContent = await readFile(openapiPath, 'utf-8');
    const openapiSpec = JSON.parse(openapiContent);

    // Obtener el host actual para actualizar los servers
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    
    if (host) {
      // Actualizar la URL del servidor actual
      const currentServerUrl = `${protocol}://${host}/api/v1`;
      
      // Verificar si ya existe el servidor actual
      const existingServer = openapiSpec.servers?.find(
        (server: any) => server.url === currentServerUrl
      );
      
      if (!existingServer) {
        openapiSpec.servers = [
          {
            url: currentServerUrl,
            description: 'Current server'
          },
          ...(openapiSpec.servers || [])
        ];
      }
    }

    // Agregar información adicional dinámicamente
    const now = new Date().toISOString();
    openapiSpec.info.version = `${openapiSpec.info.version} (${now.split('T')[0]})`;
    
    // Headers para CORS y cache
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      'Cache-Control': 'public, max-age=3600' // Cache por 1 hora
    };

    return NextResponse.json(openapiSpec, { headers });

  } catch (error) {
    console.error('❌ [OPENAPI] Error serving OpenAPI spec:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Could not load OpenAPI specification'
      },
      { status: 500 }
    );
  }
}

// Manejar preflight CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    },
  });
}