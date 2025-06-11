'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  Upload, 
  Search, 
  Download, 
  Eye,
  Calendar,
  Building,
  AlertCircle,
  Trash2,
  CheckSquare,
  Square,
  PackagePlus,
  FileDown,
  Layers
} from 'lucide-react';
import SageExportButton from '@/components/documents/SageExportButton';

interface Document {
  job_id: string;
  document_type: string;
  status: string;
  emitter_name?: string;
  receiver_name?: string;
  document_date?: string;
  upload_timestamp: string;
  total_amount?: number;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/documents/list');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
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

  const handleViewDocument = (documentId: string) => {
    router.push(`/dashboard/documents/${documentId}`);
  };

  const handleDownloadDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/export/${documentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ format: 'pdf' })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `documento_${documentId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json();
        alert(`Error al descargar: ${errorData.message || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Error de conexión al descargar el documento');
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este documento?')) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/delete/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        setDocuments(documents.filter(doc => doc.job_id !== documentId));
        alert(`Documento eliminado exitosamente (${result.deleteType === 'hard' ? 'permanente' : 'marcado como eliminado'})`);
      } else {
        const errorData = await response.json();
        alert(`Error al eliminar el documento: ${errorData.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Error de conexión al eliminar el documento');
    }
  };

  const handleNewDocument = () => {
    router.push('/dashboard/documents/new');
  };

  const handleSelectDocument = (documentId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedDocuments.length === filteredDocuments.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(filteredDocuments.map(doc => doc.job_id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDocuments.length === 0) return;
    
    if (!confirm(`¿Estás seguro de que quieres eliminar ${selectedDocuments.length} documentos?`)) {
      return;
    }

    try {
      for (const docId of selectedDocuments) {
        await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
      }
      
      setDocuments(documents.filter(doc => !selectedDocuments.includes(doc.job_id)));
      setSelectedDocuments([]);
      setIsSelectMode(false);
      alert(`${selectedDocuments.length} documentos eliminados exitosamente`);
    } catch (error) {
      console.error('Error in bulk delete:', error);
      alert('Error al eliminar documentos');
    }
  };

  const handleBulkExport = async () => {
    if (selectedDocuments.length === 0) return;
    
    try {
      // Importar dinámicamente la utilidad de Excel
      const { exportDocumentsToExcel } = await import('@/lib/utils/excel-export');
      
      // Preparar datos para exportación
      const selectedDocs = selectedDocuments.map(docId => {
        const doc = documents.find(d => d.job_id === docId);
        return {
          job_id: doc?.job_id || '',
          document_type: doc?.document_type || '',
          emitter_name: doc?.emitter_name,
          receiver_name: doc?.receiver_name,
          document_date: doc?.document_date,
          total_amount: doc?.total_amount,
          status: doc?.status || '',
          upload_timestamp: doc?.upload_timestamp || '',
          processed_json: null // Agregar campo requerido
        };
      }).filter(doc => doc.job_id); // Filtrar documentos válidos
      
      // Exportar a Excel con opciones avanzadas
      await exportDocumentsToExcel(selectedDocs, {
        includeDetails: true,
        includeIndex: true,
        filename: `documentos_seleccionados_${new Date().toISOString().split('T')[0]}.xlsx`
      });
      
      // Mostrar mensaje de éxito
      alert(`✅ ${selectedDocs.length} documentos exportados a Excel exitosamente`);
      
    } catch (error) {
      console.error('Error en exportación masiva:', error);
      
      // Fallback a CSV si Excel falla
      const exportData = selectedDocuments.map(docId => {
        const doc = documents.find(d => d.job_id === docId);
        return {
          id: doc?.job_id,
          emisor: doc?.emitter_name,
          receptor: doc?.receiver_name,
          fecha: doc?.document_date,
          tipo: doc?.document_type,
          importe: doc?.total_amount
        };
      });
      
      const csvContent = "data:text/csv;charset=utf-8," 
        + "ID,Emisor,Receptor,Fecha,Tipo,Importe\n"
        + exportData.map(row => `${row.id},${row.emisor},${row.receptor},${row.fecha},${row.tipo},${row.importe}`).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `documentos_${selectedDocuments.length}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert(`${selectedDocuments.length} documentos exportados exitosamente`);
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.job_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.emitter_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (doc.receiver_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (doc.document_type?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const summaryStats = {
    total: documents.length,
    completed: documents.filter(d => d.status === 'completed').length,
    processing: documents.filter(d => d.status === 'processing').length,
    error: documents.filter(d => d.status === 'error').length
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documentos</h1>
          <p className="text-muted-foreground">
            Gestión de documentos financieros digitalizados
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard/documents/new?batch=true')} 
            className="gap-2"
          >
            <Layers className="h-4 w-4" />
            Procesamiento Masivo
          </Button>
          <Button onClick={handleNewDocument} className="gap-2">
            <Upload className="h-4 w-4" />
            Nuevo Documento
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.total}</div>
            <p className="text-xs text-muted-foreground">
              Documentos procesados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.completed}</div>
            <p className="text-xs text-muted-foreground">
              Estado completado
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Procesando</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.processing}</div>
            <p className="text-xs text-muted-foreground">
              En proceso
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errores</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.error}</div>
            <p className="text-xs text-muted-foreground">
              Con errores
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por emisor, receptor, tipo o ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={isSelectMode ? "default" : "outline"}
                onClick={() => {
                  setIsSelectMode(!isSelectMode);
                  setSelectedDocuments([]);
                }}
                className="gap-2"
              >
                <CheckSquare className="h-4 w-4" />
                {isSelectMode ? 'Cancelar Selección' : 'Seleccionar Múltiple'}
              </Button>
                              <SageExportButton />
              <Button onClick={handleNewDocument} className="gap-2">
                <Upload className="h-4 w-4" />
                Nuevo Documento
              </Button>
            </div>
          </div>
          
          {/* Barra de acciones en lote */}
          {isSelectMode && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="gap-2"
                  >
                    {selectedDocuments.length === filteredDocuments.length ? (
                      <Square className="h-4 w-4" />
                    ) : (
                      <CheckSquare className="h-4 w-4" />
                    )}
                    {selectedDocuments.length === filteredDocuments.length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {selectedDocuments.length} de {filteredDocuments.length} documentos seleccionados
                  </span>
                </div>
                
                {selectedDocuments.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkExport}
                      className="gap-2"
                    >
                      <FileDown className="h-4 w-4" />
                      Exportar ({selectedDocuments.length})
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar ({selectedDocuments.length})
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Documentos ({filteredDocuments.length})</CardTitle>
          <CardDescription>
            {searchTerm ? 
              `Mostrando ${filteredDocuments.length} de ${documents.length} documentos` : 
              'Documentos financieros procesados en el sistema'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchTerm ? 'No se encontraron documentos' : 'No hay documentos'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 
                  'Intenta con otros términos de búsqueda.' : 
                  'Comienza subiendo tu primer documento.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDocuments.map((doc) => (
                <Card key={doc.job_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        {isSelectMode && (
                          <input
                            type="checkbox"
                            checked={selectedDocuments.includes(doc.job_id)}
                            onChange={() => handleSelectDocument(doc.job_id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        )}
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <FileText className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">
                            {doc.emitter_name || 'Emisor no disponible'}
                          </h3>
                          <div className="text-sm text-gray-500 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                ID: {doc.job_id.substring(0, 8)}...
                              </span>
                              {doc.document_type && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {doc.document_type}
                                </span>
                              )}
                            </div>
                            {doc.receiver_name && (
                              <div className="flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                <span>Receptor: {doc.receiver_name}</span>
                              </div>
                            )}
                            {doc.document_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>Fecha: {new Date(doc.document_date).toLocaleDateString('es-ES')}</span>
                              </div>
                            )}
                            {doc.total_amount && (
                              <div className="text-sm font-medium text-green-600">
                                Importe: €{doc.total_amount.toFixed(2)}
                              </div>
                            )}
                            {doc.upload_timestamp && (
                              <div className="text-xs text-gray-400">
                                Subido: {new Date(doc.upload_timestamp).toLocaleDateString('es-ES')} - {new Date(doc.upload_timestamp).toLocaleTimeString('es-ES')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {getStatusBadge(doc.status)}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2"
                          onClick={() => handleViewDocument(doc.job_id)}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="hidden sm:inline">Ver</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2"
                          onClick={() => handleDownloadDocument(doc.job_id)}
                        >
                          <Download className="h-4 w-4" />
                          <span className="hidden sm:inline">Descargar</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" 
                          onClick={() => handleDeleteDocument(doc.job_id)}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
} 