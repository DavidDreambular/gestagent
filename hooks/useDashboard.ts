// Hook para obtener estadísticas del dashboard
import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface DashboardStats {
  totalDocuments: number;
  pendingDocuments: number;
  totalAmount: number;
  totalTaxes: number;
  documentsTrend: number;
  pendingTrend: number;
  amountTrend: number;
  taxesTrend: number;
}

export interface DocumentTypeStats {
  name: string;
  value: number;
}

export interface DocumentStatusStats {
  name: string;
  value: number;
}

export interface RecentDocument {
  id: string;
  title: string;
  type: string;
  status: string;
  date: string;
  emitter: string;
  receiver: string;
  amount: number;
}

export interface DashboardData {
  stats: DashboardStats;
  documentTypes: DocumentTypeStats[];
  documentStatus: DocumentStatusStats[];
  recentDocuments: RecentDocument[];
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const supabase = createClientComponentClient<Database>();

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Obtener documentos del usuario
      const { data: documents, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id);

      if (docsError) throw docsError;

      // Calcular estadísticas
      const stats: DashboardStats = {
        totalDocuments: documents?.length || 0,
        pendingDocuments: documents?.filter(d => 
          d.status === 'UPLOADED' || d.status === 'PROCESSING'
        ).length || 0,
        totalAmount: 0,
        totalTaxes: 0,
        documentsTrend: 15, // Por ahora valores estáticos
        pendingTrend: -12,
        amountTrend: 22,
        taxesTrend: 18
      };

      // Calcular montos desde processed_json
      documents?.forEach(doc => {
        if (doc.processed_json?.totals) {
          stats.totalAmount += doc.processed_json.totals.total || 0;
          stats.totalTaxes += doc.processed_json.totals.total_taxes || 0;
        }
      });

      // Estadísticas por tipo de documento
      const typeMap = new Map<string, number>();
      documents?.forEach(doc => {
        const type = doc.document_type || 'otros';
        typeMap.set(type, (typeMap.get(type) || 0) + 1);
      });

      const documentTypes: DocumentTypeStats[] = Array.from(typeMap.entries()).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1) + 's',
        value
      }));

      // Estadísticas por estado
      const statusMap = new Map<string, number>();
      documents?.forEach(doc => {
        const status = doc.status || 'UNKNOWN';
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });

      const documentStatus: DocumentStatusStats[] = [
        { name: 'Validados', value: statusMap.get('PROCESSED') || 0 },
        { name: 'Procesando', value: statusMap.get('PROCESSING') || 0 },
        { name: 'Con errores', value: statusMap.get('ERROR') || 0 },
        { name: 'Pendientes', value: statusMap.get('UPLOADED') || 0 }
      ];

      // Documentos recientes (últimos 5)
      const recentDocuments: RecentDocument[] = (documents || [])
        .sort((a, b) => new Date(b.upload_timestamp).getTime() - new Date(a.upload_timestamp).getTime())
        .slice(0, 5)
        .map(doc => ({
          id: doc.job_id,
          title: doc.title || doc.file_name || `${doc.document_type} - ${doc.job_id.slice(0, 8)}`,
          type: doc.document_type,
          status: doc.status.toLowerCase(),
          date: doc.upload_timestamp,
          emitter: doc.emitter_name || doc.processed_json?.emitter?.name || 'Sin emisor',
          receiver: doc.receiver_name || doc.processed_json?.receiver?.name || 'Sin receptor',
          amount: doc.processed_json?.totals?.total || 0
        }));

      setData({
        stats,
        documentTypes,
        documentStatus,
        recentDocuments
      });

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  }, [user?.id, supabase]);

  // Suscripción a cambios en tiempo real
  useEffect(() => {
    if (!user?.id) return;

    // Cargar datos iniciales
    fetchDashboardData();

    // Suscribirse a cambios
    const channel = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Recargar datos cuando hay cambios
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, supabase, fetchDashboardData]);

  return {
    data,
    loading,
    error,
    refresh: fetchDashboardData
  };
}
