'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Settings,
  AlertTriangle,
  Home,
  RefreshCw,
  Database,
  Shield,
  Palette,
  Plug
} from 'lucide-react';

export default function ConfigurationPage() {
  useEffect(() => {
    // Simular múltiples errores 404 para testing
    console.error('404 - Configuration page not implemented yet');
    
    // Intentar cargar APIs que no existen
    fetch('/api/config/system')
      .catch(error => console.error('System Config API Error:', error));
      
    fetch('/api/config/database')
      .catch(error => console.error('Database Config API Error:', error));
      
    fetch('/api/config/security')
      .catch(error => console.error('Security Config API Error:', error));
      
    // Simular error de conexión con servicio externo
    console.error('External service connection failed: https://config.gestagent.com/api');
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
          <p className="text-muted-foreground">
            Configuración del sistema y preferencias
          </p>
        </div>
      </div>

      {/* Error 404 Card */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-purple-600" />
          </div>
          <CardTitle className="text-purple-800">Error 404 - Configuración no disponible</CardTitle>
          <CardDescription className="text-purple-600">
            El panel de configuración del sistema aún no está implementado
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-purple-700">
              La configuración avanzada del sistema está en desarrollo.
            </p>
            <p className="text-xs text-purple-600">
              Error Code: CFG-404-SERVICES-UNAVAILABLE
            </p>
          </div>
          
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => window.history.back()}>
              <Home className="h-4 w-4 mr-2" />
              Volver al Dashboard
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reconectar Servicios
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mock de secciones de configuración */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="opacity-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              Configuración de Base de Datos
            </CardTitle>
            <CardDescription>Configuración de conexión y optimización</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Configuración de Supabase</p>
              <p>• Optimización de consultas</p>
              <p>• Backup automático</p>
              <p>• Monitoreo de rendimiento</p>
            </div>
          </CardContent>
        </Card>

        <Card className="opacity-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Configuración de Seguridad
            </CardTitle>
            <CardDescription>Políticas de seguridad y acceso</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Políticas de contraseñas</p>
              <p>• Autenticación de dos factores</p>
              <p>• Roles y permisos</p>
              <p>• Auditoría de seguridad</p>
            </div>
          </CardContent>
        </Card>

        <Card className="opacity-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-pink-600" />
              Configuración de Interfaz
            </CardTitle>
            <CardDescription>Personalización y temas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Temas y colores</p>
              <p>• Configuración de dashboard</p>
              <p>• Idioma y localización</p>
              <p>• Preferencias de usuario</p>
            </div>
          </CardContent>
        </Card>

        <Card className="opacity-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-5 w-5 text-orange-600" />
              Integraciones
            </CardTitle>
            <CardDescription>APIs externas y plugins</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Configuración de Mistral API</p>
              <p>• Configuración de OpenAI</p>
              <p>• Webhooks y notificaciones</p>
              <p>• Plugins personalizados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Estado del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-600">OFFLINE</div>
              <div className="text-sm text-red-700">Servicio de Configuración</div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">PENDING</div>
              <div className="text-sm text-yellow-700">Conexión a APIs</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">DEV</div>
              <div className="text-sm text-blue-700">Modo Desarrollo</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 