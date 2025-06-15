'use client';

// Componente de gestión de webhooks
// /components/dashboard/webhooks/WebhookManager.tsx

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { 
  Webhook,
  Plus,
  Trash2,
  ExternalLink,
  Copy,
  TestTube,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
  Settings,
  BarChart3
} from 'lucide-react';

interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  created_at: string;
  last_triggered_at?: string;
  total_calls: number;
  failed_calls: number;
}

interface WebhookEvent {
  event: string;
  description: string;
  category: 'documents' | 'users' | 'system';
}

const AVAILABLE_EVENTS: WebhookEvent[] = [
  { event: 'document.uploaded', description: 'Documento subido', category: 'documents' },
  { event: 'document.processed', description: 'Documento procesado', category: 'documents' },
  { event: 'document.error', description: 'Error procesando documento', category: 'documents' },
  { event: 'supplier.created', description: 'Proveedor creado', category: 'users' },
  { event: 'customer.created', description: 'Cliente creado', category: 'users' },
  { event: 'user.created', description: 'Usuario creado', category: 'users' },
  { event: 'invoice.generated', description: 'Factura generada', category: 'system' }
];

interface WebhookManagerProps {
  hasPermission: (permission: string) => boolean;
}

export default function WebhookManager({ hasPermission }: WebhookManagerProps) {
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);

  // Form state
  const [newWebhook, setNewWebhook] = useState({
    url: '',
    events: [] as string[]
  });

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/webhooks');
      
      if (!response.ok) {
        throw new Error('Failed to load webhooks');
      }

      const result = await response.json();
      setWebhooks(result.data || []);

    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los webhooks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createWebhook = async () => {
    try {
      if (!newWebhook.url || newWebhook.events.length === 0) {
        toast({
          title: 'Error',
          description: 'URL y al menos un evento son requeridos',
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch('/api/v1/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: newWebhook.url,
          events: newWebhook.events
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create webhook');
      }

      const result = await response.json();
      
      setShowNewForm(false);
      setNewWebhook({ url: '', events: [] });
      await loadWebhooks();

      // Mostrar la clave secreta
      if (result.data?.secret_key) {
        toast({
          title: 'Webhook creado',
          description: `Secret key: ${result.data.secret_key}`,
          duration: 10000,
        });
      }

    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error creando webhook',
        variant: 'destructive',
      });
    }
  };

  const deleteWebhook = async (webhookId: string) => {
    try {
      const response = await fetch(`/api/v1/webhooks/${webhookId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete webhook');
      }

      await loadWebhooks();

      toast({
        title: 'Webhook eliminado',
        description: 'El webhook ha sido eliminado correctamente',
      });

    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el webhook',
        variant: 'destructive',
      });
    }
  };

  const testWebhook = async (webhookId: string) => {
    try {
      setTestingWebhook(webhookId);

      const response = await fetch(`/api/v1/webhooks/${webhookId}/test`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Test failed');
      }

      toast({
        title: 'Test enviado',
        description: 'Se ha enviado un evento de prueba al webhook',
      });

    } catch (error) {
      toast({
        title: 'Error en test',
        description: 'No se pudo enviar el evento de prueba',
        variant: 'destructive',
      });
    } finally {
      setTestingWebhook(null);
    }
  };

  const copySecretKey = async (webhookId: string) => {
    try {
      const response = await fetch(`/api/v1/webhooks/${webhookId}/secret`);
      
      if (!response.ok) {
        throw new Error('Failed to get secret key');
      }

      const result = await response.json();
      await navigator.clipboard.writeText(result.data.secret_key);

      toast({
        title: 'Copiado',
        description: 'Secret key copiado al portapapeles',
      });

    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo obtener la clave secreta',
        variant: 'destructive',
      });
    }
  };

  const handleEventToggle = (event: string, checked: boolean) => {
    if (checked) {
      setNewWebhook({
        ...newWebhook,
        events: [...newWebhook.events, event]
      });
    } else {
      setNewWebhook({
        ...newWebhook,
        events: newWebhook.events.filter(e => e !== event)
      });
    }
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

  const getSuccessRate = (totalCalls: number, failedCalls: number) => {
    if (totalCalls === 0) return 100;
    return Math.round(((totalCalls - failedCalls) / totalCalls) * 100);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'documents': return '📄';
      case 'users': return '👥';
      case 'system': return '⚙️';
      default: return '🔔';
    }
  };

  if (!hasPermission('webhooks:read')) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No tienes permisos para ver los webhooks.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Webhook className="h-6 w-6" />
            Webhooks
          </h2>
          <p className="text-muted-foreground">
            Recibe notificaciones en tiempo real cuando ocurran eventos en tu cuenta
          </p>
        </div>
        
        {hasPermission('webhooks:write') && (
          <Button onClick={() => setShowNewForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Webhook
          </Button>
        )}
      </div>

      {/* Información sobre webhooks */}
      <Alert>
        <Activity className="h-4 w-4" />
        <AlertDescription>
          Los webhooks te permiten recibir notificaciones HTTP en tiempo real cuando ocurren eventos específicos. 
          Cada webhook incluye una firma HMAC-SHA256 para verificar la autenticidad de los datos.
        </AlertDescription>
      </Alert>

      {/* Formulario nuevo webhook */}
      {showNewForm && (
        <Card>
          <CardHeader>
            <CardTitle>Crear Nuevo Webhook</CardTitle>
            <CardDescription>
              Configura un endpoint para recibir notificaciones de eventos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">URL del Endpoint</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://tu-app.com/webhooks/gestagent"
                value={newWebhook.url}
                onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
              />
            </div>

            <div className="space-y-3">
              <Label>Eventos a Suscribir</Label>
              <div className="space-y-4">
                {['documents', 'users', 'system'].map(category => (
                  <div key={category} className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <span>{getCategoryIcon(category)}</span>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 ml-6">
                      {AVAILABLE_EVENTS
                        .filter(event => event.category === category)
                        .map(event => (
                          <div key={event.event} className="flex items-center space-x-2">
                            <Checkbox
                              id={event.event}
                              checked={newWebhook.events.includes(event.event)}
                              onCheckedChange={(checked) => 
                                handleEventToggle(event.event, checked as boolean)
                              }
                            />
                            <Label 
                              htmlFor={event.event} 
                              className="text-sm text-muted-foreground"
                            >
                              {event.description}
                            </Label>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewForm(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={createWebhook}
                disabled={!newWebhook.url || newWebhook.events.length === 0}
              >
                Crear Webhook
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de webhooks */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Cargando webhooks...</p>
            </CardContent>
          </Card>
        ) : webhooks.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Webhook className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No tienes webhooks configurados</h3>
              <p className="text-muted-foreground mb-4">
                Crea tu primer webhook para recibir notificaciones en tiempo real
              </p>
              {hasPermission('webhooks:write') && (
                <Button onClick={() => setShowNewForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primer Webhook
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          webhooks.map((webhook) => (
            <Card key={webhook.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <code className="bg-muted px-2 py-1 rounded text-sm">
                        {webhook.url}
                      </code>
                      <Badge variant={webhook.active ? 'default' : 'secondary'}>
                        {webhook.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(webhook.url, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {webhook.events.map((event) => (
                        <Badge key={event} variant="outline" className="text-xs">
                          {AVAILABLE_EVENTS.find(e => e.event === event)?.description || event}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Creado: {formatDate(webhook.created_at)}</span>
                      {webhook.last_triggered_at && (
                        <span>Último trigger: {formatDate(webhook.last_triggered_at)}</span>
                      )}
                      <span>Calls: {webhook.total_calls.toLocaleString()}</span>
                      <span>Éxito: {getSuccessRate(webhook.total_calls, webhook.failed_calls)}%</span>
                    </div>

                    {webhook.total_calls > 0 && (
                      <div className="grid grid-cols-3 gap-4 pt-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Activity className="h-3 w-3 text-green-600" />
                          <span className="text-muted-foreground">Total:</span>
                          <span className="font-medium">{webhook.total_calls}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          <span className="text-muted-foreground">Exitosos:</span>
                          <span className="font-medium">{webhook.total_calls - webhook.failed_calls}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-3 w-3 text-red-600" />
                          <span className="text-muted-foreground">Fallidos:</span>
                          <span className="font-medium">{webhook.failed_calls}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copySecretKey(webhook.id)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testWebhook(webhook.id)}
                      disabled={testingWebhook === webhook.id}
                    >
                      {testingWebhook === webhook.id ? (
                        <Clock className="h-3 w-3" />
                      ) : (
                        <TestTube className="h-3 w-3" />
                      )}
                    </Button>

                    {hasPermission('webhooks:write') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteWebhook(webhook.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}