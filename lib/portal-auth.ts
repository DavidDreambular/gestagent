import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

export interface PortalUser {
  userId: string
  providerId: string
  email: string
  role: 'provider'
  providerName: string
}

export function getPortalUserFromRequest(request: NextRequest): PortalUser | null {
  try {
    const token = request.cookies.get('portal-token')?.value

    if (!token) {
      return null
    }

    const decoded = jwt.verify(
      token, 
      process.env.NEXTAUTH_SECRET || 'fallback-secret'
    ) as PortalUser

    return decoded

  } catch (error) {
    console.error('❌ [Portal Auth] Error decodificando token:', error)
    return null
  }
}

export function requirePortalAuth(request: NextRequest): PortalUser {
  const user = getPortalUserFromRequest(request)
  
  if (!user) {
    throw new Error('No autenticado')
  }

  return user
} 