// Middleware de autenticación para API Routes
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export interface AuthenticatedRequest extends NextRequest {
  userId?: string;
  userRole?: string;
}

export async function withAuth(
  request: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Intentar obtener sesión de NextAuth
    const session = await getServerSession(authOptions);
    
    // También verificar header user-id (para desarrollo/testing)
    const headerUserId = request.headers.get('user-id');
    
    const userId = session?.user?.id || headerUserId;
    const userRole = session?.user?.role || 'user';
    
    if (!userId) {
      return NextResponse.json(
        { 
          error: 'No autorizado',
          message: 'Por favor inicie sesión para acceder a este recurso'
        },
        { status: 401 }
      );
    }
    
    // Añadir userId y role a la request
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.userId = userId;
    authenticatedRequest.userRole = userRole;
    
    // Ejecutar el handler con la request autenticada
    return await handler(authenticatedRequest);
    
  } catch (error) {
    console.error('[Auth Middleware] Error:', error);
    return NextResponse.json(
      { error: 'Error de autenticación' },
      { status: 500 }
    );
  }
}

// Verificar si el usuario tiene un rol específico
export function hasRole(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.some(role => userRole.includes(role));
}

// Middleware para endpoints que requieren rol de admin
export async function withAdminAuth(
  request: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  return withAuth(request, async (req) => {
    if (!hasRole(req.userRole || '', ['admin', 'superadmin'])) {
      return NextResponse.json(
        { 
          error: 'Acceso denegado',
          message: 'Se requieren permisos de administrador'
        },
        { status: 403 }
      );
    }
    return handler(req);
  });
}
