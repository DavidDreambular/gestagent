import { NextRequest, NextResponse } from 'next/server'
import pgClient from '@/lib/postgresql-client'
import bcrypt from 'bcrypt'
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
    const { data: userData, error: userError } = await pgClient.query(
      'SELECT * FROM provider_users WHERE email = $1 AND active = true',
      [email]
    )

    if (userError || !userData || userData.length === 0) {
      console.log('❌ [Portal Auth] Proveedor no encontrado:', email)
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    const user = userData[0]

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
    const { data: providerData, error: providerError } = await pgClient.query(
      'SELECT * FROM suppliers WHERE supplier_id = $1',
      [user.supplier_id]
    )

    if (providerError || !providerData || providerData.length === 0) {
      console.log('❌ [Portal Auth] Proveedor no encontrado en suppliers:', user.supplier_id)
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      )
    }

    const provider = providerData[0]

    // Actualizar último login
    await pgClient.query(
      'UPDATE provider_users SET last_login = NOW() WHERE id = $1',
      [user.id]
    )

    // Generar JWT
    const token = jwt.sign(
      {
        userId: user.id,
        providerId: user.supplier_id,
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
        providerId: user.supplier_id,
        providerName: provider.name,
        userName: user.name,
        companyName: user.company_name,
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