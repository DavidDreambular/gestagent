import { NextRequest, NextResponse } from 'next/server'
import { postgresqlClient } from '@/lib/postgresql-client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      )
    }

    console.log('🔐 [Portal Auth] Intentando autenticar proveedor:', email)

    // Buscar usuario proveedor en la base de datos
    const userResult = await postgresqlClient.query(
      'SELECT * FROM provider_users WHERE email = $1 AND active = true',
      [email]
    )

    if (!userResult.data || userResult.data.length === 0) {
      console.log('❌ [Portal Auth] Proveedor no encontrado:', email)
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    const user = userResult.data[0]

    // Verificar contraseña
    const passwordMatch = await bcrypt.compare(password, user.password_hash)
    if (!passwordMatch) {
      console.log('❌ [Portal Auth] Contraseña incorrecta para:', email)
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    // Obtener información del proveedor
    const providerResult = await postgresqlClient.query(
      'SELECT * FROM suppliers WHERE id = $1',
      [user.provider_id]
    )

    if (!providerResult.data || providerResult.data.length === 0) {
      console.log('❌ [Portal Auth] Proveedor no encontrado en suppliers:', user.provider_id)
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      )
    }

    const provider = providerResult.data[0]

    // Generar JWT
    const token = jwt.sign(
      {
        userId: user.id,
        providerId: user.provider_id,
        email: user.email,
        role: 'provider',
        providerName: provider.name
      },
      process.env.NEXTAUTH_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    )

    console.log('✅ [Portal Auth] Autenticación exitosa para proveedor:', email)

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        providerId: user.provider_id,
        providerName: provider.name,
        role: 'provider'
      }
    })

    // Establecer cookie con el token
    response.cookies.set('portal-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 horas
    })

    return response

  } catch (error) {
    console.error('❌ [Portal Auth] Error en login:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Portal Auth API funcionando' })
} 