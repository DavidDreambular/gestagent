// contexts/AuthContext.tsx - VERSIÓN REAL CON SUPABASE AUTH
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Session, User } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

// MANTENER TIPOS EXACTOS - NO MODIFICAR
export type UserRole = 'admin' | 'contable' | 'gestor' | 'operador' | 'supervisor';

export type UserProfile = {
  user_id: string;
  username: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClientComponentClient<Database>();

  useEffect(() => {
    console.log('[Auth] Inicializando gestión de sesiones...');
    
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[Auth] Sesión inicial:', session?.user?.email || 'No user');
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] State change:', event, session?.user?.email || 'No user');
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      console.log('[Auth] Cleanup subscription');
      subscription.unsubscribe();
    };
  }, [supabase]);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('[Auth] Fetching profile for user:', userId);
      setLoading(true);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[Auth] Error fetching profile:', error);
      } else if (data) {
        console.log('[Auth] Profile loaded:', data.username);
        setProfile(data);
      } else {
        console.log('[Auth] No profile found for user');
      }
    } catch (error) {
      console.error('[Auth] Exception fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const signIn = async (email: string, password: string) => {
    try {
      console.log('[Auth] Intentando login:', email);
      setLoading(true);
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('[Auth] Login error:', error.message);
      } else {
        console.log('[Auth] Login exitoso');
      }
      
      return { error };
    } catch (error) {
      console.error('[Auth] Login exception:', error);
      return { error: error as Error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string, 
    password: string, 
    username: string, 
    role: UserRole = 'operador'
  ) => {
    try {
      console.log('[Auth] Intentando registro:', email, username, role);
      setLoading(true);

      // 1. Crear usuario en Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        console.error('[Auth] Auth signup error:', authError.message);
        return { error: authError };
      }
      
      if (!data.user) {
        const error = new Error('No user returned from signup');
        console.error('[Auth] No user returned');
        return { error };
      }

      console.log('[Auth] Usuario creado en auth:', data.user.id);

      // 2. Crear perfil en tabla users
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          user_id: data.user.id,
          username,
          email,
          role,
        });

      if (profileError) {
        console.error('[Auth] Profile creation error:', profileError.message);
        return { error: profileError };
      }

      console.log('[Auth] Perfil creado exitosamente');
      return { error: null };
      
    } catch (error) {
      console.error('[Auth] Signup exception:', error);
      return { error: error as Error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    console.log('[Auth] Cerrando sesión');
    await supabase.auth.signOut();
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      console.log('[Auth] Actualizando perfil:', updates);
      const { error } = await supabase
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (!error && profile) {
        setProfile({ ...profile, ...updates });
        console.log('[Auth] Perfil actualizado');
      }

      return { error };
    } catch (error) {
      console.error('[Auth] Update profile error:', error);
      return { error: error as Error };
    }
  };

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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}