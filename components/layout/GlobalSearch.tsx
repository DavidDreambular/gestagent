'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Fuse from 'fuse.js';
import { 
  Search, 
  FileText, 
  Building, 
  User, 
  ArrowRight,
  Loader2,
  Clock,
  Hash
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface SearchResult {
  id: string;
  type: 'document' | 'supplier' | 'customer';
  title: string;
  subtitle?: string;
  metadata?: {
    date?: string;
    amount?: number;
    status?: string;
    nif?: string;
  };
  url: string;
  score: number;
}

interface GlobalSearchProps {
  placeholder?: string;
  className?: string;
  showShortcut?: boolean;
}

// Configuración de Fuse.js para diferentes tipos de entidades
const fuseOptions = {
  includeScore: true,
  threshold: 0.3, // Más estricto para mejores resultados
  minMatchCharLength: 2,
  keys: {
    documents: [
      { name: 'documentType', weight: 0.7 },
      { name: 'invoiceNumber', weight: 0.9 },
      { name: 'supplierName', weight: 0.8 },
      { name: 'customerName', weight: 0.6 },
      { name: 'description', weight: 0.4 }
    ],
    suppliers: [
      { name: 'name', weight: 0.9 },
      { name: 'nif', weight: 0.8 },
      { name: 'email', weight: 0.6 },
      { name: 'city', weight: 0.4 }
    ],
    customers: [
      { name: 'name', weight: 0.9 },
      { name: 'nif', weight: 0.8 },
      { name: 'email', weight: 0.6 },
      { name: 'city', weight: 0.4 }
    ]
  }
};

export default function GlobalSearch({ 
  placeholder = "Buscar documentos, proveedores, clientes...",
  className = "",
  showShortcut = true
}: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Cache para los datos de búsqueda
  const [searchCache, setSearchCache] = useState<{
    documents: any[];
    suppliers: any[];
    customers: any[];
    lastFetch: number;
  }>({
    documents: [],
    suppliers: [],
    customers: [],
    lastFetch: 0
  });
  
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Debounce para la búsqueda
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Función para obtener y cachear datos
  const fetchSearchData = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    const cacheMaxAge = 5 * 60 * 1000; // 5 minutos
    
    if (!forceRefresh && (now - searchCache.lastFetch) < cacheMaxAge && searchCache.documents.length > 0) {
      return searchCache;
    }

    try {
      const [documentsRes, suppliersRes, customersRes] = await Promise.allSettled([
        fetch('/api/documents/list?limit=100'),
        fetch('/api/suppliers?limit=100'),
        fetch('/api/customers?limit=100')
      ]);

      const newCache = {
        documents: documentsRes.status === 'fulfilled' && documentsRes.value.ok 
          ? await documentsRes.value.json() : [],
        suppliers: suppliersRes.status === 'fulfilled' && suppliersRes.value.ok 
          ? await suppliersRes.value.json() : [],
        customers: customersRes.status === 'fulfilled' && customersRes.value.ok 
          ? await customersRes.value.json() : [],
        lastFetch: now
      };

      setSearchCache(newCache);
      return newCache;
    } catch (error) {
      console.error('Error al obtener datos para búsqueda:', error);
      return searchCache;
    }
  }, [searchCache]);

  // Función de búsqueda mejorada con Fuse.js
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    
    try {
      // Obtener datos actualizados
      const data = await fetchSearchData();
      
      const searchResults: SearchResult[] = [];

      // Búsqueda en documentos con Fuse.js
      if (data.documents.length > 0) {
        const documentsFuse = new Fuse(data.documents, {
          ...fuseOptions,
          keys: fuseOptions.keys.documents
        });
        
        const documentResults = documentsFuse.search(searchQuery, { limit: 5 });
        
        documentResults.forEach(({ item: doc, score }) => {
          const document = doc as any; // Cast para evitar error de tipo
          searchResults.push({
            id: document.jobId || document.job_id,
            type: 'document',
            title: `${document.documentType || document.document_type} - ${document.invoiceNumber || document.invoice_number || 'Sin número'}`,
            subtitle: document.supplierName || document.supplier_name || document.emitter_name || 'Proveedor desconocido',
            metadata: {
              date: document.issueDate || document.issue_date || document.document_date,
              amount: document.totalAmount || document.total_amount,
              status: document.status
            },
            url: `/dashboard/documents/${document.jobId || document.job_id}`,
            score: 1 - (score || 0) // Invertir score de Fuse.js
          });
        });
      }

      // Búsqueda en proveedores
      if (data.suppliers.length > 0) {
        const suppliersFuse = new Fuse(data.suppliers, {
          ...fuseOptions,
          keys: fuseOptions.keys.suppliers
        });
        
        const supplierResults = suppliersFuse.search(searchQuery, { limit: 3 });
        
        supplierResults.forEach(({ item: supplier, score }) => {
          const supplierData = supplier as any; // Cast para evitar error de tipo
          searchResults.push({
            id: supplierData.id || supplierData.supplier_id,
            type: 'supplier',
            title: supplierData.name,
            subtitle: `NIF: ${supplierData.nif || supplierData.nif_cif || 'No disponible'}`,
            metadata: {
              nif: supplierData.nif || supplierData.nif_cif
            },
            url: `/dashboard/suppliers/${supplierData.id || supplierData.supplier_id}`,
            score: 1 - (score || 0)
          });
        });
      }

      // Búsqueda en clientes
      if (data.customers.length > 0) {
        const customersFuse = new Fuse(data.customers, {
          ...fuseOptions,
          keys: fuseOptions.keys.customers
        });
        
        const customerResults = customersFuse.search(searchQuery, { limit: 3 });
        
        customerResults.forEach(({ item: customer, score }) => {
          const customerData = customer as any; // Cast para evitar error de tipo
          searchResults.push({
            id: customerData.id || customerData.customer_id,
            type: 'customer',
            title: customerData.name,
            subtitle: `NIF: ${customerData.nif || customerData.nif_cif || 'No disponible'}`,
            metadata: {
              nif: customerData.nif || customerData.nif_cif
            },
            url: `/dashboard/customers/${customerData.id || customerData.customer_id}`,
            score: 1 - (score || 0)
          });
        });
      }

      // Ordenar por score y limitar resultados
      const sortedResults = searchResults
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      setResults(sortedResults);
      setSelectedIndex(0);
      
    } catch (error) {
      console.error('Error en búsqueda global:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchSearchData]);

  // Effect para búsqueda con debounce
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch(query);
      } else {
        setResults([]);
      }
    }, 300); // 300ms de debounce

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [query, performSearch]);

  // Navegación con teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) {
        // Cmd/Ctrl + K para abrir búsqueda
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 100);
        }
        return;
      }

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
          setIsOpen(false);
          setQuery('');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Manejar click en resultado
  const handleResultClick = (result: SearchResult) => {
    router.push(result.url);
    setIsOpen(false);
    setQuery('');
  };

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Icono por tipo
  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'document':
        return <FileText className="h-4 w-4" />;
      case 'supplier':
        return <Building className="h-4 w-4" />;
      case 'customer':
        return <User className="h-4 w-4" />;
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
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`relative ${className}`} ref={resultsRef}>
      {/* Input de búsqueda */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-full text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        />
        {showShortcut && !isOpen && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <kbd className="inline-flex items-center border border-gray-200 rounded px-1.5 py-0.5 text-xs font-mono text-gray-400">
              ⌘K
            </kbd>
          </div>
        )}
      </div>

      {/* Resultados */}
      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 max-h-96 overflow-hidden shadow-lg">
          <CardContent className="p-0">
            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-gray-500">Buscando...</span>
              </div>
            )}

            {!isLoading && query && results.length === 0 && (
              <div className="py-4 px-4 text-center text-gray-500">
                <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No se encontraron resultados para &quot;{query}&quot;</p>
              </div>
            )}

            {!isLoading && results.length > 0 && (
              <div className="max-h-80 overflow-y-auto">
                {results.map((result, index) => (
                  <div
                    key={result.id}
                    className={`flex items-center px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 ${
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
                          {result.metadata.status && (
                            <Badge variant="outline" className="text-xs">
                              {result.metadata.status}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}

            {!isLoading && results.length > 0 && (
              <div className="border-t border-gray-100 px-4 py-2 bg-gray-50">
                <p className="text-xs text-gray-500 text-center">
                  Usa ↑↓ para navegar, Enter para seleccionar, Esc para cerrar
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 