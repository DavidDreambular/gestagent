'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft,
  Building2, 
  MapPin,
  Phone,
  Mail,
  Globe,
  FileText,
  Edit,
  Trash2,
  Download,
  TrendingUp,
  Activity,
  Calendar,
  Euro,
  BarChart3,
  Users,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

interface Supplier {
  supplier_id: string;
  name: string;
  commercial_name?: string;
  nif_cif: string;
  address?: string;
  postal_code?: string;
  city?: string;
  province?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  business_sector?: string;
  company_size?: string;
  status: string;
  payment_terms?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  formatted_address: string;
  contact_info: {
    phone?: string;
    email?: string;
    website?: string;
  };
}

interface Document {
  job_id: string;
  document_type: string;
  status: string;
  upload_timestamp: string;
  document_date?: string;
  total_amount?: number;
  emitter_name?: string;
  receiver_name?: string;
}

interface Statistics {
  total_documents: number;
  completed_documents: number;
  recent_documents: number;
  documents_last_90_days: number;
  total_amount: number;
  total_amount_last_90_days: number;
  average_document_amount: number;
  last_activity?: string;
  activity_status: string;
  volume_category: string;
}

interface SupplierDetailData {
  supplier: Supplier;
  documents: Document[];
  statistics: Statistics;
}

