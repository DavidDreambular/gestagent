import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import pgClient from '@/lib/postgresql-client'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('portal-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Verificar y decodificar el token
    const decoded = jwt.verify(
      token,
      process.env.NEXTAUTH_SECRET || 'fallback-secret'
    ) as any

    if (!decoded || decoded.role !== 'provider') {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    // Obtener información actualizada del usuario
    const { data: userData, error: userError } = await pgClient.query(
      'SELECT * FROM provider_users WHERE id = $1 AND active = true',
      [decoded.userId]
    )

    if (userError || !userData || userData.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    const user = userData[0]

    // Obtener información del proveedor
    const { data: providerData, error: providerError } = await pgClient.query(
      'SELECT * FROM suppliers WHERE supplier_id = $1',
      [user.supplier_id]
    )

    if (providerError || !providerData || providerData.length === 0) {
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      )
    }

    const provider = providerData[0]

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        providerId: user.supplier_id,
        providerName: provider.name,
        providerNif: provider.nif,
        userName: user.name,
        companyName: user.company_name,
        role: 'provider'
      }
    })

  } catch (error) {
    console.error('❌ [Portal Profile] Error:', error)
    return NextResponse.json(
      { error: 'Token inválido' },
      { status: 401 }
    )
  }
}