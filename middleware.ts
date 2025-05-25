// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  // Verificar si el usuario está autenticado
  const { data: { session } } = await supabase.auth.getSession();
  
  // Rutas públicas (accesibles sin autenticación)
  const publicRoutes = ['/auth/login', '/auth/register', '/auth/forgot-password'];
  const isPublicRoute = publicRoutes.some(route => req.nextUrl.pathname.startsWith(route));
  
  // Redirigir usuarios autenticados que intentan acceder a rutas de autenticación
  if (session && isPublicRoute) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  
  // Redirigir usuarios no autenticados que intentan acceder a rutas protegidas
  if (!session && !isPublicRoute && !req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }
  
  // Verificar permisos para rutas de administración
  if (session && req.nextUrl.pathname.startsWith('/dashboard/admin')) {
    // Obtener el rol del usuario
    const { data: userData, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    if (error || userData?.role !== 'admin') {
      // Redirigir a dashboard si no es administrador
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }
  
  return res;
}

// Configurar rutas que se evaluarán con el middleware
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};