import { MCPControlPanel } from '@/components/mcp-control-panel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function AutomationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Automatización</h1>
        <p className="text-muted-foreground">
          Control de procesos automatizados con servidores MCP
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Procesos Activos
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              2 facturas, 1 conciliación
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completados Hoy
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              +20% desde ayer
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              En Cola
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">
              Próxima ejecución: 5 min
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Errores
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">
              Portal no disponible
            </p>
          </CardContent>
        </Card>
      </div>

      {/* MCP Control Panel */}
      <MCPControlPanel />

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
          <CardDescription>
            Últimas ejecuciones de procesos automatizados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">Descarga Banco Santander</p>
                  <p className="text-sm text-muted-foreground">
                    15 movimientos descargados
                  </p>
                </div>
              </div>
              <span className="text-sm text-muted-foreground">Hace 5 min</span>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">Procesamiento de Facturas</p>
                  <p className="text-sm text-muted-foreground">
                    3 facturas procesadas con OCR
                  </p>
                </div>
              </div>
              <span className="text-sm text-muted-foreground">Hace 12 min</span>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <Activity className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium">Conciliación Bancaria</p>
                  <p className="text-sm text-muted-foreground">
                    En progreso - 45% completado
                  </p>
                </div>
              </div>
              <span className="text-sm text-muted-foreground">Iniciado hace 3 min</span>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="font-medium">Descarga Agencia Tributaria</p>
                  <p className="text-sm text-muted-foreground">
                    Error: Portal en mantenimiento
                  </p>
                </div>
              </div>
              <span className="text-sm text-muted-foreground">Hace 25 min</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}