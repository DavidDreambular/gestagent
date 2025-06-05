import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

// Extender los tipos de NextAuth
declare module 'next-auth' {
  interface User {
    role?: string
  }
  
  interface Session {
    user: {
      id: string
      email?: string | null
      name?: string | null
      image?: string | null
      role?: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        // En modo de testing, permitir acceso libre
        if (process.env.NODE_ENV === 'development') {
          return {
            id: 'test-user',
            email: credentials?.email || 'test@example.com',
            name: 'Test User',
            role: 'admin'
          }
        }

        // Aquí iría la lógica real de autenticación con Supabase
        // Por ahora, retornamos null para forzar el uso del contexto de auth existente
        return null
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/auth/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.role) {
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.sub || ''
        session.user.role = token.role
      }
      return session
    }
  }
} 