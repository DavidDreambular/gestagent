"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Monitor, Globe, Workflow, Download, Camera, FileText } from 'lucide-react';

export function MCPControlPanel() {
  const [loading, setLoading] = useState(false);
  const [portal, setPortal] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Desktop capture
  const handleDesktopCapture = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/mcp/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server: 'desktop-commander',
          action: 'capture-screen',
          params: {},
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Captura realizada',
          description: `Guardada en: ${result.data.screenshot}`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error en la captura',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Portal download
  const handlePortalDownload = async () => {
    if (!portal || !username || !password) {
      toast({
        title: 'Error',
        description: 'Complete todos los campos',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/mcp/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portal,
          credentials: { username, password },
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Descarga completada',
          description: `Documento ${result.data.documentId} descargado`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error en la descarga',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Trigger workflow
  const handleWorkflowTrigger = async (workflowId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/mcp/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server: 'n8n',
          action: 'trigger-workflow',
          params: { workflowId },
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Flujo iniciado',
          description: `ID de ejecución: ${result.data.executionId}`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al iniciar flujo',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Panel de Control MCP</CardTitle>
        <CardDescription>
          Control de servidores MCP para automatización avanzada
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="desktop" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="desktop" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Desktop
            </TabsTrigger>
            <TabsTrigger value="portal" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Portales
            </TabsTrigger>
            <TabsTrigger value="workflow" className="flex items-center gap-2">
              <Workflow className="h-4 w-4" />
              Flujos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="desktop" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Captura de Escritorio</h3>
              <div className="grid gap-4">
                <Button
                  onClick={handleDesktopCapture}
                  disabled={loading}
                  className="w-full"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Capturar Pantalla Completa
                </Button>
                <Button
                  variant="outline"
                  disabled={loading}
                  className="w-full"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Capturar Ventana Activa
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="portal" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Descarga desde Portales</h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="portal">Portal</Label>
                  <Select value={portal} onValueChange={setPortal}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un portal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hacienda">Agencia Tributaria</SelectItem>
                      <SelectItem value="seg-social">Seguridad Social</SelectItem>
                      <SelectItem value="bancosantander">Banco Santander</SelectItem>
                      <SelectItem value="caixabank">CaixaBank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Usuario</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Tu usuario del portal"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tu contraseña del portal"
                  />
                </div>
                <Button
                  onClick={handlePortalDownload}
                  disabled={loading}
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Descargar Documentos
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="workflow" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Flujos de Trabajo n8n</h3>
              <div className="grid gap-4">
                <Button
                  onClick={() => handleWorkflowTrigger('process-invoices')}
                  disabled={loading}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Workflow className="mr-2 h-4 w-4" />
                  Procesar Facturas Pendientes
                </Button>
                <Button
                  onClick={() => handleWorkflowTrigger('monthly-taxes')}
                  disabled={loading}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Workflow className="mr-2 h-4 w-4" />
                  Calcular Impuestos Mensuales
                </Button>
                <Button
                  onClick={() => handleWorkflowTrigger('bank-reconciliation')}
                  disabled={loading}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Workflow className="mr-2 h-4 w-4" />
                  Conciliación Bancaria
                </Button>
                <Button
                  onClick={() => handleWorkflowTrigger('document-backup')}
                  disabled={loading}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Workflow className="mr-2 h-4 w-4" />
                  Backup de Documentos
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}