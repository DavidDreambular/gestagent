// app/dashboard/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Upload, 
  TrendingUp, 
  CheckCircle, 
  Calendar, 
  ArrowRight,
  Building2,
  Users,
  AlertCircle
} from 'lucide-react';

interface DocumentSummary {
  jobId: string;
  documentType: string;
  status: string;
  uploadTimestamp: string;
  extractedData?: any;
}

export default function DashboardPage() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [suppliersStats, setSuppliersStats] = useState<any>(null);
  const [customersStats, setCustomersStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDocuments: 0,
    processedToday: 0,
    activeSuppliers: 0,
    activeCustomers: 0,
    successRate: 95.4
  });

  // Función para cargar documentos
  const loadDocuments = async () => {
    try {
      const response = await fetch('/api/documents/list');
      if (response.ok) {
        const data = await response.json();
        const formattedDocs = data.documents?.map((doc: any) => ({
          jobId: doc.jobId || doc.job_id,
          documentType: doc.documentType || doc.document_type || 'factura',
          status: doc.status || 'completed',
          uploadTimestamp: doc.uploadTimestamp || doc.upload_timestamp,
          extractedData: doc.extractedData || doc.processed_json
        })) || [];
        
        setDocuments(formattedDocs);
        // No sobrescribir las estadísticas consolidadas
        // setStats se maneja en loadDashboardStats()
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      // Fallback a datos de ejemplo
      const exampleDocs: DocumentSummary[] = [
        {
          jobId: '01cf534e-540b-4889-8763-dc54ca21b752',
          documentType: 'factura',
          status: 'processed',
          uploadTimestamp: new Date().toISOString(),
          extractedData: { detected_invoices: ['CL01250005749', '004116', 'SP001/2025'] }
        },
        {
          jobId: 'd896bdf7-966f-4fd3-89bb-b68aa538ae08',
          documentType: 'factura', 
          status: 'processed',
          uploadTimestamp: new Date(Date.now() - 3600000).toISOString(),
          extractedData: { detected_invoices: ['D8000389', 'ESSJUBJIAEUS'] }
        }
      ];

      setDocuments(exampleDocs);
      // No sobrescribir las estadísticas consolidadas en el fallback
      // Las estadísticas se manejan en loadDashboardStats()
    }
  };

  // Función para cargar estadísticas de suppliers
  const loadSuppliersStats = async () => {
    try {
      const response = await fetch('/api/suppliers');
      if (response.ok) {
        const data = await response.json();
        setSuppliersStats(data.data.metadata);
      }
    } catch (error) {
      console.error('Error loading suppliers stats:', error);
    }
  };

  // Función para cargar estadísticas de customers
  const loadCustomersStats = async () => {
    try {
      const response = await fetch('/api/customers');
      if (response.ok) {
        const data = await response.json();
        setCustomersStats(data.data.metadata);
      }
    } catch (error) {
      console.error('Error loading customers stats:', error);
    }
  };

  // Función para cargar estadísticas consolidadas del dashboard
  const loadDashboardStats = async () => {
    try {
      console.log('🔄 [Dashboard] Cargando estadísticas consolidadas...');
      const response = await fetch('/api/dashboard/stats');
      console.log('📡 [Dashboard] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ [Dashboard] Datos recibidos:', data);
        
        setStats(prev => ({
          ...prev,
          totalDocuments: data.data.totalDocuments,
          processedToday: data.data.processedToday,
          activeSuppliers: data.data.activeSuppliers,
          activeCustomers: data.data.activeCustomers,
          successRate: parseFloat(data.data.successRate)
        }));
        
        console.log('📊 [Dashboard] Estadísticas actualizadas');
      } else {
        console.error('❌ [Dashboard] Error en respuesta:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ [Dashboard] Error loading dashboard stats:', error);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    const loadInitialData = async () => {
      await loadDocuments();
      await loadDashboardStats(); // Cargar después para evitar sobrescritura
    };
    loadInitialData();
  }, []);

  // Cargar datos periódicamente
  useEffect(() => {
    const loadAllData = async () => {
      await Promise.all([
        loadSuppliersStats(),
        loadCustomersStats(),
        loadDashboardStats()
      ]);
      setLoading(false);
    };

    loadAllData();

    // Actualizar cada 30 segundos
    const interval = setInterval(loadAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'processed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Procesado</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-100 text-yellow-800">Procesando</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Sistema de digitalización de documentos financieros - Gestión integrada de proveedores y clientes
        </p>
      </div>

      {/* Tarjetas de estadísticas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Documentos
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">
              Documentos procesados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Procesados Hoy
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.processedToday}</div>
            <p className="text-xs text-muted-foreground">
              Documentos de hoy
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Proveedores Activos
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.activeSuppliers}
            </div>
            <p className="text-xs text-muted-foreground">
              Proveedores registrados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Clientes Activos
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.activeCustomers}
            </div>
            <p className="text-xs text-muted-foreground">
              Clientes registrados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Nueva sección: Estadísticas de Relaciones Comerciales */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Proveedores
            </CardTitle>
            <CardDescription>
              Estadísticas de proveedores extraídos automáticamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Activos:</span>
                  <span className="font-semibold">{suppliersStats?.total_active || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Sectores:</span>
                  <span className="font-semibold">{suppliersStats?.available_sectors?.length || 0}</span>
                </div>
                {suppliersStats?.available_sectors && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-500 mb-1">Sectores principales:</div>
                    <div className="flex flex-wrap gap-1">
                      {suppliersStats.available_sectors.slice(0, 3).map((sector: string) => (
                        <Badge key={sector} variant="secondary" className="text-xs">
                          {sector}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link href="/dashboard/suppliers">
                    Ver Todos los Proveedores
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Clientes
            </CardTitle>
            <CardDescription>
              Estadísticas de clientes extraídos automáticamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Activos:</span>
                  <span className="font-semibold">{customersStats?.total_active || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Tipos:</span>
                  <span className="font-semibold">{customersStats?.available_customer_types?.length || 0}</span>
                </div>
                {customersStats?.available_customer_types && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-500 mb-1">Tipos principales:</div>
                    <div className="flex flex-wrap gap-1">
                      {customersStats.available_customer_types.slice(0, 3).map((type: string) => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link href="/dashboard/customers">
                    Ver Todos los Clientes
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lista de documentos recientes */}
      <Card>
        <CardHeader>
          <CardTitle>Documentos Recientes</CardTitle>
          <CardDescription>
            Los documentos procesados más recientemente con enlaces a proveedores y clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay documentos</h3>
              <p className="text-gray-600 mb-4">Sube tu primer documento para empezar</p>
              <Button asChild>
                <Link href="/dashboard/documents/new">
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Documento
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.slice(0, 5).map((doc) => (
                <div
                  key={doc.jobId}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-100 rounded-md">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">
                        {doc.documentType.charAt(0).toUpperCase() + doc.documentType.slice(1)}
                      </h4>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(doc.uploadTimestamp)}</span>
                      </div>
                      {doc.extractedData?.detected_invoices && (
                        <p className="text-xs text-gray-500 mt-1">
                          {doc.extractedData.detected_invoices.length} facturas detectadas
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(doc.status)}
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/dashboard/documents/${doc.jobId}`}>
                        Ver detalles
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
              {documents.length > 5 && (
                <div className="text-center pt-4">
                  <Button asChild variant="outline">
                    <Link href="/dashboard/documents">
                      Ver todos los documentos ({documents.length})
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Acciones rápidas mejoradas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-base">Subir Documentos</CardTitle>
            <CardDescription>
              Procesa nuevos PDFs con Mistral Document Understanding
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/dashboard/documents/new">
                <Upload className="h-4 w-4 mr-2" />
                Nuevo Upload
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-base">Gestionar Proveedores</CardTitle>
            <CardDescription>
              Administra proveedores extraídos automáticamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/suppliers">
                <Building2 className="h-4 w-4 mr-2" />
                Ver Proveedores
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-base">Gestionar Clientes</CardTitle>
            <CardDescription>
              Administra clientes extraídos automáticamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/customers">
                <Users className="h-4 w-4 mr-2" />
                Ver Clientes
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
