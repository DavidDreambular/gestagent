'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { translateRole } from '@/lib/utils';
import { NotificationsSystem } from '@/components/dashboard/notifications-system';
import { Search, User, Command } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Fuse from 'fuse.js';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: 'document' | 'supplier' | 'customer' | 'page';
  url: string;
}

const searchableItems: SearchResult[] = [
  // Páginas principales
  { id: '1', title: 'Dashboard', subtitle: 'Página principal', type: 'page', url: '/dashboard' },
  { id: '2', title: 'Documentos', subtitle: 'Lista de documentos', type: 'page', url: '/dashboard/documents' },
  { id: '3', title: 'Nuevo Documento', subtitle: 'Subir documento', type: 'page', url: '/dashboard/documents/new' },
  { id: '4', title: 'Proveedores', subtitle: 'Gestión de proveedores', type: 'page', url: '/dashboard/suppliers' },
  { id: '5', title: 'Clientes', subtitle: 'Gestión de clientes', type: 'page', url: '/dashboard/customers' },
  { id: '6', title: 'Reportes', subtitle: 'Informes y análisis', type: 'page', url: '/dashboard/reports' },
  { id: '7', title: 'Usuarios', subtitle: 'Gestión de usuarios', type: 'page', url: '/dashboard/users' },
  { id: '8', title: 'Configuración', subtitle: 'Ajustes del sistema', type: 'page', url: '/dashboard/configuration' },
  { id: '9', title: 'Notificaciones', subtitle: 'Centro de notificaciones', type: 'page', url: '/dashboard/notifications' },
];

const fuse = new Fuse(searchableItems, {
  keys: ['title', 'subtitle'],
  threshold: 0.3,
  includeScore: true,
});

export function Header() {
  const { user, signOut } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  // Integrar atajos de teclado globales
  const { shortcuts, showHelp, setShowHelp } = useKeyboardShortcuts();

  // Búsqueda en tiempo real
  useEffect(() => {
    if (searchQuery.trim()) {
      const results = fuse.search(searchQuery).map(result => result.item);
      setSearchResults(results.slice(0, 6));
      setSelectedIndex(0);
    } else {
      setSearchResults(searchableItems.slice(0, 6));
      setSelectedIndex(0);
    }
  }, [searchQuery]);

  // Atajos de teclado para búsqueda
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      
      if (searchOpen) {
        if (e.key === 'Escape') {
          setSearchOpen(false);
          setSearchQuery('');
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % searchResults.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => prev === 0 ? searchResults.length - 1 : prev - 1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (searchResults[selectedIndex]) {
            router.push(searchResults[selectedIndex].url);
            setSearchOpen(false);
            setSearchQuery('');
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen, searchResults, selectedIndex, router]);

  const handleSearchSelect = (result: SearchResult) => {
    router.push(result.url);
    setSearchOpen(false);
    setSearchQuery('');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'document': return '📄';
      case 'supplier': return '🏪';
      case 'customer': return '👤';
      case 'page': return '🔗';
      default: return '📄';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'document': return 'bg-blue-50 text-blue-700';
      case 'supplier': return 'bg-green-50 text-green-700';
      case 'customer': return 'bg-purple-50 text-purple-700';
      case 'page': return 'bg-gray-50 text-gray-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  return (
    <>
      <header className="h-16 border-b border-border bg-background flex items-center px-4">
        <div className="flex-1 flex items-center">
          <div className="relative max-w-md w-full">
            <Button
              variant="outline"
              className="w-full justify-start text-left text-gray-500 hover:text-gray-700"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="mr-2 h-4 w-4" />
              <span>Buscar documentos, proveedores, clientes...</span>
              <div className="ml-auto flex items-center gap-1">
                <kbd className="pointer-events-none h-5 select-none items-center gap-1 rounded border bg-gray-100 px-1.5 font-mono text-[10px] font-medium text-gray-600 flex">
                  <Command className="h-3 w-3" />
                  K
                </kbd>
              </div>
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <NotificationsSystem />

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
                <Link href="/dashboard/configuration">Configuración</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Modal de búsqueda global */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Búsqueda Global</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Buscar en toda la aplicación..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
            
            {searchResults.length > 0 && (
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <div
                    key={result.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      index === selectedIndex 
                        ? 'bg-blue-50 border-blue-200 border' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleSearchSelect(result)}
                  >
                    <span className="text-xl">{getTypeIcon(result.type)}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{result.title}</h4>
                      <p className="text-sm text-gray-500 truncate">{result.subtitle}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${getTypeColor(result.type)}`}>
                      {result.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            {searchQuery && searchResults.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Search className="mx-auto h-8 w-8 mb-2" />
                <p>No se encontraron resultados para &quot;{searchQuery}&quot;</p>
              </div>
            )}
            
            <div className="border-t pt-3 text-xs text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>↑↓ para navegar</span>
                <span>↵ para seleccionar</span>
                <span>ESC para cerrar</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}
