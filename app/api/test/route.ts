// API de prueba simple
// /app/api/test/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🧪 [Test API] Solicitud recibida');
  
  return NextResponse.json({
    success: true,
    message: 'GestAgent API funcionando correctamente',
    timestamp: new Date().toISOString(),
    version: '3.1.0',
    status: 'operational'
  });
} 