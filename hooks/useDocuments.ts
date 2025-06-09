// Hook para gestión de documentos - Versión Mock sin Supabase
'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Document {
  job_id: string;
  document_type: string;
  raw_json?: any;
  processed_json?: any;
  upload_timestamp: string;
  user_id: string;
  status: string;
  emitter_name?: string;
  receiver_name?: string;
  document_date?: string;
  version: number;
  title?: string;
  file_path?: string;
}

// Datos mock temporales
const mockDocuments: Document[] = [
  {
    job_id: '1',
    document_type: 'invoice',
    upload_timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    user_id: 'mock-user',
    status: 'completed',
    emitter_name: 'Empresa ABC S.L.',
    receiver_name: 'Cliente XYZ',
    document_date: '2024-12-01',
    version: 1,
    title: 'Factura #001'
  },
  {
    job_id: '2',
    document_type: 'payslip',
    upload_timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    user_id: 'mock-user',
    status: 'processing',
    emitter_name: 'Recursos Humanos',
    receiver_name: 'Empleado DEF',
    document_date: '2024-11-30',
    version: 1,
    title: 'Nómina Noviembre 2024'
  },
  {
    job_id: '3',
    document_type: 'invoice',
    upload_timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    user_id: 'mock-user',
    status: 'error',
    emitter_name: 'Proveedor GHI',
    receiver_name: 'Mi Empresa',
    document_date: '2024-11-28',
    version: 1,
    title: 'Factura #002'
  }
];

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar documentos mock
  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simular carga asíncrona
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setDocuments(mockDocuments);
      console.log('📄 [DOCUMENTS] Documentos mock cargados:', mockDocuments.length);
      
    } catch (err) {
      console.error('❌ [DOCUMENTS] Error cargando documentos:', err);
      setError('Error cargando documentos');
    } finally {
      setLoading(false);
    }
  }, []);

  // Obtener documento por ID
  const getDocument = useCallback((jobId: string) => {
    return documents.find(doc => doc.job_id === jobId) || null;
  }, [documents]);

  // Filtrar documentos
  const filterDocuments = useCallback((filters: {
    status?: string;
    type?: string;
    search?: string;
  }) => {
    return documents.filter(doc => {
      if (filters.status && doc.status !== filters.status) return false;
      if (filters.type && doc.document_type !== filters.type) return false;
      if (filters.search) {
        const search = filters.search.toLowerCase();
        return (
          doc.title?.toLowerCase().includes(search) ||
          doc.emitter_name?.toLowerCase().includes(search) ||
          doc.receiver_name?.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [documents]);

  // Cargar documentos al montar el hook
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  return {
    documents,
    loading,
    error,
    loadDocuments,
    getDocument,
    filterDocuments,
    // Estadísticas
    totalDocuments: documents.length,
    completedDocuments: documents.filter(d => d.status === 'completed').length,
    processingDocuments: documents.filter(d => d.status === 'processing').length,
    errorDocuments: documents.filter(d => d.status === 'error').length
  };
}
