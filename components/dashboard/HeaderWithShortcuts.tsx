'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { translateRole } from '@/lib/utils';
import { NotificationsSystem } from '@/components/dashboard/notifications-system';
import { Search, User, Keyboard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

export function HeaderWithShortcuts() {
  const { user, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const router = useRouter();

  // Atajos de teclado simples
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignorar si estamos en un input
      const target = event.target as HTMLElement;
      const isInputElement = target.tagName === 'INPUT' || 
                            target.tagName === 'TEXTAREA' || 
                            target.contentEditable === 'true';

      // Permitir algunos atajos incluso en inputs
      if (isInputElement && event.key !== 'Escape') {
        return;
      }

      // Atajos de teclado
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'k':
            event.preventDefault();
            const searchInput = document.querySelector('input[placeholder*="Buscar"]') as HTMLInputElement;
            if (searchInput) {
              searchInput.focus();
              searchInput.select();
            }
            console.log('🔥 [Shortcut] Búsqueda activada');
            break;
          case 'n':
            event.preventDefault();
            router.push('/dashboard/documents/new');
            console.log('🔥 [Shortcut] Nuevo documento');
            break;
          case 'd':
            event.preventDefault();
            router.push('/dashboard');
            console.log('🔥 [Shortcut] Dashboard');
            break;
          case 'l':
            event.preventDefault();
            router.push('/dashboard/documents');
            console.log('🔥 [Shortcut] Lista documentos');
            break;
          case 'p':
            event.preventDefault();
            router.push('/dashboard/suppliers');
            console.log('🔥 [Shortcut] Proveedores');
            break;
          case 'c':
            event.preventDefault();
            router.push('/dashboard/customers');
            console.log('🔥 [Shortcut] Clientes');
            break;
        }
      }

      // Atajos especiales
      if (event.key === 'Escape') {
        setShowShortcuts(false);
      }

      if (event.key === '?' && event.shiftKey) {
        event.preventDefault();
        setShowShortcuts(prev => !prev);
        console.log('🔥 [Shortcut] Ayuda de atajos');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [router]);

  // Función para manejar búsqueda global
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Búsqueda:', searchQuery);
  };

  return (
    <>
      <header className="h-16 border-b border-gray-200 bg-white flex items-center px-4">
        <div className="flex-1 flex items-center">
          {/* Buscador con atajo de teclado */}
          <form onSubmit={handleSearch} className="relative max-w-md w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Buscar documentos, proveedores, clientes... (Ctrl+K)"
              className="pl-9 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        </div>

        <div className="flex items-center space-x-4">
          {/* Botón de atajos de teclado */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowShortcuts(true)}
            className="text-gray-500 hover:text-gray-700"
            title="Ver atajos de teclado (?)"
          >
            <Keyboard className="h-4 w-4" />
          </Button>

          {/* Sistema de Notificaciones */}
          <NotificationsSystem />

          {/* Perfil de usuario */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-700">
                  <User className="h-4 w-4" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name || 'Usuario'}</p>
                  <p className="text-xs leading-none text-gray-500">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                  {user?.role ? translateRole(user.role) : 'Usuario'}
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile">Perfil</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings">Configuración</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowShortcuts(true)}>
                <Keyboard className="h-4 w-4 mr-2" />
                Atajos de teclado
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Modal de ayuda de atajos */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Atajos de Teclado</h2>
                <button
                  onClick={() => setShowShortcuts(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Buscar</span>
                  <kbd className="px-2 py-1 text-xs bg-gray-100 rounded">Ctrl+K</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Nuevo documento</span>
                  <kbd className="px-2 py-1 text-xs bg-gray-100 rounded">Ctrl+N</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Dashboard</span>
                  <kbd className="px-2 py-1 text-xs bg-gray-100 rounded">Ctrl+D</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Lista documentos</span>
                  <kbd className="px-2 py-1 text-xs bg-gray-100 rounded">Ctrl+L</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Proveedores</span>
                  <kbd className="px-2 py-1 text-xs bg-gray-100 rounded">Ctrl+P</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Clientes</span>
                  <kbd className="px-2 py-1 text-xs bg-gray-100 rounded">Ctrl+C</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Cerrar modales</span>
                  <kbd className="px-2 py-1 text-xs bg-gray-100 rounded">Esc</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Esta ayuda</span>
                  <kbd className="px-2 py-1 text-xs bg-gray-100 rounded">?</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 