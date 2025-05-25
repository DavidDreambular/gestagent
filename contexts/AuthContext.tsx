// contexts/AuthContext.tsx - VERSIÓN TEMPORAL CON USUARIO MOCK
'use client';

import { createContext, useContext, ReactNode } from 'react';

// Tipo para el rol del usuario
export type UserRole = 'admin' | 'contable' | 'gestor' | 'operador' | 'supervisor';

// Tipo para el perfil de usuario extendido (simplificado para testing)
export type UserProfile = {
  user_id: string;
  username: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

interface AuthContextType {
  session: any;
  user: any;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, username: string, role: UserRole) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
}

// ⚠️ USUARIO MOCK PARA TESTING
const MOCK_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@gestagent.com',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const MOCK_PROFILE: UserProfile = {
  user_id: '00000000-0000-0000-0000-000000000001',
  username: 'admin',
  email: 'admin@gestagent.com',
  role: 'admin',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const MOCK_SESSION = {
  user: MOCK_USER,
  access_token: 'mock_token_for_testing',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'mock_refresh_token',
};

// Crear el contexto con un valor inicial
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook personalizado para usar el contexto
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Proveedor del contexto - VERSIÓN TEMPORAL
export function AuthProvider({ children }: { children: ReactNode }) {
  console.log('[TESTING MODE] AuthProvider iniciado con usuario mock:', MOCK_PROFILE);

  // Funciones mock para mantener compatibilidad
  async function signIn(email: string, password: string) {
    console.log('[TESTING MODE] signIn llamado - siempre exitoso');
    return { error: null };
  }

  async function signUp(email: string, password: string, username: string, role: UserRole) {
    console.log('[TESTING MODE] signUp llamado - siempre exitoso');
    return { error: null };
  }

  async function signOut() {
    console.log('[TESTING MODE] signOut llamado');
  }

  async function updateProfile(updates: Partial<UserProfile>) {
    console.log('[TESTING MODE] updateProfile llamado con:', updates);
    return { error: null };
  }

  const value = {
    session: MOCK_SESSION,
    user: MOCK_USER,
    profile: MOCK_PROFILE,
    loading: false, // Nunca loading en modo testing
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}