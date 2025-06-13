// Hook para datos del dashboard - Versión con PostgreSQL
'use client';

import { useState, useEffect, useCallback } from 'react';

export interface DashboardStats {
  totalDocuments: number;
  completedDocuments: number;
  processingDocuments: number;
  errorDocuments: number;
  recentDocuments: number;
  successRate: number;
  avgProcessingTime: number;
  documentsThisMonth: number;
  documentsLastMonth: number;
  growthRate: number;
}

export interface RecentActivity {
  id: string;
  type: 'document_uploaded' | 'document_processed' | 'document_error' | 'user_login';
  title: string;
  description: string;
  timestamp: string;
  user?: string;
}

// Los datos se cargarán desde la API
  {
    id: '1',
    type: 'document_processed',
    title: 'Factura procesada',
    description: 'Factura de Empresa ABC S.L. procesada exitosamente',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    user: 'admin'
  },
  {
    id: '2',
    type: 'document_uploaded',
    title: 'Documento subido',
    description: 'Nueva nómina subida al sistema',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    user: 'operador'
  },
  {
    id: '3',
    type: 'document_error',
    title: 'Error en procesamiento',
    description: 'Error al procesar factura - formato no reconocido',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    user: 'admin'
  },
  {
    id: '4',
    type: 'user_login',
    title: 'Inicio de sesión',
    description: 'Usuario admin inició sesión',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    user: 'admin'
  },
  {
    id: '5',
    type: 'document_processed',
    title: 'Lote procesado',
    description: '5 documentos procesados en lote',
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    user: 'admin'
  }
];

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar estadísticas del dashboard
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📊 [DASHBOARD] Cargando datos del dashboard...');
      
      const response = await fetch('/api/dashboard/stats');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setStats(data.data);
          console.log('✅ [DASHBOARD] Datos cargados exitosamente');
        }
      } else {
        throw new Error('Error al cargar estadísticas');
      }
      
    } catch (err) {
      console.error('❌ [DASHBOARD] Error cargando datos:', err);
      setError('Error cargando datos del dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  // Obtener estadísticas por período
  const getStatsByPeriod = useCallback((period: 'today' | 'week' | 'month' | 'year') => {
    // Mock data basado en el período
    const multipliers = {
      today: 0.1,
      week: 0.3,
      month: 1,
      year: 12
    };
    
    const multiplier = multipliers[period];
    
    return {
      documents: Math.round((stats?.totalDocuments || 0) * multiplier),
      processed: Math.round((stats?.completedDocuments || 0) * multiplier),
      errors: Math.round((stats?.errorDocuments || 0) * multiplier),
      successRate: stats?.successRate || 0
    };
  }, []);

  // Obtener datos para gráficos
  const getChartData = useCallback((type: 'documents' | 'processing_time' | 'success_rate') => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    switch (type) {
      case 'documents':
        return last7Days.map(date => ({
          date,
          value: Math.floor(Math.random() * 20) + 5
        }));
      
      case 'processing_time':
        return last7Days.map(date => ({
          date,
          value: Math.random() * 2 + 1.5
        }));
      
      case 'success_rate':
        return last7Days.map(date => ({
          date,
          value: Math.random() * 10 + 85
        }));
      
      default:
        return [];
    }
  }, []);

  // Cargar datos al montar el hook
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return {
    stats,
    recentActivity,
    loading,
    error,
    loadDashboardData,
    getStatsByPeriod,
    getChartData,
    // Funciones de utilidad
    isLoading: loading,
    hasError: !!error,
    isEmpty: !stats && !loading
  };
}
