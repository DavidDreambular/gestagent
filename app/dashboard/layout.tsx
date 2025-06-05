// app/dashboard/layout.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // TEMPORAL: Bypass de autenticación para testing de suppliers/customers
  const isTestingMode = true; // TODO: Cambiar a false cuando la auth esté lista

  // Redirigir a login si no hay usuario autenticado (solo si no estamos en modo testing)
  useEffect(() => {
    if (!isTestingMode && !loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router, isTestingMode]);

  // En modo testing, no mostrar loading indefinido
  if (!isTestingMode && loading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
}