// middleware.ts - VERSIÓN TEMPORAL SIN AUTENTICACIÓN
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // ⚠️ MODO TESTING: AUTENTICACIÓN DESACTIVADA TEMPORALMENTE
  console.log('[TESTING MODE] Auth disabled - Free access to all routes');
  
  // Redirigir root a dashboard para testing directo
  if (req.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  
  // Redirigir auth routes a dashboard para evitar loops
  if (req.nextUrl.pathname.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  
  // Permitir acceso a todas las rutas sin verificación
  return res;
}

// Configurar rutas que se evaluarán con el middleware
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)'
  ],
};