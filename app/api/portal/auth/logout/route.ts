import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Sesión cerrada correctamente'
    })

    // Eliminar la cookie del token
    response.cookies.set('portal-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0 // Eliminar inmediatamente
    })

    return response

  } catch (error) {
    console.error('❌ [Portal Logout] Error:', error)
    return NextResponse.json(
      { error: 'Error cerrando sesión' },
      { status: 500 }
    )
  }
}