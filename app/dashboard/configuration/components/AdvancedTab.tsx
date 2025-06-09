'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
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
  Settings,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  FileText,
  Save,
  X,
  AlertTriangle,
  Brain,
  Target,
  TrendingUp,
  Activity
} from 'lucide-react';
import { TemplatesModal } from './TemplatesModal';

interface DocumentType {
  id: string;
  name: string;
  icon: string;
  description: string;
  required_fields: string[];
  extraction_template: any;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AdvancedTabProps {
  hasPermission: (permission: string) => boolean;
}

export default function AdvancedTab({ hasPermission }: AdvancedTabProps) {
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<DocumentType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    icon: '📄',
    description: '',
    required_fields: '',
    extraction_template: ''
  });
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [templateStats, setTemplateStats] = useState({
    active_templates: 0,
    avg_success_rate: 0,
    total_usage: 0
  });

  // Tipos de documento predeterminados del sistema
  const systemTypes = [
    { id: 'factura', name: 'Factura', icon: '🧾', description: 'Facturas de proveedores' },
    { id: 'nomina', name: 'Nómina', icon: '💰', description: 'Nóminas de empleados' },
    { id: 'recibo', name: 'Recibo', icon: '🧾', description: 'Recibos diversos' },
    { id: 'contrato', name: 'Contrato', icon: '📋', description: 'Contratos y acuerdos' }
  ];

  // Iconos disponibles para tipos de documento
  const availableIcons = [
    '📄', '🧾', '💰', '📋', '📊', '📈', '📉', '📝', 
    '🏢', '🏦', '💼', '📁', '📂', '🗂️', '📇', '🎯'
  ];

  // Cargar estadísticas de plantillas
  const fetchTemplateStats = async () => {
    try {
      const response = await fetch('/api/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplateStats(data.stats || {
          active_templates: 0,
          avg_success_rate: 0,
          total_usage: 0
        });
      }
    } catch (error) {
      console.error('Error fetching template stats:', error);
    }
  };

  // Cargar tipos de documento
  const fetchDocumentTypes = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/configuration/document-types');
      if (response.ok) {
        const data = await response.json();
        setDocumentTypes(data.types || []);
      } else {
        console.error('Error fetching document types');
      }
    } catch (error) {
      console.error('Error fetching document types:', error);
    } finally {
      setLoading(false);
    }
  };

  // Crear nuevo tipo de documento
  const createDocumentType = async () => {
    try {
      const response = await fetch('/api/configuration/document-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          icon: formData.icon,
          description: formData.description,
          required_fields: formData.required_fields.split(',').map(f => f.trim()).filter(f => f),
          extraction_template: formData.extraction_template ? JSON.parse(formData.extraction_template) : {}
        }),
      });

      if (response.ok) {
        await fetchDocumentTypes();
        setIsCreateDialogOpen(false);
        resetForm();
      } else {
        console.error('Error creating document type');
      }
    } catch (error) {
      console.error('Error creating document type:', error);
    }
  };

  // Actualizar tipo de documento
  const updateDocumentType = async () => {
    if (!selectedType) return;

    try {
      const response = await fetch(`/api/configuration/document-types/${selectedType.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          icon: formData.icon,
          description: formData.description,
          required_fields: formData.required_fields.split(',').map(f => f.trim()).filter(f => f),
          extraction_template: formData.extraction_template ? JSON.parse(formData.extraction_template) : {}
        }),
      });

      if (response.ok) {
        await fetchDocumentTypes();
        setIsEditDialogOpen(false);
        resetForm();
        setSelectedType(null);
      } else {
        console.error('Error updating document type');
      }
    } catch (error) {
      console.error('Error updating document type:', error);
    }
  };

  // Eliminar tipo de documento
  const deleteDocumentType = async (typeId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este tipo de documento?')) {
      return;
    }

    try {
      const response = await fetch(`/api/configuration/document-types/${typeId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchDocumentTypes();
      } else {
        const data = await response.json();
        alert(data.error || 'Error eliminando tipo de documento');
      }
    } catch (error) {
      console.error('Error deleting document type:', error);
    }
  };

  // Alternar estado activo/inactivo
  const toggleDocumentType = async (typeId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/configuration/document-types/${typeId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !isActive }),
      });

      if (response.ok) {
        await fetchDocumentTypes();
      } else {
        console.error('Error toggling document type');
      }
    } catch (error) {
      console.error('Error toggling document type:', error);
    }
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      name: '',
      icon: '📄',
      description: '',
      required_fields: '',
      extraction_template: ''
    });
  };

  // Abrir diálogo de edición
  const openEditDialog = (type: DocumentType) => {
    setSelectedType(type);
    setFormData({
      name: type.name,
      icon: type.icon,
      description: type.description,
      required_fields: type.required_fields.join(', '),
      extraction_template: JSON.stringify(type.extraction_template, null, 2)
    });
    setIsEditDialogOpen(true);
  };

  useEffect(() => {
    fetchDocumentTypes();
    fetchTemplateStats();
  }, []);

  if (!hasPermission('config:advanced')) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No tienes permisos para acceder a la configuración avanzada.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Tipos de Documento Personalizados
        </CardTitle>
        <CardDescription>
          Gestiona los tipos de documento que puede procesar el sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Botón para agregar nuevo tipo */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Tipos de Documento</h3>
            <p className="text-sm text-muted-foreground">
              Configura qué tipos de documentos puede procesar el sistema
            </p>
          </div>
          {hasPermission('config:update') && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Agregar Tipo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Tipo de Documento</DialogTitle>
                  <DialogDescription>
                    Define un nuevo tipo de documento personalizado
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre del Tipo</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ej: Albarán de entrega"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="icon">Icono</Label>
                      <div className="flex gap-2">
                        <Input
                          id="icon"
                          value={formData.icon}
                          onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                          className="w-20"
                        />
                        <div className="flex gap-1 flex-wrap">
                          {availableIcons.slice(0, 8).map((icon) => (
                            <Button
                              key={icon}
                              variant="outline"
                              size="sm"
                              className="w-8 h-8 p-0"
                              onClick={() => setFormData({ ...formData, icon })}
                            >
                              {icon}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe qué tipo de documento es y cuándo se usa"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="required_fields">Campos Requeridos</Label>
                    <Input
                      id="required_fields"
                      value={formData.required_fields}
                      onChange={(e) => setFormData({ ...formData, required_fields: e.target.value })}
                      placeholder="emisor, receptor, fecha, total (separados por comas)"
                    />
                    <p className="text-xs text-muted-foreground">
                      Lista de campos que deben estar presentes en este tipo de documento
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="extraction_template">Plantilla de Extracción (JSON)</Label>
                    <Textarea
                      id="extraction_template"
                      value={formData.extraction_template}
                      onChange={(e) => setFormData({ ...formData, extraction_template: e.target.value })}
                      placeholder='{"fields": {"emisor": "string", "total": "number"}}'
                      className="font-mono text-sm"
                      rows={6}
                    />
                    <p className="text-xs text-muted-foreground">
                      Plantilla JSON opcional para guiar la extracción de datos
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={createDocumentType}>
                    <Save className="h-4 w-4 mr-2" />
                    Crear Tipo
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Tabla de tipos de documento */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Campos Requeridos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Sistema</TableHead>
                <TableHead className="w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Cargando tipos de documento...
                  </TableCell>
                </TableRow>
              ) : documentTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No hay tipos de documento configurados
                  </TableCell>
                </TableRow>
              ) : (
                documentTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{type.icon}</span>
                        <span className="font-medium">{type.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm text-muted-foreground truncate">
                        {type.description}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {type.required_fields.slice(0, 3).map((field) => (
                          <Badge key={field} variant="secondary" className="text-xs">
                            {field}
                          </Badge>
                        ))}
                        {type.required_fields.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{type.required_fields.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={type.is_active ? 'default' : 'secondary'}>
                        {type.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={type.is_system ? 'outline' : 'secondary'}>
                        {type.is_system ? 'Sistema' : 'Personalizado'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {hasPermission('config:update') && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(type)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => toggleDocumentType(type.id, type.is_active)}
                            >
                              {type.is_active ? (
                                <>
                                  <X className="h-4 w-4 mr-2" />
                                  Desactivar
                                </>
                              ) : (
                                <>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Activar
                                </>
                              )}
                            </DropdownMenuItem>
                            {!type.is_system && (
                              <DropdownMenuItem 
                                onClick={() => deleteDocumentType(type.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Diálogo de edición */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Tipo de Documento</DialogTitle>
              <DialogDescription>
                Modifica la configuración del tipo de documento
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nombre del Tipo</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Albarán de entrega"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-icon">Icono</Label>
                  <div className="flex gap-2">
                    <Input
                      id="edit-icon"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      className="w-20"
                    />
                    <div className="flex gap-1 flex-wrap">
                      {availableIcons.slice(0, 8).map((icon) => (
                        <Button
                          key={icon}
                          variant="outline"
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => setFormData({ ...formData, icon })}
                        >
                          {icon}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Descripción</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe qué tipo de documento es y cuándo se usa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-required_fields">Campos Requeridos</Label>
                <Input
                  id="edit-required_fields"
                  value={formData.required_fields}
                  onChange={(e) => setFormData({ ...formData, required_fields: e.target.value })}
                  placeholder="emisor, receptor, fecha, total (separados por comas)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-extraction_template">Plantilla de Extracción (JSON)</Label>
                <Textarea
                  id="edit-extraction_template"
                  value={formData.extraction_template}
                  onChange={(e) => setFormData({ ...formData, extraction_template: e.target.value })}
                  className="font-mono text-sm"
                  rows={6}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={updateDocumentType}>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Sección de Plantillas de Extracción */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Plantillas de Extracción</h3>
              <p className="text-sm text-gray-600">
                Gestiona plantillas automáticas para mejorar la precisión de extracción por proveedor
              </p>
            </div>
            <Button
              onClick={() => setShowTemplatesModal(true)}
              className="flex items-center gap-2"
            >
              <Brain className="h-4 w-4" />
              Ver Plantillas
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">Plantillas Activas</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{templateStats.active_templates || 0}</p>
              <p className="text-sm text-blue-700">Proveedores con plantillas</p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-900">Precisión Promedio</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {templateStats.avg_success_rate ? `${(templateStats.avg_success_rate * 100).toFixed(1)}%` : '0%'}
              </p>
              <p className="text-sm text-green-700">Tasa de éxito</p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-5 w-5 text-purple-600" />
                <span className="font-medium text-purple-900">Uso Total</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">{templateStats.total_usage || 0}</p>
              <p className="text-sm text-purple-700">Aplicaciones</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Modal de Plantillas */}
    <TemplatesModal 
      isOpen={showTemplatesModal} 
      onClose={() => setShowTemplatesModal(false)} 
    />
    </>
  );
} 