// Endpoint de test simple para verificar funcionamiento básico
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: "GestAgent - Test Simple",
    version: "5.0.0",
    status: "OK",
    timestamp: new Date().toISOString(),
    server: "NextJS",
    endpoint: "/api/simple-test"
  });
}

export async function POST() {
  console.log('📋 [SIMPLE-TEST] Test POST ejecutado');
  
  return NextResponse.json({
    message: "Test POST exitoso",
    version: "5.0.0",
    status: "OK",
    method: "POST",
    timestamp: new Date().toISOString()
  });
} 