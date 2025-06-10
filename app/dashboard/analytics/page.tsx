'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  ScatterChart,
  Scatter,
  ReferenceLine
} from 'recharts';
import { 
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  Activity,
  Users,
  FileText,
  DollarSign,
  Clock,
  Target,
  Zap,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

interface AnalyticsData {
  documents: {
    daily_count: { date: string; count: number; type: string }[];
    status_distribution: { status: string; count: number; color: string }[];
    type_performance: { type: string; success_rate: number; count: number; avg_time: number }[];
    monthly_trend: { month: string; documents: number; revenue: number }[];
  };
  financial: {
    monthly_revenue: { month: string; revenue: number; expenses: number; profit: number }[];
    top_suppliers: { name: string; amount: number; count: number }[];
    payment_trends: { date: string; pending: number; paid: number; overdue: number }[];
  };
  performance: {
    processing_times: { date: string; avg_time: number; max_time: number; min_time: number }[];
    error_analysis: { type: string; count: number; resolution_time: number }[];
    system_health: { metric: string; current: number; target: number; trend: number }[];
  };
  users: {
    activity_heatmap: { day: string; hour: number; activity: number }[];
    role_distribution: { role: string; count: number; active: number }[];
    login_patterns: { hour: number; logins: number; day_type: string }[];
  };
}

const COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  accent: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  teal: '#14B8A6',
  orange: '#F97316',
  pink: '#EC4899'
};

