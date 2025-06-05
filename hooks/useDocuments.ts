// Hook personalizado para gestionar documentos con Supabase
import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface Document {
  job_id: string;
  document_type: string;
  file_name?: string;
  status: 'UPLOADED' | 'PROCESSING' | 'PROCESSED' | 'ERROR' | 'DELETED';
  upload_timestamp: string;
  user_id: string;
  processed_json?: any;
  metadata?: any;
  emitter_name?: string;
  receiver_name?: string;
  document_date?: string;
  title?: string;
  version: number;
}

interface UseDocumentsOptions {
  status?: string;
  documentType?: string;
  limit?: number;
  offset?: number;
  realtime?: boolean;
}

export interface UseDocumentsReturn {
  documents: Document[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  refresh: () => Promise<void>;
  uploadDocument: (file: File, documentType: string) => Promise<string | null>;
  updateDocument: (jobId: string, data: Partial<Document>) => Promise<boolean>;
  deleteDocument: (jobId: string) => Promise<boolean>;
}

export function useDocuments(options: UseDocumentsOptions = {}): UseDocumentsReturn {
  const { 
    status, 
    documentType, 
    limit = 20, 
    offset = 0,
    realtime = true 
  } = options;
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  
  const { user } = useAuth();
  const supabase = createClientComponentClient<Database>();

  // Función para cargar documentos usando el nuevo endpoint
  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[useDocuments] Cargando documentos...');

      // Construir URL con parámetros
      const params = new URLSearchParams();
      if (status && status !== 'all') params.append('status', status);
      if (documentType && documentType !== 'all') params.append('type', documentType);
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const response = await fetch(`/api/documents/list?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al cargar documentos');
      }

      console.log(`[useDocuments] Cargados ${data.documents.length} documentos`);

      setDocuments(data.documents || []);
      setTotalCount(data.pagination.total || 0);
    } catch (err) {
      console.error('[useDocuments] Error:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar documentos');
    } finally {
      setLoading(false);
    }
  }, [status, documentType, limit, offset]);

  // Configurar realtime si está habilitado
  useEffect(() => {
    if (realtime) {
      const channel = supabase
        .channel('documents-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'documents'
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            console.log('[useDocuments] Cambio en tiempo real:', payload);
            // Recargar documentos cuando hay cambios
            fetchDocuments();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [realtime, fetchDocuments, supabase]);

  // Cargar documentos al montar el componente o cambiar parámetros
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Función para refrescar manualmente
  const refresh = useCallback(async () => {
    await fetchDocuments();
  }, [fetchDocuments]);

  // Función para subir documento
  const uploadDocument = useCallback(async (file: File, documentType: string): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error al subir documento');
      }

      const data = await response.json();
      
      // Refrescar la lista después de subir
      await fetchDocuments();
      
      return data.jobId;
    } catch (err) {
      console.error('[useDocuments] Error al subir:', err);
      return null;
    }
  }, [fetchDocuments]);

  // Función para actualizar documento
  const updateDocument = useCallback(async (jobId: string, data: Partial<Document>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('documents')
        .update(data)
        .eq('job_id', jobId);

      if (error) throw error;

      // Refrescar la lista después de actualizar
      await fetchDocuments();
      
      return true;
    } catch (err) {
      console.error('[useDocuments] Error al actualizar:', err);
      return false;
    }
  }, [supabase, fetchDocuments]);

  // Función para eliminar documento
  const deleteDocument = useCallback(async (jobId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('job_id', jobId);

      if (error) throw error;

      // Refrescar la lista después de eliminar
      await fetchDocuments();
      
      return true;
    } catch (err) {
      console.error('[useDocuments] Error al eliminar:', err);
      return false;
    }
  }, [supabase, fetchDocuments]);

  return {
    documents,
    loading,
    error,
    totalCount,
    refresh,
    uploadDocument,
    updateDocument,
    deleteDocument,
  };
}
