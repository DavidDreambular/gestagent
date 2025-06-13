import { NextRequest, NextResponse } from 'next/server'
import pgClient from '@/lib/postgresql-client'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

/**
 * POST /api/v1/auth
 * API de autenticación para integración externa
 * 
 * Body:
 * {
 *   "email": "proveedor@empresa.com",
 *   "password": "password123"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "token": "jwt-token",
 *   "user": {
 *     "id": "uuid",
 *     "email": "email",
 *     "providerId": "uuid",
 *     "providerName": "Nombre Empresa"
 *   },
 *   "expires": "2024-01-01T00:00:00Z"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validar datos requeridos
    if (!email || !password) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Email y contraseña son requeridos',
          code: 'MISSING_CREDENTIALS'
        },
        { status: 400 }
      )
    }

    console.log('🔐 [API v1 Auth] Intentando autenticar proveedor:', email)

    // Buscar usuario proveedor
    const { data: userData, error: userError } = await pgClient.query(
      'SELECT * FROM provider_users WHERE email = $1 AND active = true',
      [email]
    )

    if (userError || !userData || userData.length === 0) {
      console.log('❌ [API v1 Auth] Proveedor no encontrado:', email)
      return NextResponse.json(
        { 
          success: false,
          error: 'Credenciales inválidas',
          code: 'INVALID_CREDENTIALS'
        },
        { status: 401 }
      )
    }

    const user = userData[0]

    // Verificar contraseña
    const passwordMatch = await bcrypt.compare(password, user.password_hash)
    if (!passwordMatch) {
      console.log('❌ [API v1 Auth] Contraseña incorrecta para:', email)
      return NextResponse.json(
        { 
          success: false,
          error: 'Credenciales inválidas',
          code: 'INVALID_CREDENTIALS'
        },
        { status: 401 }
      )
    }

    // Obtener información del proveedor
    const { data: providerData, error: providerError } = await pgClient.query(
      'SELECT * FROM suppliers WHERE supplier_id = $1',
      [user.supplier_id]
    )

    if (providerError || !providerData || providerData.length === 0) {
      console.log('❌ [API v1 Auth] Proveedor no encontrado en suppliers:', user.supplier_id)
      return NextResponse.json(
        { 
          success: false,
          error: 'Proveedor no encontrado',
          code: 'PROVIDER_NOT_FOUND'
        },
        { status: 404 }
      )
    }

    const provider = providerData[0]

    // Actualizar último login
    await pgClient.query(
      'UPDATE provider_users SET last_login = NOW() WHERE id = $1',
      [user.id]
    )

    // Generar JWT con expiración de 24 horas
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const token = jwt.sign(
      {
        userId: user.id,
        providerId: user.supplier_id,
        email: user.email,
        role: 'provider_api',
        providerName: provider.name,
        type: 'api_token'
      },
      process.env.NEXTAUTH_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    )

    console.log('✅ [API v1 Auth] Autenticación exitosa para proveedor:', email)

    return NextResponse.json({
      success: true,
      token: token,
      user: {
        id: user.id,
        email: user.email,
        providerId: user.supplier_id,
        providerName: provider.name,
        userName: user.name,
        companyName: user.company_name
      },
      expires: expiresAt.toISOString(),
      tokenType: 'Bearer'
    })

  } catch (error) {
    console.error('❌ [API v1 Auth] Error en autenticación:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/v1/auth
 * Verificar estado del token
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Token de autorización requerido',
          code: 'MISSING_TOKEN'
        },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // Verificar token
    const decoded = jwt.verify(
      token,
      process.env.NEXTAUTH_SECRET || 'fallback-secret'
    ) as any

    if (!decoded || decoded.role !== 'provider_api') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Token inválido',
          code: 'INVALID_TOKEN'
        },
        { status: 401 }
      )
    }

    // Verificar que el usuario sigue activo
    const { data: userData, error: userError } = await pgClient.query(
      'SELECT id, email, active FROM provider_users WHERE id = $1',
      [decoded.userId]
    )

    if (userError || !userData || userData.length === 0 || !userData[0].active) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Usuario no encontrado o inactivo',
          code: 'USER_INACTIVE'
        },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      valid: true,
      user: {
        id: decoded.userId,
        email: decoded.email,
        providerId: decoded.providerId,
        providerName: decoded.providerName
      },
      expires: new Date(decoded.exp * 1000).toISOString()
    })

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Token inválido o expirado',
          code: 'TOKEN_EXPIRED'
        },
        { status: 401 }
      )
    }

    console.error('❌ [API v1 Auth] Error verificando token:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}