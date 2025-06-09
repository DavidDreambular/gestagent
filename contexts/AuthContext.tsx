// Contexto de autenticación usando NextAuth - Sin Supabase
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';

export interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  user_id?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const loading = status === 'loading';

  // Actualizar usuario cuando cambia la sesión
  useEffect(() => {
    if (session?.user) {
      setUser({
        id: session.user.id,
        email: session.user.email || '',
        name: session.user.name || '',
        role: session.user.role || 'user',
        user_id: session.user.user_id
      });
      console.log('✅ [AUTH] Usuario autenticado:', session.user.email);
    } else {
      setUser(null);
      console.log('🔓 [AUTH] Usuario no autenticado');
    }
  }, [session]);

  // Función de login
  const handleSignIn = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('🔐 [AUTH] Intentando login:', email);
      
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      });

      if (result?.error) {
        console.error('❌ [AUTH] Error en login:', result.error);
        return false;
      }

      console.log('✅ [AUTH] Login exitoso');
      return true;
    } catch (error) {
      console.error('❌ [AUTH] Error en handleSignIn:', error);
      return false;
    }
  };

  // Función de logout
  const handleSignOut = async (): Promise<void> => {
    try {
      console.log('🔓 [AUTH] Cerrando sesión...');
      await signOut({ redirect: false });
      setUser(null);
      console.log('✅ [AUTH] Sesión cerrada');
    } catch (error) {
      console.error('❌ [AUTH] Error en logout:', error);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn: handleSignIn,
    signOut: handleSignOut,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}