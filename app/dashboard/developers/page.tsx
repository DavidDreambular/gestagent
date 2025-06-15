'use client';

// Portal de Desarrolladores
// /app/dashboard/developers/page.tsx

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { 
  Key,
  Activity,
  BarChart3,
  Book,
  Code,
  Copy,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  ExternalLink,
  Webhook,
  Download,
  Shield,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import WebhookManager from '@/components/dashboard/webhooks/WebhookManager';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  status: 'active' | 'inactive' | 'revoked';
  rate_limit: number;
  usage_count: number;
  last_used_at?: string;
  created_at: string;
  expires_at?: string;
  stats?: {
    usage_last_hour: number;
    avg_response_time: number;
    error_count: number;
  };
}

export default function DevelopersPortal() {
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [rawApiKey, setRawApiKey] = useState<string | null>(null);
  
  // Form state para nueva API key
  const [newKeyForm, setNewKeyForm] = useState({
    name: '',
    description: '',
    scopes: ['documents:read', 'documents:write'],
    rateLimit: 1000,
    expiresInDays: 365
  });

  // Estadísticas generales
  const [stats, setStats] = useState({
    totalRequests: 0,
    requestsToday: 0,
    avgResponseTime: 0,
    errorRate: 0
  });

  useEffect(() => {
    loadApiKeys();
    loadStats();
  }, []);

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/developer/keys');
      
      if (!response.ok) {
        throw new Error('Failed to load API keys');
      }

      const result = await response.json();
      setApiKeys(result.data || []);

    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las API keys',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/developer/stats');
      if (response.ok) {
        const result = await response.json();
        setStats(result.data || {});
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const createApiKey = async () => {
    try {
      const response = await fetch('/api/developer/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newKeyForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create API key');
      }

      const result = await response.json();
      setRawApiKey(result.data.rawKey);
      setShowNewKeyForm(false);
      setNewKeyForm({
        name: '',
        description: '',
        scopes: ['documents:read', 'documents:write'],
        rateLimit: 1000,
        expiresInDays: 365
      });

      await loadApiKeys();

      toast({
        title: 'API Key creada',
        description: 'Tu nueva API key ha sido creada correctamente',
      });

    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error creando API key',
        variant: 'destructive',
      });
    }
  };

  const revokeApiKey = async (apiKeyId: string) => {
    try {
      const response = await fetch(`/api/developer/keys?id=${apiKeyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to revoke API key');
      }

      await loadApiKeys();

      toast({
        title: 'API Key revocada',
        description: 'La API key ha sido revocada correctamente',
      });

    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo revocar la API key',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copiado',
      description: 'Texto copiado al portapapeles',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScopeIcon = (scope: string) => {
    if (scope.includes('read')) return <Eye className="h-3 w-3" />;
    if (scope.includes('write')) return <Code className="h-3 w-3" />;
    if (scope.includes('admin')) return <Shield className="h-3 w-3" />;
    return <Key className="h-3 w-3" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-yellow-100 text-yellow-800';
      case 'revoked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Code className="h-8 w-8 text-blue-600" />
            Portal de Desarrolladores
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestiona tus API keys, revisa métricas de uso y accede a la documentación
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => window.open('/api/docs', '_blank')}
          >
            <Book className="h-4 w-4 mr-2" />
            Documentación
          </Button>
          <Button onClick={() => setShowNewKeyForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva API Key
          </Button>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-4 w-4 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Requests Totales</p>
                <p className="text-2xl font-bold">{stats.totalRequests.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Hoy</p>
                <p className="text-2xl font-bold">{stats.requestsToday.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Tiempo Promedio</p>
                <p className="text-2xl font-bold">{stats.avgResponseTime}ms</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BarChart3 className="h-4 w-4 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Tasa de Error</p>
                <p className="text-2xl font-bold">{stats.errorRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal para mostrar nueva API key */}
      {rawApiKey && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium text-green-800">
                ¡API Key creada exitosamente!
              </p>
              <p className="text-sm text-green-700">
                Esta es la única vez que verás la API key completa. Guárdala en un lugar seguro.
              </p>
              <div className="flex items-center gap-2 p-2 bg-white rounded border font-mono text-sm">
                <span className="flex-1">{rawApiKey}</span>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => copyToClipboard(rawApiKey)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setRawApiKey(null)}
              >
                Entendido
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="keys" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="keys" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Uso y Métricas
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="docs" className="flex items-center gap-2">
            <Book className="h-4 w-4" />
            Recursos
          </TabsTrigger>
        </TabsList>

        {/* Tab: API Keys */}
        <TabsContent value="keys" className="space-y-6">
          {/* Formulario nueva API key */}
          {showNewKeyForm && (
            <Card>
              <CardHeader>
                <CardTitle>Crear Nueva API Key</CardTitle>
                <CardDescription>
                  Crea una nueva API key para acceder a los endpoints de GestAgent
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre</Label>
                    <Input
                      id="name"
                      placeholder="Mi Aplicación"
                      value={newKeyForm.name}
                      onChange={(e) => setNewKeyForm({ ...newKeyForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rateLimit">Rate Limit (req/hora)</Label>
                    <Input
                      id="rateLimit"
                      type="number"
                      min="10"
                      max="10000"
                      value={newKeyForm.rateLimit}
                      onChange={(e) => setNewKeyForm({ ...newKeyForm, rateLimit: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción (opcional)</Label>
                  <Input
                    id="description"
                    placeholder="Descripción de para qué usarás esta API key"
                    value={newKeyForm.description}
                    onChange={(e) => setNewKeyForm({ ...newKeyForm, description: e.target.value })}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowNewKeyForm(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={createApiKey}
                    disabled={!newKeyForm.name.trim()}
                  >
                    Crear API Key
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de API Keys */}
          <div className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">Cargando API keys...</p>
                </CardContent>
              </Card>
            ) : apiKeys.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No tienes API keys</h3>
                  <p className="text-muted-foreground mb-4">
                    Crea tu primera API key para comenzar a usar la API de GestAgent
                  </p>
                  <Button onClick={() => setShowNewKeyForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Primera API Key
                  </Button>
                </CardContent>
              </Card>
            ) : (
              apiKeys.map((apiKey) => (
                <Card key={apiKey.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-medium">{apiKey.name}</h3>
                          <Badge className={getStatusColor(apiKey.status)}>
                            {apiKey.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Creada: {formatDate(apiKey.created_at)}</span>
                          {apiKey.last_used_at && (
                            <span>Último uso: {formatDate(apiKey.last_used_at)}</span>
                          )}
                          <span>Usos: {apiKey.usage_count.toLocaleString()}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded text-sm">
                            {apiKey.key_prefix}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowKeys({
                              ...showKeys,
                              [apiKey.id]: !showKeys[apiKey.id]
                            })}
                          >
                            {showKeys[apiKey.id] ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {apiKey.scopes.map((scope) => (
                            <Badge key={scope} variant="outline" className="text-xs">
                              {getScopeIcon(scope)}
                              <span className="ml-1">{scope}</span>
                            </Badge>
                          ))}
                        </div>

                        {apiKey.stats && (
                          <div className="grid grid-cols-3 gap-4 pt-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Última hora:</span>
                              <span className="ml-1 font-medium">{apiKey.stats.usage_last_hour}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Tiempo promedio:</span>
                              <span className="ml-1 font-medium">{apiKey.stats.avg_response_time}ms</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Errores:</span>
                              <span className="ml-1 font-medium">{apiKey.stats.error_count}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => revokeApiKey(apiKey.id)}
                          disabled={apiKey.status === 'revoked'}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Tab: Uso y Métricas */}
        <TabsContent value="usage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Métricas de Uso</CardTitle>
              <CardDescription>
                Análisis detallado del uso de tus API keys
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                <p>Gráficos de métricas de uso próximamente</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Webhooks */}
        <TabsContent value="webhooks" className="space-y-6">
          <WebhookManager hasPermission={() => true} />
        </TabsContent>

        {/* Tab: Recursos */}
        <TabsContent value="docs" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Book className="h-5 w-5" />
                  Documentación API
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Documentación completa e interactiva de todos los endpoints
                </p>
                <Button onClick={() => window.open('/api/docs', '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver Documentación
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Ejemplos de Código
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Ejemplos prácticos en diferentes lenguajes de programación
                </p>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Ejemplos
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Guía de Seguridad
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Mejores prácticas para el uso seguro de la API
                </p>
                <Button variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Leer Guía
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Soporte
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  ¿Necesitas ayuda? Nuestro equipo está aquí para ayudarte
                </p>
                <Button variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Contactar Soporte
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}