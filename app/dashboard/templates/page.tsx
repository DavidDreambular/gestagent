'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { 
  Brain,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  TrendingUp,
  Target,
  Activity,
  RefreshCw,
  AlertTriangle,
  Plus,
  Download,
  Upload
} from 'lucide-react';

interface ExtractionTemplate {
  id: string;
  provider_name: string;
  provider_nif?: string;
  field_mappings: {
    invoice_number_patterns: string[];
    date_patterns: string[];
    total_amount_patterns: string[];
    tax_patterns: string[];
  };
  confidence_threshold: number;
  usage_count: number;
  success_count: number;
  success_rate: number;
  last_used: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'learning' | 'deprecated';
}

interface TemplateStats {
  active_templates: number;
  avg_success_rate: number;
  total_usage: number;
  templates_learning: number;
  total_providers_with_templates: number;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<ExtractionTemplate[]>([]);
  const [stats, setStats] = useState<TemplateStats>({
    active_templates: 0,
    avg_success_rate: 0,
    total_usage: 0,
    templates_learning: 0,
    total_providers_with_templates: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'learning' | 'deprecated'>('all');

  // Cargar plantillas y estadísticas
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
        setStats(data.stats || stats);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Filtrar plantillas
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.provider_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.provider_nif?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || template.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'learning': return 'bg-yellow-100 text-yellow-800';
      case 'deprecated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plantillas de Extracción</h1>
          <p className="text-gray-600">
            Gestiona plantillas automáticas para mejorar la precisión de extracción
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={fetchTemplates}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nueva Plantilla
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Plantillas Activas</p>
                <p className="text-2xl font-bold">{stats.active_templates}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Precisión Promedio</p>
                <p className="text-2xl font-bold">{stats.avg_success_rate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Uso Total</p>
                <p className="text-2xl font-bold">{stats.total_usage}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Aprendiendo</p>
                <p className="text-2xl font-bold">{stats.templates_learning}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-indigo-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Proveedores</p>
                <p className="text-2xl font-bold">{stats.total_providers_with_templates}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por proveedor o NIF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {['all', 'active', 'learning', 'deprecated'].map((status) => (
                <Button
                  key={status}
                  variant={selectedStatus === status ? 'default' : 'outline'}
                  onClick={() => setSelectedStatus(status as any)}
                  className="capitalize"
                >
                  {status === 'all' ? 'Todas' : status}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Plantillas */}
      <Card>
        <CardHeader>
          <CardTitle>Plantillas de Extracción</CardTitle>
          <CardDescription>
            {filteredTemplates.length} plantillas encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8">
              <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No se encontraron plantillas</p>
              <Button className="mt-4" onClick={() => setSearchTerm('')}>
                Limpiar filtros
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>NIF</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Uso</TableHead>
                  <TableHead>Precisión</TableHead>
                  <TableHead>Última Vez</TableHead>
                  <TableHead>Patrones</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      {template.provider_name}
                    </TableCell>
                    <TableCell>
                      {template.provider_nif || (
                        <span className="text-gray-400">Sin NIF</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(template.status)}>
                        {template.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-gray-400" />
                        {template.usage_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${getSuccessRateColor(template.success_rate)}`}>
                        {template.success_rate.toFixed(1)}%
                      </span>
                      <div className="text-xs text-gray-500">
                        {template.success_count}/{template.usage_count}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(template.last_used)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-xs">
                          {template.field_mappings.invoice_number_patterns?.length || 0} núm
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {template.field_mappings.date_patterns?.length || 0} fecha
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {template.field_mappings.total_amount_patterns?.length || 0} total
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar plantilla
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Exportar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Información sobre el sistema de plantillas */}
      <Alert>
        <Brain className="h-4 w-4" />
        <AlertDescription>
          <strong>Sistema de Aprendizaje Automático:</strong> Las plantillas se crean automáticamente 
          al procesar documentos de nuevos proveedores y mejoran su precisión con cada uso. 
          El sistema detecta patrones en números de factura, fechas e importes para acelerar 
          futuras extracciones.
        </AlertDescription>
      </Alert>
    </div>
  );
} 