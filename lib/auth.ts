import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { postgresqlClient } from './postgresql-client'

// Extender los tipos de NextAuth
declare module 'next-auth' {
  interface User {
    role?: string
    user_id?: string
  }
  
  interface Session {
    user: {
      id: string
      email?: string | null
      name?: string | null
      image?: string | null
      role?: string
      user_id?: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string
    user_id?: string
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
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ [AUTH] Credenciales faltantes')
          return null
        }

        try {
          console.log('🔐 [AUTH] Intentando autenticar:', credentials.email)

          // Buscar usuario en PostgreSQL
          const result = await postgresqlClient.query(
            'SELECT user_id, username, email, password_hash, role FROM users WHERE email = $1',
            [credentials.email]
          )

          if (!result.data || result.data.length === 0) {
            console.log('❌ [AUTH] Usuario no encontrado:', credentials.email)
            return null
          }

          const user = result.data[0]

          // Verificar contraseña
          const isValidPassword = await bcrypt.compare(credentials.password, user.password_hash)
          
          if (!isValidPassword) {
            console.log('❌ [AUTH] Contraseña incorreta para:', credentials.email)
            return null
          }

          // Actualizar último login (comentado hasta agregar columna last_login)
          // await postgresqlClient.query(
          //   'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1',
          //   [user.user_id]
          // )

          console.log('✅ [AUTH] Autenticación exitosa:', credentials.email)

          return {
            id: user.user_id,
            email: user.email,
            name: user.username,
            role: user.role,
            user_id: user.user_id
          }

        } catch (error) {
          console.error('❌ [AUTH] Error en authorize:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 horas
  },
  pages: {
    signIn: '/auth/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.user_id = user.user_id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.sub || ''
        session.user.role = token.role
        session.user.user_id = token.user_id
      }
      return session
    }
  },
  debug: process.env.NODE_ENV === 'development',
} 