export default function AdvancedAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalyticsData = async () => {
    try {
      setRefreshing(true);
      const response = await fetch(`/api/analytics/advanced?range=${timeRange}`);
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData.data);
      } else {
        // Fallback to mock data for development
        setData(generateMockData());
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setData(generateMockData());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const generateMockData = (): AnalyticsData => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    return {
      documents: {
        daily_count: last30Days.map(date => ({
          date,
          count: Math.floor(Math.random() * 50) + 10,
          type: ['invoice', 'receipt', 'contract'][Math.floor(Math.random() * 3)]
        })),
        status_distribution: [
          { status: 'completed', count: 245, color: COLORS.secondary },
          { status: 'processing', count: 23, color: COLORS.accent },
          { status: 'pending', count: 12, color: COLORS.primary },
          { status: 'error', count: 8, color: COLORS.danger }
        ],
        type_performance: [
          { type: 'invoice', success_rate: 94.5, count: 156, avg_time: 2.3 },
          { type: 'receipt', success_rate: 89.2, count: 98, avg_time: 1.8 },
          { type: 'contract', success_rate: 91.7, count: 34, avg_time: 4.1 },
          { type: 'payroll', success_rate: 96.1, count: 67, avg_time: 3.2 }
        ],
        monthly_trend: Array.from({ length: 12 }, (_, i) => {
          const month = new Date(2024, i, 1).toLocaleDateString('es-ES', { month: 'short' });
          return {
            month,
            documents: Math.floor(Math.random() * 300) + 200,
            revenue: Math.floor(Math.random() * 50000) + 30000
          };
        })
      },
      financial: {
        monthly_revenue: Array.from({ length: 12 }, (_, i) => {
          const month = new Date(2024, i, 1).toLocaleDateString('es-ES', { month: 'short' });
          const revenue = Math.floor(Math.random() * 80000) + 40000;
          const expenses = Math.floor(Math.random() * 30000) + 20000;
          return {
            month,
            revenue,
            expenses,
            profit: revenue - expenses
          };
        }),
        top_suppliers: [
          { name: 'Tecnología Avanzada S.A.', amount: 125000, count: 45 },
          { name: 'Suministros Oficina Express', amount: 89000, count: 67 },
          { name: 'Servicios Contables López', amount: 76000, count: 23 },
          { name: 'Distribuidora Industrial', amount: 54000, count: 34 },
          { name: 'Consultores Estratégicos', amount: 43000, count: 19 }
        ],
        payment_trends: last30Days.map(date => ({
          date,
          pending: Math.floor(Math.random() * 20000) + 5000,
          paid: Math.floor(Math.random() * 30000) + 15000,
          overdue: Math.floor(Math.random() * 5000) + 1000
        }))
      },
      performance: {
        processing_times: last30Days.map(date => ({
          date,
          avg_time: Math.random() * 2 + 1,
          max_time: Math.random() * 5 + 3,
          min_time: Math.random() * 1 + 0.5
        })),
        error_analysis: [
          { type: 'OCR Error', count: 12, resolution_time: 45 },
          { type: 'Validation Failed', count: 8, resolution_time: 30 },
          { type: 'Format Error', count: 5, resolution_time: 15 },
          { type: 'Network Timeout', count: 3, resolution_time: 5 }
        ],
        system_health: [
          { metric: 'API Response Time', current: 250, target: 200, trend: 5 },
          { metric: 'Success Rate', current: 94.5, target: 95, trend: 2.1 },
          { metric: 'Storage Usage', current: 78, target: 80, trend: 1.2 },
          { metric: 'CPU Usage', current: 45, target: 70, trend: -2.3 }
        ]
      },
      users: {
        activity_heatmap: Array.from({ length: 7 }, (_, day) =>
          Array.from({ length: 24 }, (_, hour) => ({
            day: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][day],
            hour,
            activity: Math.floor(Math.random() * 100)
          }))
        ).flat(),
        role_distribution: [
          { role: 'admin', count: 3, active: 3 },
          { role: 'gestor', count: 8, active: 6 },
          { role: 'contable', count: 12, active: 10 },
          { role: 'viewer', count: 25, active: 18 }
        ],
        login_patterns: Array.from({ length: 24 }, (_, hour) => ({
          hour,
          logins: Math.floor(Math.random() * 20) + 5,
          day_type: hour >= 9 && hour <= 17 ? 'business' : 'off-hours'
        }))
      }
    };
  };

  const exportData = () => {
    if (!data) return;
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !data) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin mr-3" />
          <span className="text-lg">Cargando analytics avanzados...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            Analytics Avanzados
          </h1>
          <p className="text-gray-600 mt-1">
            Análisis profundo y visualizaciones avanzadas del sistema
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 días</SelectItem>
              <SelectItem value="30d">30 días</SelectItem>
              <SelectItem value="90d">90 días</SelectItem>
              <SelectItem value="1y">1 año</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          
          <Button onClick={fetchAnalyticsData} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Tabs principales */}
      <Tabs defaultValue="documents" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Financiero
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Rendimiento
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Usuarios
          </TabsTrigger>
        </TabsList>

        {/* Tab: Documentos */}
        <TabsContent value="documents" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tendencia diaria */}
            <Card>
              <CardHeader>
                <CardTitle>Tendencia Diaria de Documentos</CardTitle>
                <CardDescription>Volumen de procesamiento por día</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data?.documents.daily_count || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke={COLORS.primary} 
                      fill={COLORS.primary} 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Distribución por estado */}
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Estado</CardTitle>
                <CardDescription>Estado actual de los documentos</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data?.documents.status_distribution || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ status, count }) => `${status}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {data?.documents.status_distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Rendimiento por tipo */}
            <Card>
              <CardHeader>
                <CardTitle>Rendimiento por Tipo de Documento</CardTitle>
                <CardDescription>Tasa de éxito y tiempo promedio</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={data?.documents.type_performance || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Bar yAxisId="left" dataKey="count" fill={COLORS.secondary} />
                    <Line yAxisId="right" type="monotone" dataKey="success_rate" stroke={COLORS.accent} strokeWidth={3} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Tendencia mensual */}
            <Card>
              <CardHeader>
                <CardTitle>Tendencia Mensual</CardTitle>
                <CardDescription>Evolución de documentos y ingresos</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={data?.documents.monthly_trend || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Bar yAxisId="left" dataKey="documents" fill={COLORS.primary} />
                    <Line yAxisId="right" type="monotone" dataKey="revenue" stroke={COLORS.orange} strokeWidth={3} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Financiero */}
        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ingresos vs Gastos */}
            <Card>
              <CardHeader>
                <CardTitle>Análisis Financiero Mensual</CardTitle>
                <CardDescription>Ingresos, gastos y beneficios</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={data?.financial.monthly_revenue || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [`€${value.toLocaleString()}`, name]} />
                    <Bar dataKey="revenue" fill={COLORS.secondary} name="Ingresos" />
                    <Bar dataKey="expenses" fill={COLORS.danger} name="Gastos" />
                    <Line type="monotone" dataKey="profit" stroke={COLORS.purple} strokeWidth={3} name="Beneficio" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top proveedores */}
            <Card>
              <CardHeader>
                <CardTitle>Top Proveedores</CardTitle>
                <CardDescription>Proveedores por volumen de facturación</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data?.financial.top_suppliers || []} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip formatter={(value) => [`€${value.toLocaleString()}`, 'Facturación']} />
                    <Bar dataKey="amount" fill={COLORS.teal} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Tendencias de pago */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Tendencias de Pagos</CardTitle>
                <CardDescription>Estado de pagos a lo largo del tiempo</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data?.financial.payment_trends || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`€${value.toLocaleString()}`, '']} />
                    <Area 
                      type="monotone" 
                      dataKey="paid" 
                      stackId="1" 
                      stroke={COLORS.secondary} 
                      fill={COLORS.secondary} 
                      name="Pagado"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="pending" 
                      stackId="1" 
                      stroke={COLORS.accent} 
                      fill={COLORS.accent} 
                      name="Pendiente"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="overdue" 
                      stackId="1" 
                      stroke={COLORS.danger} 
                      fill={COLORS.danger} 
                      name="Vencido"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Rendimiento */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tiempos de procesamiento */}
            <Card>
              <CardHeader>
                <CardTitle>Tiempos de Procesamiento</CardTitle>
                <CardDescription>Métricas de tiempo de respuesta</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data?.performance.processing_times || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}s`, '']} />
                    <Line type="monotone" dataKey="avg_time" stroke={COLORS.primary} strokeWidth={2} name="Promedio" />
                    <Line type="monotone" dataKey="max_time" stroke={COLORS.danger} strokeWidth={2} name="Máximo" />
                    <Line type="monotone" dataKey="min_time" stroke={COLORS.secondary} strokeWidth={2} name="Mínimo" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Análisis de errores */}
            <Card>
              <CardHeader>
                <CardTitle>Análisis de Errores</CardTitle>
                <CardDescription>Tipos de errores y tiempo de resolución</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart data={data?.performance.error_analysis || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="count" name="Cantidad" />
                    <YAxis dataKey="resolution_time" name="Tiempo (min)" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter dataKey="resolution_time" fill={COLORS.accent} />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Salud del sistema */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Salud del Sistema</CardTitle>
                <CardDescription>Métricas clave vs objetivos</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={data?.performance.system_health || []}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis />
                    <Radar name="Actual" dataKey="current" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.3} />
                    <Radar name="Objetivo" dataKey="target" stroke={COLORS.secondary} fill={COLORS.secondary} fillOpacity={0.1} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Usuarios */}
        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribución de roles */}
            <Card>
              <CardHeader>
                <CardTitle>Distribución de Roles</CardTitle>
                <CardDescription>Usuarios por rol y actividad</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={data?.users.role_distribution || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="role" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill={COLORS.primary} name="Total" />
                    <Bar dataKey="active" fill={COLORS.secondary} name="Activos" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Patrones de login */}
            <Card>
              <CardHeader>
                <CardTitle>Patrones de Login</CardTitle>
                <CardDescription>Distribución de inicios de sesión por hora</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data?.users.login_patterns || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="logins" fill={COLORS.purple} />
                    <ReferenceLine y={10} stroke={COLORS.danger} strokeDasharray="3 3" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}