export default function SupplierDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<SupplierDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (id) {
      fetchSupplierDetail();
    }
  }, [id]);

  const fetchSupplierDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/suppliers/${id}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Error al cargar el proveedor');
      }
    } catch (err) {
      console.error('Error fetching supplier detail:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSupplier = async () => {
    if (!data?.supplier) return;

    if (!confirm(`¿Estás seguro de que quieres eliminar al proveedor "${data.supplier.name}"?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/suppliers/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message);
        router.push('/dashboard/suppliers');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting supplier:', error);
      alert('Error de conexión al eliminar el proveedor');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: { variant: 'default', label: 'Activo', icon: CheckCircle },
      inactive: { variant: 'secondary', label: 'Inactivo', icon: AlertCircle },
      pending: { variant: 'outline', label: 'Pendiente', icon: Clock }
    } as const;

    const config = variants[status as keyof typeof variants] || variants.active;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getActivityBadge = (activity: string) => {
    const variants = {
      reciente: { variant: 'default', label: 'Actividad Reciente', color: 'bg-green-100 text-green-800' },
      activo: { variant: 'secondary', label: 'Activo', color: 'bg-blue-100 text-blue-800' },
      inactivo: { variant: 'destructive', label: 'Inactivo', color: 'bg-gray-100 text-gray-800' }
    } as const;

    const config = variants[activity as keyof typeof variants] || variants.inactivo;

    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getVolumeBadge = (volume: string) => {
    const colors = {
      alto: 'bg-green-100 text-green-800 border-green-200',
      medio: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      bajo: 'bg-gray-100 text-gray-800 border-gray-200'
    } as const;

    return (
      <Badge className={colors[volume as keyof typeof colors] || colors.bajo}>
        Volumen {volume}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Sin datos';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatShortDate = (dateString?: string) => {
    if (!dateString) return 'Sin datos';
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando proveedor...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error al cargar proveedor</h3>
            <p className="text-muted-foreground text-center mb-4">
              {error || 'No se pudo cargar la información del proveedor'}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <Button onClick={fetchSupplierDetail}>
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { supplier, documents, statistics } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{supplier.name}</h1>
            {supplier.commercial_name && (
              <p className="text-lg text-muted-foreground">{supplier.commercial_name}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              {getStatusBadge(supplier.status)}
              {getActivityBadge(statistics.activity_status)}
              {getVolumeBadge(statistics.volume_category)}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button variant="destructive" onClick={handleDeleteSupplier}>
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
          </Button>
        </div>
      </div>

      {/* Estadísticas principales */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.total_documents}</div>
            <p className="text-xs text-muted-foreground">
              {statistics.completed_documents} completados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturación Total</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(statistics.total_amount)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(statistics.total_amount_last_90_days)} últimos 90 días
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio por Documento</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(statistics.average_document_amount)}</div>
            <p className="text-xs text-muted-foreground">
              por documento procesado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actividad Reciente</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.recent_documents}</div>
            <p className="text-xs text-muted-foreground">
              últimos 30 días
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contenido con tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Información General</TabsTrigger>
          <TabsTrigger value="documents">Documentos ({documents?.length || 0})</TabsTrigger>
          <TabsTrigger value="analytics">Análisis</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
        </TabsList>

        {/* Tab: Información General */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Información básica */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Información Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nombre Fiscal</label>
                  <p className="text-sm">{supplier.name}</p>
                </div>
                
                {supplier.commercial_name && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Nombre Comercial</label>
                    <p className="text-sm">{supplier.commercial_name}</p>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">NIF/CIF</label>
                  <p className="text-sm font-mono">{supplier.nif_cif}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Sector</label>
                  <p className="text-sm">{supplier.business_sector || 'No especificado'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tamaño Empresa</label>
                  <p className="text-sm capitalize">{supplier.company_size || 'No especificado'}</p>
                </div>
                
                {supplier.payment_terms && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Condiciones de Pago</label>
                    <p className="text-sm">{supplier.payment_terms} días</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Información de contacto */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Información de Contacto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {supplier.formatted_address && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Dirección</label>
                    <p className="text-sm">{supplier.formatted_address}</p>
                  </div>
                )}
                
                {supplier.phone && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Teléfono</label>
                    <p className="text-sm">{supplier.phone}</p>
                  </div>
                )}
                
                {supplier.email && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <a href={`mailto:${supplier.email}`} className="text-sm text-blue-600 hover:underline">
                      {supplier.email}
                    </a>
                  </div>
                )}
                
                {supplier.website && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Sitio Web</label>
                    <a 
                      href={supplier.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {supplier.website}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Notas */}
          {supplier.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{supplier.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Documentos */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Documentos</CardTitle>
              <CardDescription>
                Todos los documentos procesados para este proveedor
              </CardDescription>
            </CardHeader>
            <CardContent>
              {documents && documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.job_id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {doc.document_type} - {doc.emitter_name || 'Sin emisor'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatShortDate(doc.document_date)} • {formatCurrency(doc.total_amount || 0)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={doc.status === 'completed' ? 'default' : 'secondary'}>
                          {doc.status === 'completed' ? 'Completado' : doc.status}
                        </Badge>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/documents/${doc.job_id}`}>
                            Ver
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay documentos para este proveedor</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Análisis */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Actividad por Período</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Últimos 30 días</span>
                    <span className="text-sm font-medium">{statistics.recent_documents} documentos</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Últimos 90 días</span>
                    <span className="text-sm font-medium">{statistics.documents_last_90_days} documentos</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Total histórico</span>
                    <span className="text-sm font-medium">{statistics.total_documents} documentos</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Facturación por Período</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Últimos 90 días</span>
                    <span className="text-sm font-medium">{formatCurrency(statistics.total_amount_last_90_days)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Total histórico</span>
                    <span className="text-sm font-medium">{formatCurrency(statistics.total_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Promedio por documento</span>
                    <span className="text-sm font-medium">{formatCurrency(statistics.average_document_amount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Información de Registro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Fecha de Registro</label>
                  <p className="text-sm">{formatDate(supplier.created_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Última Actualización</label>
                  <p className="text-sm">{formatDate(supplier.updated_at)}</p>
                </div>
                {statistics.last_activity && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Última Actividad</label>
                    <p className="text-sm">{formatDate(statistics.last_activity)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Configuración */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuración del Proveedor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Editar Información</p>
                  <p className="text-sm text-muted-foreground">Modificar datos básicos del proveedor</p>
                </div>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Exportar Datos</p>
                  <p className="text-sm text-muted-foreground">Descargar información y documentos</p>
                </div>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50">
                <div>
                  <p className="font-medium text-red-900">Eliminar Proveedor</p>
                  <p className="text-sm text-red-700">Esta acción no se puede deshacer</p>
                </div>
                <Button variant="destructive" onClick={handleDeleteSupplier}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 