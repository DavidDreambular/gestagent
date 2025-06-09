'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  FileText, 
  Building, 
  User, 
  ArrowRight,
  Loader2,
  Clock,
  Hash,
  Command
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SearchResult {
  id: string;
  type: 'document' | 'supplier' | 'customer' | 'action';
  title: string;
  subtitle?: string;
  metadata?: {
    date?: string;
    amount?: number;
    status?: string;
    nif?: string;
  };
  url?: string;
  action?: () => void;
  score: number;
}

interface SearchCommandProps {
  isOpen: boolean;
  onClose: () => void;
}

// Función de fuzzy search mejorada
function fuzzySearch(needle: string, haystack: string): number {
  needle = needle.toLowerCase();
  haystack = haystack.toLowerCase();
  
  // Coincidencia exacta
  if (haystack.includes(needle)) {
    const index = haystack.indexOf(needle);
    // Bonus por coincidencia al inicio
    const positionBonus = index === 0 ? 0.2 : 0.1;
    return 0.9 + positionBonus;
  }
  
  // Fuzzy matching
  let score = 0;
  let i = 0;
  let j = 0;
  
  while (i < needle.length && j < haystack.length) {
    if (needle[i] === haystack[j]) {
      score++;
      i++;
    }
    j++;
  }
  
  if (i === needle.length) {
    return (score / needle.length) * 0.7;
  }
  
  return 0;
}

