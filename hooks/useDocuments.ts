// Hook para gestión de documentos - Versión con PostgreSQL
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

// Los documentos se cargarán desde la API

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar documentos desde la API
  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/documents');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.documents) {
          setDocuments(data.documents);
          console.log('📄 [DOCUMENTS] Documentos cargados desde la API:', data.documents.length);
        }
      } else {
        throw new Error('Error al cargar documentos');
      }
      
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
