'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  FileText, 
  TrendingUp, 
  Calendar,
  DollarSign,
  Activity,
  Trash2,
  Edit,
  Download,
  Search,
  Eye
} from 'lucide-react';
import Link from 'next/link';

interface Customer {
  customer_id: string;
  name: string;
  nif_cif: string;
  address: string;
  postal_code: string;
  city: string;
  province: string;
  phone: string;
  email: string;
  website: string;
  customer_type: 'company' | 'individual' | 'freelancer' | 'public';
  status: 'active' | 'inactive' | 'suspended';
  payment_terms: number;
  notes: string;
  created_at: string;
  updated_at: string;
  // Campos de estadísticas
  total_invoices?: number;
  total_amount?: number;
  last_invoice_date?: string;
  activity_status?: 'high' | 'medium' | 'low';
  volume_category?: 'high' | 'medium' | 'low';
}

interface Document {
  job_id: string;
  document_type: string;
  status: string;
  emitter_name: string;
  receiver_name: string;
  document_date: string;
  upload_timestamp: string;
  total_amount?: number;
}

interface CustomerStats {
  total_documents: number;
  completed_documents: number;
  recent_documents: number;
  total_amount: number;
  average_amount: number;
  last_30_days: {
    documents: number;
    amount: number;
  };
  last_90_days: {
    documents: number;
    amount: number;
  };
}