export default function SearchCommand({ isOpen, onClose }: SearchCommandProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const router = useRouter();

  // Acciones rápidas predefinidas
  const quickActions: SearchResult[] = [
    {
      id: 'new-document',
      type: 'action',
      title: 'Nuevo Documento',
      subtitle: 'Subir y procesar un nuevo PDF',
      action: () => {
        router.push('/dashboard/documents/new');
        onClose();
      },
      score: 1
    },
    {
      id: 'dashboard',
      type: 'action',
      title: 'Dashboard',
      subtitle: 'Ir al panel principal',
      action: () => {
        router.push('/dashboard');
        onClose();
      },
      score: 1
    },
    {
      id: 'documents-list',
      type: 'action',
      title: 'Lista de Documentos',
      subtitle: 'Ver todos los documentos procesados',
      action: () => {
        router.push('/dashboard/documents');
        onClose();
      },
      score: 1
    },
    {
      id: 'suppliers',
      type: 'action',
      title: 'Proveedores',
      subtitle: 'Gestionar proveedores',
      action: () => {
        router.push('/dashboard/suppliers');
        onClose();
      },
      score: 1
    },
    {
      id: 'customers',
      type: 'action',
      title: 'Clientes',
      subtitle: 'Gestionar clientes',
      action: () => {
        router.push('/dashboard/customers');
        onClose();
      },
      score: 1
    }
  ];

  // Función de búsqueda
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      // Mostrar acciones rápidas cuando no hay query
      const filteredActions = quickActions.filter(action =>
        fuzzySearch(searchQuery, action.title) > 0.3 ||
        fuzzySearch(searchQuery, action.subtitle || '') > 0.3
      );
      setResults(filteredActions);
      return;
    }

    setIsLoading(true);
    
    try {
      const searchResults: SearchResult[] = [];

      // Buscar en acciones rápidas
      quickActions.forEach(action => {
        const titleScore = fuzzySearch(searchQuery, action.title);
        const subtitleScore = fuzzySearch(searchQuery, action.subtitle || '');
        const maxScore = Math.max(titleScore, subtitleScore);
        
        if (maxScore > 0.3) {
          searchResults.push({
            ...action,
            score: maxScore
          });
        }
      });

      // Buscar documentos (simulado por ahora)
      try {
        const documentsRes = await fetch(`/api/documents/search?q=${encodeURIComponent(searchQuery)}&limit=5`);
        if (documentsRes.ok) {
          const documents = await documentsRes.json();
          documents.forEach((doc: any) => {
            const titleScore = fuzzySearch(searchQuery, doc.documentType || '');
            const supplierScore = fuzzySearch(searchQuery, doc.supplierName || '');
            const numberScore = fuzzySearch(searchQuery, doc.invoiceNumber || '');
            
            const maxScore = Math.max(titleScore, supplierScore, numberScore);
            
            if (maxScore > 0.3) {
              searchResults.push({
                id: doc.jobId,
                type: 'document',
                title: `${doc.documentType} - ${doc.invoiceNumber || 'Sin número'}`,
                subtitle: doc.supplierName || 'Proveedor desconocido',
                metadata: {
                  date: doc.issueDate,
                  amount: doc.totalAmount,
                  status: doc.status
                },
                url: `/dashboard/documents/${doc.jobId}`,
                score: maxScore
              });
            }
          });
        }
      } catch (error) {
        console.warn('Error buscando documentos:', error);
      }

      // Buscar proveedores (simulado)
      try {
        const suppliersRes = await fetch(`/api/suppliers/search?q=${encodeURIComponent(searchQuery)}&limit=3`);
        if (suppliersRes.ok) {
          const suppliers = await suppliersRes.json();
          suppliers.forEach((supplier: any) => {
            const nameScore = fuzzySearch(searchQuery, supplier.name || '');
            const nifScore = fuzzySearch(searchQuery, supplier.nif || '');
            
            const maxScore = Math.max(nameScore, nifScore);
            
            if (maxScore > 0.3) {
              searchResults.push({
                id: supplier.id,
                type: 'supplier',
                title: supplier.name,
                subtitle: `NIF: ${supplier.nif}`,
                metadata: {
                  nif: supplier.nif
                },
                url: `/dashboard/suppliers/${supplier.id}`,
                score: maxScore
              });
            }
          });
        }
      } catch (error) {
        console.warn('Error buscando proveedores:', error);
      }

      // Ordenar por score y limitar resultados
      const sortedResults = searchResults
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);

      setResults(sortedResults);
      setSelectedIndex(0);
      
    } catch (error) {
      console.error('Error en búsqueda:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [router, onClose]);

  // Effect para búsqueda con debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [query, performSearch]);

  // Navegación con teclado
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < results.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleResultClick(results[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  // Manejar click en resultado
  const handleResultClick = (result: SearchResult) => {
    if (result.action) {
      result.action();
    } else if (result.url) {
      router.push(result.url);
      onClose();
    }
  };

  // Reset al abrir/cerrar
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults(quickActions);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Icono por tipo
  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'document':
        return <FileText className="h-4 w-4" />;
      case 'supplier':
        return <Building className="h-4 w-4" />;
      case 'customer':
        return <User className="h-4 w-4" />;
      case 'action':
        return <Command className="h-4 w-4" />;
      default:
        return <Hash className="h-4 w-4" />;
    }
  };

  // Color por tipo
  const getTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'document':
        return 'bg-blue-100 text-blue-800';
      case 'supplier':
        return 'bg-green-100 text-green-800';
      case 'customer':
        return 'bg-purple-100 text-purple-800';
      case 'action':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="sr-only">Búsqueda Global</DialogTitle>
        </DialogHeader>
        
        {/* Input de búsqueda */}
        <div className="relative border-b">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar documentos, proveedores, acciones..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 text-lg border-0 focus:outline-none focus:ring-0"
            autoFocus
          />
          {isLoading && (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          )}
        </div>

        {/* Resultados */}
        <div className="max-h-96 overflow-y-auto">
          {results.length === 0 && !isLoading && query && (
            <div className="py-8 px-4 text-center text-gray-500">
              <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No se encontraron resultados para &quot;{query}&quot;</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="py-2">
              {results.map((result, index) => (
                <div
                  key={result.id}
                  className={`flex items-center px-4 py-3 cursor-pointer ${
                    index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleResultClick(result)}
                >
                  <div className={`p-2 rounded ${getTypeColor(result.type)} mr-3`}>
                    {getTypeIcon(result.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {result.title}
                    </p>
                    {result.subtitle && (
                      <p className="text-xs text-gray-500 truncate">
                        {result.subtitle}
                      </p>
                    )}
                    
                    {result.metadata && (
                      <div className="flex items-center gap-2 mt-1">
                        {result.metadata.date && (
                          <div className="flex items-center text-xs text-gray-400">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(result.metadata.date).toLocaleDateString('es-ES')}
                          </div>
                        )}
                        {result.metadata.amount && (
                          <span className="text-xs font-medium text-green-600">
                            €{result.metadata.amount.toFixed(2)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer con ayuda */}
        <div className="border-t px-4 py-2 bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
          <span>Usa ↑↓ para navegar, Enter para seleccionar</span>
          <span>Esc para cerrar</span>
        </div>
      </DialogContent>
    </Dialog>
  );
} 