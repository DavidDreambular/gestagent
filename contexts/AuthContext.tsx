// contexts/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import supabase from '../lib/supabase';
import { Database } from '../lib/database.types';

// Tipo para el rol del usuario
export type UserRole = 'admin' | 'contable' | 'gestor' | 'operador' | 'supervisor';

// Tipo para el perfil de usuario extendido
export type UserProfile = Database['public']['Tables']['users']['Row'];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, username: string, role: UserRole) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
}

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

// Proveedor del contexto
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar sesión inicial y configurar suscripción a cambios
  useEffect(() => {
    // Obtener sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Configurar listener para cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // Limpiar suscripción
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Obtener perfil del usuario
  async function fetchProfile(userId: string) {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  }

  // Iniciar sesión
  async function signIn(email: string, password: string) {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }

  // Registrar usuario
  async function signUp(email: string, password: string, username: string, role: UserRole) {
    try {
      // Solo admin puede crear nuevos administradores
      if (role === 'admin' && profile?.role !== 'admin') {
        return { error: new Error('No tienes permisos para crear administradores') };
      }

      // Crear usuario en Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      if (data.user) {
        // Crear perfil en la tabla users
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            username,
            email,
            role,
          });

        if (profileError) {
          // Si hay error al crear el perfil, intentar eliminar el usuario Auth
          await supabase.auth.admin.deleteUser(data.user.id);
          return { error: profileError };
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  // Cerrar sesión
  async function signOut() {
    await supabase.auth.signOut();
  }

  // Actualizar perfil
  async function updateProfile(updates: Partial<UserProfile>) {
    try {
      if (!user) {
        throw new Error('No hay usuario autenticado');
      }

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      // Actualizar perfil en el estado
      if (profile) {
        setProfile({ ...profile, ...updates });
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  const value = {
    session,
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}