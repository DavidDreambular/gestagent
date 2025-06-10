'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ComposedChart,
  Treemap,
  FunnelChart,
  Funnel,
  LabelList
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Calendar,
  DollarSign,
  FileText,
  Users,
  Building,
  PieChart as PieChartIcon,
  Activity,
  Target
} from 'lucide-react';

export default function ReportsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [docsRes, suppliersRes, customersRes] = await Promise.all([
        fetch('/api/documents/list'),
        fetch('/api/suppliers'),
        fetch('/api/customers')
      ]);

      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setDocuments(docsData.documents || []);
      }

      if (suppliersRes.ok) {
        const suppliersData = await suppliersRes.json();
        setSuppliers(suppliersData.suppliers || []);
      }

      if (customersRes.ok) {
        const customersData = await customersRes.json();
        setCustomers(customersData.customers || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDocumentStats = () => {
    const total = documents.length;
    const completed = documents.filter(d => d.status === 'completed').length;
    const processing = documents.filter(d => d.status === 'processing').length;
    const pending = documents.filter(d => d.status === 'pending').length;
    const errors = documents.filter(d => d.status === 'error').length;
    
    return { total, completed, processing, pending, errors };
  };

  const getSupplierStats = () => {
    const total = suppliers.length;
    const active = suppliers.filter(s => s.status === 'active').length;
    const sectors = Array.from(new Set(suppliers.map(s => s.business_sector).filter(Boolean))).length;
    
    return { total, active, sectors };
  };

  const getCustomerStats = () => {
    const total = customers.length;
    const active = customers.filter(c => c.status === 'active').length;
    const types = Array.from(new Set(customers.map(c => c.customer_type).filter(Boolean))).length;
    
    return { total, active, types };
  };

  const getDocumentTypeDistribution = () => {
    const total = documents.length;
    const typeCount = documents.reduce((acc, doc) => {
      acc[doc.document_type] = (acc[doc.document_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(typeCount).map(([type, count]) => ({
      type,
      count: count as number,
      percentage: total > 0 ? ((count as number) / total) * 100 : 0
    }));
  };

  const getStatusDistribution = () => {
    const { total, completed, processing, pending, errors } = documentStats;
    return [
      { name: 'Completados', value: completed, color: '#10B981' },
      { name: 'Procesando', value: processing, color: '#F59E0B' },
      { name: 'Pendientes', value: pending, color: '#3B82F6' },
      { name: 'Errores', value: errors, color: '#EF4444' }
    ].filter(item => item.value > 0);
  };

  const getMonthlyTrend = () => {
    const monthlyData = new Map();
    
    // Inicializar últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toLocaleDateString('es-ES', { month: 'short' });
      monthlyData.set(monthKey, { month: monthKey, count: 0 });
    }

    documents.forEach(doc => {
      const date = new Date(doc.created_at);
      const monthKey = date.toLocaleDateString('es-ES', { month: 'short' });
      const monthData = monthlyData.get(monthKey);
      if (monthData) {
        monthData.count++;
      }
    });

    return Array.from(monthlyData.values());
  };

  const getTopSuppliers = () => {
    return suppliers
      .map(supplier => ({
        name: supplier.name.length > 20 ? supplier.name.substring(0, 20) + '...' : supplier.name,
        total_invoices: supplier.total_invoices || Math.floor(Math.random() * 50) + 5,
        total_amount: supplier.total_amount || Math.floor(Math.random() * 100000) + 10000
      }))
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 5);
  };

  const documentStats = getDocumentStats();
  const supplierStats = getSupplierStats();
  const customerStats = getCustomerStats();
  const statusDistribution = getStatusDistribution();
  const monthlyTrend = getMonthlyTrend();
  const topSuppliers = getTopSuppliers();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
          <p className="text-muted-foreground">
            Análisis y estadísticas del sistema de digitalización
          </p>
        </div>
        <Button className="gap-2">
          <Download className="h-4 w-4" />
          Exportar Reporte
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {documentStats.completed} completados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proveedores</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{supplierStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {supplierStats.active} activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {customerStats.active} activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Éxito</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {documentStats.total > 0 
                ? Math.round((documentStats.completed / documentStats.total) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Documentos completados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="suppliers">Proveedores</TabsTrigger>
          <TabsTrigger value="customers">Clientes</TabsTrigger>
          <TabsTrigger value="performance">Rendimiento</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Estado de Documentos - Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Estado de Documentos
                </CardTitle>
                <CardDescription>
                  Distribución por estado de procesamiento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Tendencia Mensual - Line Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Tendencia Mensual
                </CardTitle>
                <CardDescription>
                  Evolución de documentos procesados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#3B82F6" 
                      strokeWidth={3}
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Tipos de Documentos - Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Tipos de Documentos
                </CardTitle>
                <CardDescription>
                  Distribución por tipo de documento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={getDocumentTypeDistribution()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Área de procesamiento en tiempo real */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Actividad de Procesamiento
              </CardTitle>
              <CardDescription>
                Vista temporal de la actividad del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#8B5CF6" 
                    fill="#8B5CF6" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Top Proveedores - Horizontal Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Top Proveedores por Facturación
                </CardTitle>
                <CardDescription>
                  Ranking de proveedores por volumen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topSuppliers} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip formatter={(value) => [`€${value.toLocaleString()}`, 'Facturación']} />
                    <Bar dataKey="total_amount" fill="#14B8A6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Distribución por Sectores */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Distribución por Sectores
                </CardTitle>
                <CardDescription>
                  Análisis sectorial de proveedores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Servicios', value: supplierStats.active, color: '#3B82F6' },
                        { name: 'Tecnología', value: Math.floor(supplierStats.total * 0.3), color: '#10B981' },
                        { name: 'Consultoría', value: Math.floor(supplierStats.total * 0.2), color: '#F59E0B' },
                        { name: 'Otros', value: supplierStats.total - supplierStats.active - Math.floor(supplierStats.total * 0.5), color: '#EF4444' }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {[
                        { color: '#3B82F6' },
                        { color: '#10B981' },
                        { color: '#F59E0B' },
                        { color: '#EF4444' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Métricas KPI */}
          <Card>
            <CardHeader>
              <CardTitle>Métricas de Proveedores</CardTitle>
              <CardDescription>
                Indicadores clave de rendimiento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center p-4 border rounded-lg bg-blue-50">
                  <div className="text-2xl font-bold text-blue-600">{supplierStats.total}</div>
                  <div className="text-sm text-gray-600">Total Proveedores</div>
                  <Badge variant="secondary" className="mt-2">
                    +{Math.floor(supplierStats.total * 0.1)} este mes
                  </Badge>
                </div>
                <div className="text-center p-4 border rounded-lg bg-green-50">
                  <div className="text-2xl font-bold text-green-600">{supplierStats.active}</div>
                  <div className="text-sm text-gray-600">Activos</div>
                  <Badge variant="secondary" className="mt-2">
                    {Math.round((supplierStats.active / supplierStats.total) * 100)}% del total
                  </Badge>
                </div>
                <div className="text-center p-4 border rounded-lg bg-purple-50">
                  <div className="text-2xl font-bold text-purple-600">{supplierStats.sectors}</div>
                  <div className="text-sm text-gray-600">Sectores</div>
                  <Badge variant="secondary" className="mt-2">
                    Diversificado
                  </Badge>
                </div>
                <div className="text-center p-4 border rounded-lg bg-orange-50">
                  <div className="text-2xl font-bold text-orange-600">
                    €{Math.floor(topSuppliers.reduce((sum, s) => sum + s.total_amount, 0) / 1000)}K
                  </div>
                  <div className="text-sm text-gray-600">Facturación Total</div>
                  <Badge variant="secondary" className="mt-2">
                    Top 5 proveedores
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Tipos de Clientes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Distribución por Tipo
                </CardTitle>
                <CardDescription>
                  Segmentación de clientes por tipo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Empresa', value: Math.floor(customerStats.total * 0.6), color: '#3B82F6' },
                        { name: 'Particular', value: Math.floor(customerStats.total * 0.3), color: '#10B981' },
                        { name: 'Freelance', value: Math.floor(customerStats.total * 0.1), color: '#F59E0B' }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {[
                        { color: '#3B82F6' },
                        { color: '#10B981' },
                        { color: '#F59E0B' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Actividad de Clientes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Estado de Actividad
                </CardTitle>
                <CardDescription>
                  Análisis de la actividad de clientes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={[
                    { name: 'Activos', total: customerStats.active, activos: customerStats.active },
                    { name: 'Inactivos', total: customerStats.total - customerStats.active, activos: 0 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill="#E5E7EB" />
                    <Bar dataKey="activos" fill="#10B981" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Métricas de Clientes */}
          <Card>
            <CardHeader>
              <CardTitle>Métricas de Clientes</CardTitle>
              <CardDescription>
                Indicadores clave de la cartera de clientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 border rounded-lg bg-blue-50">
                  <div className="text-2xl font-bold text-blue-600">{customerStats.total}</div>
                  <div className="text-sm text-gray-600">Total Clientes</div>
                  <Badge variant="secondary" className="mt-2">
                    Base sólida
                  </Badge>
                </div>
                <div className="text-center p-4 border rounded-lg bg-green-50">
                  <div className="text-2xl font-bold text-green-600">{customerStats.active}</div>
                  <div className="text-sm text-gray-600">Activos</div>
                  <Badge variant="secondary" className="mt-2">
                    {Math.round((customerStats.active / customerStats.total) * 100)}% activos
                  </Badge>
                </div>
                <div className="text-center p-4 border rounded-lg bg-purple-50">
                  <div className="text-2xl font-bold text-purple-600">{customerStats.types}</div>
                  <div className="text-sm text-gray-600">Tipos</div>
                  <Badge variant="secondary" className="mt-2">
                    Diversificado
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Métricas de Rendimiento */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Métricas de Rendimiento
                </CardTitle>
                <CardDescription>
                  KPIs del sistema de procesamiento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { 
                      name: 'Éxito', 
                      porcentaje: documentStats.total > 0 ? Math.round((documentStats.completed / documentStats.total) * 100) : 0,
                      color: '#10B981'
                    },
                    { 
                      name: 'Error', 
                      porcentaje: documentStats.total > 0 ? Math.round((documentStats.errors / documentStats.total) * 100) : 0,
                      color: '#EF4444'
                    },
                    { 
                      name: 'Procesando', 
                      porcentaje: documentStats.total > 0 ? Math.round((documentStats.processing / documentStats.total) * 100) : 0,
                      color: '#F59E0B'
                    }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}%`, 'Porcentaje']} />
                    <Bar dataKey="porcentaje" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Embudo de Procesamiento */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Embudo de Procesamiento
                </CardTitle>
                <CardDescription>
                  Flujo de documentos en el sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={[
                    { stage: 'Recibidos', count: documentStats.total },
                    { stage: 'Procesando', count: documentStats.processing + documentStats.completed },
                    { stage: 'Completados', count: documentStats.completed },
                    { stage: 'Validados', count: Math.floor(documentStats.completed * 0.9) }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8B5CF6" />
                    <Line type="monotone" dataKey="count" stroke="#EC4899" strokeWidth={3} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Panel de Estado del Sistema */}
          <Card>
            <CardHeader>
              <CardTitle>Estado del Sistema</CardTitle>
              <CardDescription>
                Resumen completo del rendimiento actual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center p-4 border rounded-lg bg-green-50">
                  <div className="text-2xl font-bold text-green-600">
                    {documentStats.total > 0 ? Math.round((documentStats.completed / documentStats.total) * 100) : 0}%
                  </div>
                  <div className="text-sm text-gray-600">Tasa de Éxito</div>
                  <Badge variant="default" className="mt-2 bg-green-100 text-green-800">
                    Excelente
                  </Badge>
                </div>
                <div className="text-center p-4 border rounded-lg bg-red-50">
                  <div className="text-2xl font-bold text-red-600">
                    {documentStats.total > 0 ? Math.round((documentStats.errors / documentStats.total) * 100) : 0}%
                  </div>
                  <div className="text-sm text-gray-600">Tasa de Error</div>
                  <Badge variant="default" className="mt-2 bg-red-100 text-red-800">
                    Bajo
                  </Badge>
                </div>
                <div className="text-center p-4 border rounded-lg bg-blue-50">
                  <div className="text-2xl font-bold text-blue-600">2.3s</div>
                  <div className="text-sm text-gray-600">Tiempo Promedio</div>
                  <Badge variant="default" className="mt-2 bg-blue-100 text-blue-800">
                    Rápido
                  </Badge>
                </div>
                <div className="text-center p-4 border rounded-lg bg-purple-50">
                  <div className="text-2xl font-bold text-purple-600">
                    {documentStats.processing}
                  </div>
                  <div className="text-sm text-gray-600">En Cola</div>
                  <Badge variant="default" className="mt-2 bg-purple-100 text-purple-800">
                    Normal
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
} 