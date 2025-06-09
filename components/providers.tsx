"use client"

import { SessionProvider } from 'next-auth/react'
import { Session } from 'next-auth'
import { ThemeProvider } from '@/contexts/ThemeContext'

// 🔓 TEMPORAL: Mock session para testing sin auth
const MOCK_SESSION: Session = {
  user: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'admin@example.com',
    name: 'Admin Usuario',
    role: 'admin',
    user_id: '550e8400-e29b-41d4-a716-446655440001'
  },
  expires: '2025-12-31T23:59:59.999Z'
}

export function Providers({ children, session }: { 
  children: React.ReactNode
  session?: Session | null 
}) {
  // 🔓 TEMPORAL: Usar mock session si no hay session real
  const effectiveSession = session || MOCK_SESSION
  
  return (
    <ThemeProvider>
      <SessionProvider session={effectiveSession}>
        {children}
      </SessionProvider>
    </ThemeProvider>
  )
}

