import { NextRequest, NextResponse } from 'next/server'
import { postgresqlClient } from '@/lib/postgresql-client'
import jwt from 'jsonwebtoken'

export async function GET(request: NextRequest) {
  try {
    // Obtener token de las cookies
    const token = request.cookies.get('portal-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Verificar y decodificar token
    let decoded: any
    try {
      decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'fallback-secret')
    } catch (error) {
      console.log('❌ [Portal Auth] Token inválido:', error)
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    // Obtener información actualizada del usuario
    const userResult = await postgresqlClient.query(
      `SELECT pu.*, s.name as provider_name, s.nif, s.address, s.phone, s.email as provider_email
       FROM provider_users pu
       JOIN suppliers s ON s.supplier_id = pu.provider_id
       WHERE pu.id = $1 AND pu.active = true`,
      [decoded.userId]
    )

    if (!userResult.data || userResult.data.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    const user = userResult.data[0]

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        providerId: user.provider_id,
        providerName: user.provider_name,
        providerNif: user.nif,
        providerAddress: user.address,
        providerPhone: user.phone,
        providerEmail: user.provider_email,
        role: 'provider',
        lastLogin: user.last_login,
        createdAt: user.created_at
      }
    })

  } catch (error) {
    console.error('❌ [Portal Auth] Error obteniendo usuario:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Logout - eliminar cookie
    const response = NextResponse.json({ success: true, message: 'Logout exitoso' })
    
    response.cookies.set('portal-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0 // Expira inmediatamente
    })

    return response

  } catch (error) {
    console.error('❌ [Portal Auth] Error en logout:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 