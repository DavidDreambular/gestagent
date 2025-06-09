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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
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
  Upload,
  X
} from 'lucide-react';

interface ExtractionTemplate {
  id: string;
  provider_name: string;
  provider_nif?: string;
  field_mappings: Record<string, any>;
  confidence_threshold: number;
  usage_count: number;
  success_count: number;
  last_used_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TemplatesModal({ isOpen, onClose }: TemplatesModalProps) {
  const [templates, setTemplates] = useState<ExtractionTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ExtractionTemplate | null>(null);
  const [showTemplateDetail, setShowTemplateDetail] = useState(false);
  const [stats, setStats] = useState({
    active_templates: 0,
    avg_success_rate: 0,
    total_usage: 0
  });

  // Cargar plantillas
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
        setStats(data.stats || {
          active_templates: 0,
          avg_success_rate: 0,
          total_usage: 0
        });
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar plantillas
  const filteredTemplates = templates.filter(template =>
    template.provider_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (template.provider_nif && template.provider_nif.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Calcular tasa de éxito
  const getSuccessRate = (template: ExtractionTemplate) => {
    if (template.usage_count === 0) return 0;
    return Math.round((template.success_count / template.usage_count) * 100);
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Toggle estado de plantilla
  const toggleTemplateStatus = async (templateId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive })
      });
      
      if (response.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error updating template:', error);
    }
  };

  // Eliminar plantilla
  const deleteTemplate = async (templateId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta plantilla?')) return;
    
    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  // Ver detalles de plantilla
  const viewTemplateDetails = (template: ExtractionTemplate) => {
    setSelectedTemplate(template);
    setShowTemplateDetail(true);
  };

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Gestión de Plantillas de Extracción
            </DialogTitle>
            <DialogDescription>
              Administra las plantillas automáticas para mejorar la precisión de extracción por proveedor
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto space-y-6">
            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Plantillas Activas</p>
                      <p className="text-2xl font-bold text-blue-600">{stats.active_templates}</p>
                    </div>
                    <Target className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Éxito Promedio</p>
                      <p className="text-2xl font-bold text-green-600">{stats.avg_success_rate}%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Uso Total</p>
                      <p className="text-2xl font-bold text-purple-600">{stats.total_usage}</p>
                    </div>
                    <Activity className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Controles */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar plantillas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={fetchTemplates}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Actualizar
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Plantilla
                </Button>
              </div>
            </div>

            {/* Tabla de plantillas */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>NIF/CIF</TableHead>
                      <TableHead>Campos</TableHead>
                      <TableHead>Uso</TableHead>
                      <TableHead>Éxito</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Última Actualización</TableHead>
                      <TableHead className="w-[100px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="flex items-center justify-center">
                            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                            Cargando plantillas...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredTemplates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="text-gray-500">
                            <Brain className="h-12 w-12 mx-auto mb-2 opacity-20" />
                            {searchTerm ? 'No se encontraron plantillas' : 'No hay plantillas configuradas'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTemplates.map((template) => (
                        <TableRow key={template.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{template.provider_name}</div>
                              <div className="text-sm text-gray-500">ID: {template.id}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {template.provider_nif ? (
                              <Badge variant="secondary">{template.provider_nif}</Badge>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {Object.keys(template.field_mappings).length} campos
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{template.usage_count}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${
                                getSuccessRate(template) >= 80 ? 'text-green-600' :
                                getSuccessRate(template) >= 60 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {getSuccessRate(template)}%
                              </span>
                              <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all ${
                                    getSuccessRate(template) >= 80 ? 'bg-green-500' :
                                    getSuccessRate(template) >= 60 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${getSuccessRate(template)}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={template.is_active ? "default" : "secondary"}
                              className={template.is_active ? "bg-green-100 text-green-800" : ""}
                            >
                              {template.is_active ? 'Activa' : 'Inactiva'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-500">
                              {formatDate(template.updated_at)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => viewTemplateDetails(template)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver Detalles
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => toggleTemplateStatus(template.id, template.is_active)}
                                >
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  {template.is_active ? 'Desactivar' : 'Activar'}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => deleteTemplate(template.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de detalles de plantilla */}
      {showTemplateDetail && selectedTemplate && (
        <Dialog open={showTemplateDetail} onOpenChange={setShowTemplateDetail}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Detalles de Plantilla: {selectedTemplate.provider_name}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Proveedor:</label>
                  <p className="text-sm text-gray-600">{selectedTemplate.provider_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">NIF/CIF:</label>
                  <p className="text-sm text-gray-600">{selectedTemplate.provider_nif || 'No especificado'}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Mapeo de Campos:</label>
                <pre className="mt-2 p-3 bg-gray-100 rounded-lg text-xs overflow-auto max-h-64">
                  {JSON.stringify(selectedTemplate.field_mappings, null, 2)}
                </pre>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Umbral de Confianza:</label>
                  <p className="text-sm text-gray-600">{selectedTemplate.confidence_threshold}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Usos:</label>
                  <p className="text-sm text-gray-600">{selectedTemplate.usage_count}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Éxitos:</label>
                  <p className="text-sm text-gray-600">{selectedTemplate.success_count}</p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
} 