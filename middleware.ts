// middleware.ts - VERSIÓN SIMPLIFICADA
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Permitir acceso a todas las rutas en modo desarrollo
  return NextResponse.next();
}

// Configurar rutas que se evaluarán con el middleware
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)'
  ],
}; 