export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    fetchCustomerData();
  }, [customerId]);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      
      // Fetch customer data
      const customerResponse = await fetch(`/api/customers/${customerId}`);
      if (customerResponse.ok) {
        const responseData = await customerResponse.json();
        const customerData = responseData.data || responseData;
        setCustomer(customerData.customer);
        setDocuments(customerData.documents || []);
        setStats(customerData.statistics);
      } else {
        console.error('Error fetching customer data');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customer) return;
    
    const hasDocuments = documents.length > 0;
    const confirmMessage = hasDocuments 
      ? `¿Estás seguro de que quieres eliminar este cliente? Tiene ${documents.length} documentos asociados. Se realizará una eliminación lógica.`
      : '¿Estás seguro de que quieres eliminar este cliente permanentemente?';
    
    if (!confirm(confirmMessage)) return;

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        alert('Cliente eliminado exitosamente');
        router.push('/dashboard/customers');
      } else {
        const errorData = await response.json();
        alert(`Error al eliminar el cliente: ${errorData.message || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Error de conexión al eliminar el cliente');
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este documento?')) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/delete/${documentId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        const result = await response.json();
        setDocuments(documents.filter(doc => doc.job_id !== documentId));
        alert(`Documento eliminado exitosamente (${result.deleteType === 'hard' ? 'permanente' : 'marcado como eliminado'})`);
        // Refrescar estadísticas
        fetchCustomerData();
      } else {
        const errorData = await response.json();
        alert(`Error al eliminar el documento: ${errorData.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Error al eliminar el documento');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      'completed': 'bg-green-100 text-green-800',
      'processing': 'bg-yellow-100 text-yellow-800',
      'error': 'bg-red-100 text-red-800'
    };
    
    return (
      <Badge className={colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {status === 'completed' ? 'Completado' : 
         status === 'processing' ? 'Procesando' : 
         status === 'error' ? 'Error' : 'Pendiente'}
      </Badge>
    );
  };

  const getTypeLabel = (type: string) => {
    const types = {
      'company': 'Empresa',
      'individual': 'Individual',
      'freelancer': 'Autónomo',
      'public': 'Público'
    };
    return types[type as keyof typeof types] || type;
  };

  const getActivityBadge = (activity: string) => {
    const colors = {
      'high': 'bg-green-100 text-green-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'low': 'bg-red-100 text-red-800'
    };
    
    const labels = {
      'high': 'Alta',
      'medium': 'Media',
      'low': 'Baja'
    };
    
    return (
      <Badge className={colors[activity as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {labels[activity as keyof typeof labels] || activity}
      </Badge>
    );
  };

  const filteredDocuments = documents.filter(doc =>
    doc.job_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.emitter_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.receiver_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Cargando información del cliente...</div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">Cliente no encontrado</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header con navegación */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{customer.name}</h1>
            <p className="text-muted-foreground">
              {customer.nif_cif} • {getTypeLabel(customer.customer_type)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
            {customer.status === 'active' ? 'Activo' : 
             customer.status === 'inactive' ? 'Inactivo' : 'Suspendido'}
          </Badge>
          {customer.activity_status && getActivityBadge(customer.activity_status)}
        </div>
      </div>

      {/* Dashboard de métricas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Documentos</p>
                  <p className="text-2xl font-bold">{stats.total_documents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Facturación Total</p>
                  <p className="text-2xl font-bold">€{stats.total_amount.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Promedio</p>
                  <p className="text-2xl font-bold">€{stats.average_amount.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Últimos 30 días</p>
                  <p className="text-2xl font-bold">{stats.last_30_days.documents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contenido principal con pestañas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="info">Información General</TabsTrigger>
          <TabsTrigger value="documents">Documentos ({documents.length})</TabsTrigger>
          <TabsTrigger value="analytics">Análisis</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
        </TabsList>

        {/* Pestaña: Información General */}
        <TabsContent value="info" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5" />
                  <span>Datos de la Empresa</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nombre</label>
                  <p className="text-lg">{customer.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">NIF/CIF</label>
                  <p>{customer.nif_cif}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tipo de Cliente</label>
                  <p>{getTypeLabel(customer.customer_type)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Términos de Pago</label>
                  <p>{customer.payment_terms} días</p>
                </div>
                {customer.notes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Notas</label>
                    <p className="text-sm">{customer.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5" />
                  <span>Información de Contacto</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Dirección</label>
                  <p>{customer.address}</p>
                  <p>{customer.postal_code} {customer.city}, {customer.province}</p>
                </div>
                {customer.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.email}</span>
                  </div>
                )}
                {customer.website && (
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a href={customer.website} target="_blank" rel="noopener noreferrer" 
                       className="text-blue-600 hover:underline">
                      {customer.website}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pestaña: Documentos */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Documentos Relacionados</CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar documentos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredDocuments.length > 0 ? (
                <div className="space-y-4">
                  {filteredDocuments.map((doc) => (
                    <Card key={doc.job_id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-blue-600" />
                              <Link 
                                href={`/dashboard/documents/${doc.job_id}`}
                                className="font-medium hover:underline"
                              >
                                {doc.job_id}
                              </Link>
                              <Badge variant="outline">{doc.document_type}</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <span>Emisor: {doc.emitter_name}</span>
                              <span className="mx-2">•</span>
                              <span>Receptor: {doc.receiver_name}</span>
                              {doc.total_amount && (
                                <>
                                  <span className="mx-2">•</span>
                                  <span>€{doc.total_amount.toLocaleString()}</span>
                                </>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Fecha: {new Date(doc.document_date).toLocaleDateString()} • 
                              Subido: {new Date(doc.upload_timestamp).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            {getStatusBadge(doc.status)}
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/dashboard/documents/${doc.job_id}`}>
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                              </Link>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteDocument(doc.job_id)}
                              className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="hidden sm:inline">Eliminar</span>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No hay documentos relacionados con este cliente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestaña: Análisis */}
        <TabsContent value="analytics" className="space-y-4">
          {stats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Estadísticas por Período</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Últimos 30 días</span>
                      <span className="font-medium">{stats.last_30_days.documents} docs • €{stats.last_30_days.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Últimos 90 días</span>
                      <span className="font-medium">{stats.last_90_days.documents} docs • €{stats.last_90_days.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total histórico</span>
                      <span className="font-medium">{stats.total_documents} docs • €{stats.total_amount.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Información Adicional</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Documentos completados</span>
                      <span className="font-medium">{stats.completed_documents}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Documentos recientes</span>
                      <span className="font-medium">{stats.recent_documents}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Importe promedio</span>
                      <span className="font-medium">€{stats.average_amount.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Pestaña: Configuración */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Acciones del Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="outline" className="flex-1">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Cliente
                </Button>
                <Button variant="outline" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Datos
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteCustomer}
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Cliente
                </Button>
              </div>
              
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">
                  Cliente creado: {new Date(customer.created_at).toLocaleDateString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Última actualización: {new Date(customer.updated_at).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 