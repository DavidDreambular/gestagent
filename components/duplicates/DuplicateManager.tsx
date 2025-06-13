'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle,
  FileText,
  Merge,
  Trash2,
  Eye,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface DuplicateGroup {
  id: string;
  masterDocument: {
    id: string;
    filename: string;
    uploadDate: string;
    uploadedBy: string;
    size: number;
  };
  duplicates: Array<{
    id: string;
    filename: string;
    uploadDate: string;
    uploadedBy: string;
    size: number;
    similarity: number;
  }>;
  status: 'pending' | 'resolved' | 'ignored';
  resolvedAt?: string;
  resolvedBy?: string;
  action?: 'merged' | 'deleted' | 'kept_separate';
}

function DuplicateManager() {
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [processing, setProcessing] = useState<string | null>(null);

  // Cargar grupos de duplicados desde la API
  useEffect(() => {
    const fetchDuplicateGroups = async () => {
      try {
        const response = await fetch('/api/duplicates/groups');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.groups) {
            setDuplicateGroups(data.groups);
          }
        }
      } catch (error) {
        console.error('Error loading duplicate groups:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDuplicateGroups();
  }, []);

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES');
  };

  const getSimilarityBadge = (similarity: number) => {
    if (similarity >= 95) {
      return <Badge className="bg-red-100 text-red-800">Idéntico ({similarity}%)</Badge>;
    } else if (similarity >= 80) {
      return <Badge className="bg-orange-100 text-orange-800">Muy similar ({similarity}%)</Badge>;
    } else {
      return <Badge className="bg-yellow-100 text-yellow-800">Similar ({similarity}%)</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'ignored':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const handleAction = async (groupId: string, action: 'merge' | 'delete' | 'ignore') => {
    setProcessing(groupId);
    
    try {
      const response = await fetch(`/api/duplicates/groups/${groupId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action })
      });
      
      if (!response.ok) throw new Error('Failed to resolve duplicate group');
      
      setDuplicateGroups(prev => prev.map(group => 
        group.id === groupId 
          ? {
              ...group,
              status: action === 'ignore' ? 'ignored' : 'resolved',
              resolvedAt: new Date().toISOString(),
              resolvedBy: 'admin@empresa.com',
              action: action === 'merge' ? 'merged' : action === 'delete' ? 'deleted' : undefined
            }
          : group
      ));
      
      console.log(`✅ [Duplicates] Acción ${action} aplicada al grupo ${groupId}`);
    } catch (error) {
      console.error(`❌ [Duplicates] Error aplicando acción:`, error);
    } finally {
      setProcessing(null);
    }
  };

  const pendingGroups = duplicateGroups.filter(group => group.status === 'pending');
  const resolvedGroups = duplicateGroups.filter(group => group.status === 'resolved');
  const ignoredGroups = duplicateGroups.filter(group => group.status === 'ignored');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Duplicados</h1>
        <p className="text-muted-foreground">
          Detecta y gestiona documentos duplicados automáticamente
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">Pendientes</p>
                <p className="text-2xl font-bold">{pendingGroups.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Resueltos</p>
                <p className="text-2xl font-bold">{resolvedGroups.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-gray-600" />
              <div>
                <p className="text-sm font-medium">Ignorados</p>
                <p className="text-2xl font-bold">{ignoredGroups.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total Grupos</p>
                <p className="text-2xl font-bold">{duplicateGroups.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Pendientes ({pendingGroups.length})
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Resueltos ({resolvedGroups.length})
          </TabsTrigger>
          <TabsTrigger value="ignored">
            Ignorados ({ignoredGroups.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingGroups.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">¡No hay duplicados pendientes!</h3>
                <p className="text-gray-600">Todos los duplicados han sido procesados</p>
              </CardContent>
            </Card>
          ) : (
            pendingGroups.map((group) => (
              <Card key={group.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {getStatusIcon(group.status)}
                      Grupo de Duplicados
                    </CardTitle>
                    <Badge variant="outline">
                      {group.duplicates.length + 1} documentos
                    </Badge>
                  </div>
                  <CardDescription>
                    Documentos similares detectados automáticamente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Master Document */}
                  <div className="border-l-4 border-blue-500 pl-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-blue-700">Documento Principal</h4>
                        <p className="text-sm">{group.masterDocument.filename}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(group.masterDocument.uploadDate)}
                          </span>
                          <span className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            {group.masterDocument.uploadedBy}
                          </span>
                          <span>{formatFileSize(group.masterDocument.size)}</span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        <Eye className="h-3 w-3 mr-1" />
                        Ver
                      </Button>
                    </div>
                  </div>

                  {/* Duplicates */}
                  <div className="space-y-3">
                    {group.duplicates.map((duplicate) => (
                      <div key={duplicate.id} className="border-l-4 border-orange-500 pl-4 bg-orange-50 p-3 rounded-r">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-orange-700">Posible Duplicado</h4>
                              {getSimilarityBadge(duplicate.similarity)}
                            </div>
                            <p className="text-sm">{duplicate.filename}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                              <span className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formatDate(duplicate.uploadDate)}
                              </span>
                              <span className="flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                {duplicate.uploadedBy}
                              </span>
                              <span>{formatFileSize(duplicate.size)}</span>
                            </div>
                          </div>
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3 mr-1" />
                            Ver
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-4 border-t">
                    <Button
                      onClick={() => handleAction(group.id, 'merge')}
                      disabled={processing === group.id}
                      className="flex-1"
                    >
                      <Merge className="h-4 w-4 mr-2" />
                      Fusionar Duplicados
                    </Button>
                    <Button
                      onClick={() => handleAction(group.id, 'delete')}
                      disabled={processing === group.id}
                      variant="destructive"
                      className="flex-1"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar Duplicados
                    </Button>
                    <Button
                      onClick={() => handleAction(group.id, 'ignore')}
                      disabled={processing === group.id}
                      variant="outline"
                    >
                      Ignorar
                    </Button>
                  </div>
                  
                  {processing === group.id && (
                    <div className="text-center text-sm text-gray-600">
                      Procesando acción...
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="resolved" className="space-y-4">
          {resolvedGroups.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(group.status)}
                    Grupo Resuelto
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800">
                      {group.action === 'merged' ? 'Fusionado' : 'Eliminado'}
                    </Badge>
                    <Badge variant="outline">
                      {group.duplicates.length + 1} documentos
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">
                  <p>Resuelto el {formatDate(group.resolvedAt!)} por {group.resolvedBy}</p>
                  <p className="mt-1">Documento principal: {group.masterDocument.filename}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="ignored" className="space-y-4">
          {ignoredGroups.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(group.status)}
                    Grupo Ignorado
                  </CardTitle>
                  <Badge variant="outline">
                    {group.duplicates.length + 1} documentos
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">
                  <p>Marcado como no duplicado el {formatDate(group.resolvedAt!)} por {group.resolvedBy}</p>
                  <p className="mt-1">Documento principal: {group.masterDocument.filename}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export { DuplicateManager };
export default DuplicateManager;