'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
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
  Cell
} from 'recharts';
import { 
  Brain,
  TrendingUp,
  Target,
  Activity,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Eye,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';

interface TemplateMetrics {
  id: string;
  provider_name: string;
  usage_count: number;
  success_rate: number;
  avg_confidence: number;
  last_used: string;
  performance_trend: number[];
  status: 'excellent' | 'good' | 'needs_improvement' | 'poor';
}

interface SystemMetrics {
  total_templates: number;
  active_templates: number;
  total_applications: number;
  avg_success_rate: number;
  templates_created_today: number;
  applications_today: number;
  performance_trend: { date: string; success_rate: number; applications: number }[];
}

export default function TemplatesMonitoringPage() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [templateMetrics, setTemplateMetrics] = useState<TemplateMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Cargar métricas del sistema
  const fetchMetrics = async () => {
    try {
      setLoading(true);
      
      const [systemResponse, templatesResponse] = await Promise.all([
        fetch('/api/templates/metrics/system'),
        fetch('/api/templates/metrics/individual')
      ]);

      if (systemResponse.ok && templatesResponse.ok) {
        const systemData = await systemResponse.json();
        const templatesData = await templatesResponse.json();
        
        setMetrics(systemData.metrics);
        setTemplateMetrics(templatesData.templates);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh toggle
  const toggleAutoRefresh = () => {
    if (autoRefresh) {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
      setAutoRefresh(false);
    } else {
      const interval = setInterval(fetchMetrics, 30000); // 30 segundos
      setRefreshInterval(interval);
      setAutoRefresh(true);
    }
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [refreshInterval]);

  // Initial load
  useEffect(() => {
    fetchMetrics();
  }, []);

  // Determinar color de estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'needs_improvement': return 'bg-yellow-100 text-yellow-800';
      case 'poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Datos para gráfico de distribución
  const distributionData = templateMetrics.reduce((acc, template) => {
    const existing = acc.find(item => item.status === template.status);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ 
        status: template.status, 
        count: 1,
        color: template.status === 'excellent' ? '#10B981' :
               template.status === 'good' ? '#3B82F6' :
               template.status === 'needs_improvement' ? '#F59E0B' : '#EF4444'
      });
    }
    return acc;
  }, [] as { status: string; count: number; color: string }[]);

  if (loading && !metrics) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin mr-3" />
          <span className="text-lg">Cargando métricas...</span>
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
            <Brain className="h-8 w-8 text-blue-600" />
            Monitoreo de Plantillas
          </h1>
          <p className="text-gray-600 mt-1">
            Métricas en tiempo real del sistema de extracción inteligente
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            onClick={toggleAutoRefresh}
            className="flex items-center gap-2"
          >
            {autoRefresh ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Auto-actualización
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Activar Auto-refresh
              </>
            )}
          </Button>
          <Button onClick={fetchMetrics} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Métricas principales */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Plantillas Totales</p>
                  <p className="text-2xl font-bold text-blue-600">{metrics.total_templates}</p>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
              <div className="mt-2">
                <Badge variant="secondary" className="text-xs">
                  {metrics.active_templates} activas
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Aplicaciones</p>
                  <p className="text-2xl font-bold text-green-600">{metrics.total_applications}</p>
                </div>
                <Activity className="h-8 w-8 text-green-500" />
              </div>
              <div className="mt-2">
                <Badge variant="secondary" className="text-xs">
                  +{metrics.applications_today} hoy
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tasa de Éxito</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {(metrics.avg_success_rate * 100).toFixed(1)}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full" 
                    style={{ width: `${metrics.avg_success_rate * 100}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Nuevas Hoy</p>
                  <p className="text-2xl font-bold text-orange-600">{metrics.templates_created_today}</p>
                </div>
                <Zap className="h-8 w-8 text-orange-500" />
              </div>
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">
                  Aprendizaje automático
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Estado Sistema</p>
                  <div className="flex items-center gap-1 mt-1">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium text-green-600">Operativo</span>
                  </div>
                </div>
                <div className="relative">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                </div>
              </div>
              <div className="mt-2">
                <Badge variant="outline" className="text-xs text-green-600">
                  99.9% uptime
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gráficos de tendencias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de línea - Tendencia temporal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Tendencia de Rendimiento
            </CardTitle>
            <CardDescription>
              Evolución de la tasa de éxito y aplicaciones en los últimos 7 días
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics?.performance_trend || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Line 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="success_rate" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  name="Tasa de Éxito"
                />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="applications" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  name="Aplicaciones"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico circular - Distribución por estado */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Distribución por Estado
            </CardTitle>
            <CardDescription>
              Estado de salud de las plantillas activas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, count }) => `${status}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de plantillas individuales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Rendimiento por Plantilla
          </CardTitle>
          <CardDescription>
            Métricas detalladas de cada plantilla de extracción
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead>Tasa de Éxito</TableHead>
                <TableHead>Confianza Promedio</TableHead>
                <TableHead>Último Uso</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templateMetrics.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{template.provider_name}</div>
                      <div className="text-sm text-gray-500">ID: {template.id}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{template.usage_count}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${
                        template.success_rate >= 0.8 ? 'text-green-600' :
                        template.success_rate >= 0.6 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {(template.success_rate * 100).toFixed(1)}%
                      </span>
                      <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            template.success_rate >= 0.8 ? 'bg-green-500' :
                            template.success_rate >= 0.6 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${template.success_rate * 100}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{(template.avg_confidence * 100).toFixed(1)}%</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {new Date(template.last_used).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline"
                      className={getStatusColor(template.status)}
                    >
                      {template.status === 'excellent' ? 'Excelente' :
                       template.status === 'good' ? 'Bueno' :
                       template.status === 'needs_improvement' ? 'Necesita mejora' :
                       'Deficiente'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {templateMetrics.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="text-gray-500">
                      <Brain className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      No hay plantillas para mostrar
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Alertas del sistema */}
      {templateMetrics.some(t => t.status === 'poor') && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Hay plantillas con rendimiento deficiente que requieren atención. 
            Revisa las plantillas marcadas en rojo para optimizar su configuración.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
} 