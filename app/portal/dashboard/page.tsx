'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  Upload, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Calendar,
  Bell,
  Eye,
  Download,
  Settings
} from 'lucide-react';
import NotificationsPanel from './components/NotificationsPanel';

interface DashboardStats {
  totalDocuments: number;
  pendingDocuments: number;
  completedDocuments: number;
  monthlyUploads: number;
}

interface Document {
  job_id: string;
  document_type: string;
  title: string;
  status: string;
  upload_timestamp: string;
  processed_json: any;
}

export default function PortalDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    pendingDocuments: 0,
    completedDocuments: 0,
    monthlyUploads: 0
  });
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos del dashboard
  const loadDashboardData = async () => {
    try {
      // Verificar autenticación primero
      const authResponse = await fetch('/api/portal/auth/profile', {
        credentials: 'include'
      });

      if (!authResponse.ok) {
        router.push('/portal/login');
        return;
      }

      // Cargar estadísticas
      const statsResponse = await fetch('/api/portal/documents/stats', {
        credentials: 'include'
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats({
          totalDocuments: statsData.total || 0,
          pendingDocuments: statsData.pending || 0,
          completedDocuments: statsData.processed || 0,
          monthlyUploads: statsData.monthly || 0
        });
      }

      // Cargar documentos recientes
      const docsResponse = await fetch('/api/portal/documents?limit=5', {
        credentials: 'include'
      });

      if (docsResponse.ok) {
        const docsData = await docsResponse.json();
        setRecentDocuments(docsData.documents || []);
      }

    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
      setError('Error cargando datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Obtener color del estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'processing':
        return 'text-blue-600 bg-blue-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Traducir estado
  const translateStatus = (status: string) => {
    const translations: Record<string, string> = {
      pending: 'Pendiente',
      processing: 'Procesando',
      completed: 'Completado',
      error: 'Error',
      received: 'Recibido'
    };
    return translations[status] || status;
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadDashboardData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Portal de Proveedores - GestAgent</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <NotificationsPanel compact />
              <button
                onClick={() => router.push('/portal/upload')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>Subir Documento</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Documentos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalDocuments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingDocuments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completados</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedDocuments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Este Mes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.monthlyUploads}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Documentos Recientes */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Documentos Recientes
                  </h2>
                  <button
                    onClick={() => router.push('/portal/documents')}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Ver todos
                  </button>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {recentDocuments.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No hay documentos recientes</p>
                    <button
                      onClick={() => router.push('/portal/upload')}
                      className="mt-4 text-blue-600 hover:text-blue-700"
                    >
                      Subir primer documento
                    </button>
                  </div>
                ) : (
                  recentDocuments.map((doc) => (
                    <div key={doc.job_id} className="p-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <FileText className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">
                              {doc.title}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {formatDate(doc.upload_timestamp)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(doc.status)}`}>
                            {translateStatus(doc.status)}
                          </span>
                          <button
                            onClick={() => router.push(`/portal/documents/${doc.job_id}`)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Panel de Notificaciones */}
          <div className="lg:col-span-1">
            <NotificationsPanel />
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Acciones Rápidas
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => router.push('/portal/upload')}
                className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Upload className="w-6 h-6 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Subir Documento</p>
                  <p className="text-sm text-gray-500">Nuevo PDF</p>
                </div>
              </button>

              <button
                onClick={() => router.push('/portal/documents')}
                className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FileText className="w-6 h-6 text-green-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Ver Documentos</p>
                  <p className="text-sm text-gray-500">Historial completo</p>
                </div>
              </button>

              <button
                onClick={() => router.push('/portal/settings')}
                className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-6 h-6 text-purple-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Configuración</p>
                  <p className="text-sm text-gray-500">Preferencias y notificaciones</p>
                </div>
              </button>

              <button
                onClick={() => router.push('/portal/help')}
                className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <AlertCircle className="w-6 h-6 text-orange-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Ayuda</p>
                  <p className="text-sm text-gray-500">Soporte técnico</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
