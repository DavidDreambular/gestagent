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
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
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
  const [entityMatchingStats, setEntityMatchingStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [docsRes, suppliersRes, customersRes] = await Promise.all([
        fetch('/api/documents/list?limit=1000'), // Obtener más documentos para análisis
        fetch('/api/suppliers?limit=1000'),
        fetch('/api/customers?limit=1000')
      ]);

      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setDocuments(docsData.documents || []);
      }

      if (suppliersRes.ok) {
        const suppliersData = await suppliersRes.json();
        // Corregir la estructura de respuesta anidada
        setSuppliers(suppliersData.data?.suppliers || suppliersData.suppliers || []);
      }

      if (customersRes.ok) {
        const customersData = await customersRes.json();
        // Corregir la estructura de respuesta anidada
        setCustomers(customersData.data?.customers || customersData.customers || []);
      }

      // Obtener estadísticas de entity matching
      try {
        const entityStatsRes = await fetch('/api/reports/entity-matching-stats');
        if (entityStatsRes.ok) {
          const entityStats = await entityStatsRes.json();
          setEntityMatchingStats(entityStats);
        }
      } catch (entityError) {
        console.warn('Error fetching entity matching stats:', entityError);
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
      const type = doc.document_type || 'Sin clasificar';
      acc[type] = (acc[type] || 0) + 1;
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
      monthlyData.set(monthKey, { month: monthKey, count: 0, totalAmount: 0 });
    }

    documents.forEach(doc => {
      const date = new Date(doc.upload_timestamp || doc.created_at);
      const monthKey = date.toLocaleDateString('es-ES', { month: 'short' });
      const monthData = monthlyData.get(monthKey);
      if (monthData) {
        monthData.count++;
        // Extraer cantidad total de los datos procesados
        if (doc.processed_json) {
          const total = doc.processed_json.total || doc.processed_json.total_amount || 0;
          monthData.totalAmount += parseFloat(total) || 0;
        }
      }
    });

    return Array.from(monthlyData.values());
  };

  const getTopSuppliersByRealData = () => {
    // Calcular datos reales de facturación por proveedor
    const supplierData = new Map();
    
    // Inicializar con todos los proveedores
    suppliers.forEach(supplier => {
      supplierData.set(supplier.name || supplier.nif_cif, {
        name: (supplier.name || supplier.nif_cif).length > 20 
          ? (supplier.name || supplier.nif_cif).substring(0, 20) + '...' 
          : (supplier.name || supplier.nif_cif),
        total_invoices: 0,
        total_amount: 0
      });
    });

    // Agregar datos de documentos procesados
    documents.forEach(doc => {
      if (doc.emitter_name && doc.processed_json) {
        const supplierKey = doc.emitter_name;
        if (!supplierData.has(supplierKey)) {
          supplierData.set(supplierKey, {
            name: supplierKey.length > 20 ? supplierKey.substring(0, 20) + '...' : supplierKey,
            total_invoices: 0,
            total_amount: 0
          });
        }
        
        const supplier = supplierData.get(supplierKey);
        supplier.total_invoices++;
        
        // Calcular total real desde documentos procesados
        if (doc.processed_json.detected_invoices && Array.isArray(doc.processed_json.detected_invoices)) {
          doc.processed_json.detected_invoices.forEach((invoice: any) => {
            const amount = parseFloat(invoice.total_amount || invoice.totals?.total || 0);
            supplier.total_amount += amount;
          });
        } else {
          const amount = parseFloat(doc.processed_json.total || doc.processed_json.total_amount || 0);
          supplier.total_amount += amount;
        }
      }
    });

    return Array.from(supplierData.values())
      .filter(s => s.total_amount > 0)
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 5);
  };

  const getTotalInvoiceAmount = () => {
    let total = 0;
    documents.forEach(doc => {
      if (doc.processed_json) {
        if (doc.processed_json.detected_invoices && Array.isArray(doc.processed_json.detected_invoices)) {
          doc.processed_json.detected_invoices.forEach((invoice: any) => {
            const amount = parseFloat(invoice.total_amount || invoice.totals?.total || 0);
            total += amount;
          });
        } else {
          const amount = parseFloat(doc.processed_json.total || doc.processed_json.total_amount || 0);
          total += amount;
        }
      }
    });
    return total;
  };

  const documentStats = getDocumentStats();
  const supplierStats = getSupplierStats();
  const customerStats = getCustomerStats();
  const statusDistribution = getStatusDistribution();
  const monthlyTrend = getMonthlyTrend();
  const topSuppliers = getTopSuppliersByRealData();
  const totalInvoiceAmount = getTotalInvoiceAmount();

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
            <CardTitle className="text-sm font-medium">Facturación Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{totalInvoiceAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Facturas procesadas
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
          <TabsTrigger value="entity-matching">Entity Matching</TabsTrigger>
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

          {/* Facturación mensual */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Facturación Mensual
              </CardTitle>
              <CardDescription>
                Evolución del volumen de facturación procesado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`€${parseFloat(value as string).toLocaleString('es-ES')}`, 'Facturación']} />
                  <Area 
                    type="monotone" 
                    dataKey="totalAmount" 
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
            {/* Top Proveedores con datos reales */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Top Proveedores por Facturación
                </CardTitle>
                <CardDescription>
                  Ranking basado en facturas procesadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topSuppliers} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip formatter={(value) => [`€${parseFloat(value as string).toLocaleString('es-ES')}`, 'Facturación']} />
                    <Bar dataKey="total_amount" fill="#14B8A6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Distribución por Sectores con datos reales */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Distribución de Proveedores
                </CardTitle>
                <CardDescription>
                  Estados de proveedores registrados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Activos', value: supplierStats.active, color: '#10B981' },
                        { name: 'Inactivos', value: supplierStats.total - supplierStats.active, color: '#EF4444' }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {[
                        { color: '#10B981' },
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

          {/* Métricas KPI con datos reales */}
          <Card>
            <CardHeader>
              <CardTitle>Métricas de Proveedores</CardTitle>
              <CardDescription>
                Indicadores basados en datos reales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center p-4 border rounded-lg bg-blue-50">
                  <div className="text-2xl font-bold text-blue-600">{supplierStats.total}</div>
                  <div className="text-sm text-gray-600">Total Proveedores</div>
                  <Badge variant="secondary" className="mt-2">
                    Registrados
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
                  <div className="text-2xl font-bold text-purple-600">{topSuppliers.length}</div>
                  <div className="text-sm text-gray-600">Con Facturas</div>
                  <Badge variant="secondary" className="mt-2">
                    Procesadas
                  </Badge>
                </div>
                <div className="text-center p-4 border rounded-lg bg-orange-50">
                  <div className="text-2xl font-bold text-orange-600">
                    €{Math.round(topSuppliers.reduce((sum, s) => sum + s.total_amount, 0)).toLocaleString('es-ES')}
                  </div>
                  <div className="text-sm text-gray-600">Facturación Total</div>
                  <Badge variant="secondary" className="mt-2">
                    Top proveedores
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Estados de Clientes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Estado de Clientes
                </CardTitle>
                <CardDescription>
                  Distribución por estado de actividad
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Activos', value: customerStats.active, color: '#10B981' },
                        { name: 'Inactivos', value: customerStats.total - customerStats.active, color: '#EF4444' }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {[
                        { color: '#10B981' },
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

            {/* Comparativa Actividad */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Comparativa de Estados
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

          {/* Métricas de Clientes con datos reales */}
          <Card>
            <CardHeader>
              <CardTitle>Métricas de Clientes</CardTitle>
              <CardDescription>
                Indicadores de la cartera de clientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 border rounded-lg bg-blue-50">
                  <div className="text-2xl font-bold text-blue-600">{customerStats.total}</div>
                  <div className="text-sm text-gray-600">Total Clientes</div>
                  <Badge variant="secondary" className="mt-2">
                    Registrados
                  </Badge>
                </div>
                <div className="text-center p-4 border rounded-lg bg-green-50">
                  <div className="text-2xl font-bold text-green-600">{customerStats.active}</div>
                  <div className="text-sm text-gray-600">Activos</div>
                  <Badge variant="secondary" className="mt-2">
                    {customerStats.total > 0 ? Math.round((customerStats.active / customerStats.total) * 100) : 0}% activos
                  </Badge>
                </div>
                <div className="text-center p-4 border rounded-lg bg-purple-50">
                  <div className="text-2xl font-bold text-purple-600">{customerStats.types}</div>
                  <div className="text-sm text-gray-600">Tipos</div>
                  <Badge variant="secondary" className="mt-2">
                    Categorías
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entity-matching" className="space-y-4">
          {/* Entity Matching Statistics */}
          {entityMatchingStats ? (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tasa de Automatización</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {entityMatchingStats.executive_summary?.automation_success_rate || '0%'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Documentos vinculados automáticamente
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Entidades Auto-creadas</CardTitle>
                    <Building className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {entityMatchingStats.executive_summary?.entities_auto_created || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Proveedores y clientes nuevos
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Confianza Promedio</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {entityMatchingStats.executive_summary?.average_confidence || '0%'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Precisión del matching
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Eficiencia del Sistema</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {entityMatchingStats.executive_summary?.system_efficiency || 'N/A'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Evaluación general
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Section */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Confidence Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChartIcon className="h-5 w-5" />
                      Distribución de Confianza
                    </CardTitle>
                    <CardDescription>
                      Niveles de confianza en el matching automático
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={entityMatchingStats.confidence_distribution?.map((item: any) => ({
                            name: item.confidence_level,
                            value: item.document_count,
                            color: item.confidence_level.includes('Alto') ? '#10B981' :
                                   item.confidence_level.includes('Medio') ? '#F59E0B' :
                                   item.confidence_level.includes('Bajo') ? '#EF4444' : '#6B7280'
                          })) || []}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {(entityMatchingStats.confidence_distribution || []).map((entry: any, index: number) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.confidence_level.includes('Alto') ? '#10B981' :
                                    entry.confidence_level.includes('Medio') ? '#F59E0B' :
                                    entry.confidence_level.includes('Bajo') ? '#EF4444' : '#6B7280'} 
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Matching Methods */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Métodos de Matching
                    </CardTitle>
                    <CardDescription>
                      Distribución por tipo de algoritmo usado
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={entityMatchingStats.matching_methods || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="match_method" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value, name) => [
                            value, 
                            name === 'total_matches' ? 'Total Matches' : 
                            name === 'avg_confidence' ? 'Confianza Promedio' : name
                          ]}
                        />
                        <Bar dataKey="total_matches" fill="#3B82F6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Auto-Created Entities */}
              <Card>
                <CardHeader>
                  <CardTitle>Entidades Auto-creadas Recientes</CardTitle>
                  <CardDescription>
                    Últimas entidades creadas automáticamente por el sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {entityMatchingStats.recent_auto_created?.length > 0 ? (
                      entityMatchingStats.recent_auto_created.map((entity: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge variant={entity.entity_type === 'supplier' ? 'default' : 'secondary'}>
                              {entity.entity_type === 'supplier' ? 'Proveedor' : 'Cliente'}
                            </Badge>
                            <div>
                              <div className="font-medium">{entity.entity_name}</div>
                              <div className="text-sm text-gray-500">{entity.nif_cif}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              €{entity.total_amount?.toLocaleString('es-ES', { minimumFractionDigits: 2 }) || '0.00'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {entity.total_invoices || 0} facturas
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No hay entidades auto-creadas recientes
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-gray-500">
                  {loading ? 'Cargando estadísticas de Entity Matching...' : 'No hay datos de Entity Matching disponibles'}
                </div>
              </CardContent>
            </Card>
          )}
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
                    { stage: 'Con errores', count: documentStats.errors }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8B5CF6" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Panel de Estado del Sistema con datos reales */}
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
                    {documentStats.total > 0 && (documentStats.completed / documentStats.total) > 0.8 ? 'Excelente' : 'Bueno'}
                  </Badge>
                </div>
                <div className="text-center p-4 border rounded-lg bg-red-50">
                  <div className="text-2xl font-bold text-red-600">
                    {documentStats.total > 0 ? Math.round((documentStats.errors / documentStats.total) * 100) : 0}%
                  </div>
                  <div className="text-sm text-gray-600">Tasa de Error</div>
                  <Badge variant="default" className="mt-2 bg-red-100 text-red-800">
                    {documentStats.total > 0 && (documentStats.errors / documentStats.total) < 0.1 ? 'Bajo' : 'Revisar'}
                  </Badge>
                </div>
                <div className="text-center p-4 border rounded-lg bg-blue-50">
                  <div className="text-2xl font-bold text-blue-600">{documentStats.total}</div>
                  <div className="text-sm text-gray-600">Documentos Total</div>
                  <Badge variant="default" className="mt-2 bg-blue-100 text-blue-800">
                    Procesados
                  </Badge>
                </div>
                <div className="text-center p-4 border rounded-lg bg-purple-50">
                  <div className="text-2xl font-bold text-purple-600">
                    {documentStats.processing}
                  </div>
                  <div className="text-sm text-gray-600">En Cola</div>
                  <Badge variant="default" className="mt-2 bg-purple-100 text-purple-800">
                    {documentStats.processing === 0 ? 'Vacía' : 'Procesando'}
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