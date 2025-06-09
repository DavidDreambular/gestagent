'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  Settings,
  Building2,
  Key,
  Bell,
  Database,
  Shield,
  Save,
  Eye,
  EyeOff,
  TestTube,
  Upload
} from 'lucide-react';
import AdvancedTab from '@/components/dashboard/configuration/AdvancedTab';

export default function ConfigurationPage() {
  const { hasPermission, userRole } = usePermissions();
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Verificar permisos de acceso
  if (!hasPermission('config:read')) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            No tienes permisos para acceder a la configuración del sistema.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
          <p className="text-muted-foreground">
            Configuración del sistema y preferencias de la gestoría
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          Rol: {userRole}
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger 
            value="apis" 
            className="flex items-center gap-2"
            disabled={!hasPermission('config:apis')}
          >
            <Key className="h-4 w-4" />
            APIs
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificaciones
          </TabsTrigger>
          <TabsTrigger 
            value="backup" 
            className="flex items-center gap-2"
            disabled={!hasPermission('config:backup')}
          >
            <Database className="h-4 w-4" />
            Backup
          </TabsTrigger>
          <TabsTrigger 
            value="advanced" 
            className="flex items-center gap-2"
            disabled={!hasPermission('config:advanced')}
          >
            <Settings className="h-4 w-4" />
            Avanzado
          </TabsTrigger>
        </TabsList>

        {/* Tab General - Datos de Empresa */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Información de la Empresa
              </CardTitle>
              <CardDescription>
                Datos básicos de la gestoría que aparecerán en documentos y facturas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Nombre de la Empresa</Label>
                  <Input 
                    id="company-name" 
                    placeholder="Gestoría Ejemplo S.L."
                    disabled={!hasPermission('config:update')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-cif">CIF</Label>
                  <Input 
                    id="company-cif" 
                    placeholder="B12345678"
                    disabled={!hasPermission('config:update')}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="company-address">Dirección</Label>
                <Textarea 
                  id="company-address" 
                  placeholder="Calle Ejemplo, 123&#10;28001 Madrid, España"
                  disabled={!hasPermission('config:update')}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-phone">Teléfono</Label>
                  <Input 
                    id="company-phone" 
                    placeholder="+34 91 123 45 67"
                    disabled={!hasPermission('config:update')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-email">Email</Label>
                  <Input 
                    id="company-email" 
                    type="email"
                    placeholder="info@gestoria.com"
                    disabled={!hasPermission('config:update')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-logo">Logo de la Empresa</Label>
                <div className="flex items-center gap-4">
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2"
                    disabled={!hasPermission('config:update')}
                  >
                    <Upload className="h-4 w-4" />
                    Subir Logo
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Formatos: PNG, JPG (máx. 2MB)
                  </span>
                </div>
              </div>

              {hasPermission('config:update') && (
                <div className="flex justify-end">
                  <Button className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Guardar Cambios
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab APIs */}
        <TabsContent value="apis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Configuración de APIs
              </CardTitle>
              <CardDescription>
                Gestión de claves API para servicios externos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mistral API */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Mistral OCR API</h3>
                  <Badge variant="outline">OCR</Badge>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mistral-key">API Key</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="mistral-key"
                      type={showApiKeys ? "text" : "password"}
                      placeholder="••••••••••••••••••••••••••••••••"
                      disabled={!hasPermission('config:apis')}
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setShowApiKeys(!showApiKeys)}
                    >
                      {showApiKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" className="flex items-center gap-2">
                      <TestTube className="h-4 w-4" />
                      Test
                    </Button>
                  </div>
                </div>
              </div>

              {/* OpenAI API */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">OpenAI API</h3>
                  <Badge variant="outline">LLM</Badge>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="openai-key">API Key</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="openai-key"
                      type={showApiKeys ? "text" : "password"}
                      placeholder="••••••••••••••••••••••••••••••••"
                      disabled={!hasPermission('config:apis')}
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setShowApiKeys(!showApiKeys)}
                    >
                      {showApiKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" className="flex items-center gap-2">
                      <TestTube className="h-4 w-4" />
                      Test
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="openai-model">Modelo</Label>
                  <select 
                    id="openai-model" 
                    className="w-full p-2 border rounded-md"
                    disabled={!hasPermission('config:apis')}
                  >
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </select>
                </div>
              </div>

              {hasPermission('config:apis') && (
                <div className="flex justify-end">
                  <Button className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Guardar APIs
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Notificaciones */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Configuración de Notificaciones
              </CardTitle>
              <CardDescription>
                Gestión granular de alertas y notificaciones del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tipos de Notificación */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Tipos de Notificación</h3>
                
                {/* Nuevos Documentos */}
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Nuevos Documentos</Label>
                      <p className="text-sm text-muted-foreground">
                        Alertas cuando se suben o procesan nuevos documentos
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 ml-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Email</Label>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Push</Label>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">In-App</Label>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                {/* Errores de Procesamiento */}
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Errores de Procesamiento</Label>
                      <p className="text-sm text-muted-foreground">
                        Alertas cuando fallan procesos de OCR o validación
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 ml-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Email</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Push</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">In-App</Label>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                {/* Vencimientos */}
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Vencimientos</Label>
                      <p className="text-sm text-muted-foreground">
                        Recordatorios de fechas de vencimiento de documentos
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 ml-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Email</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Push</Label>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">In-App</Label>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                {/* Actualizaciones de Sistema */}
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Actualizaciones de Sistema</Label>
                      <p className="text-sm text-muted-foreground">
                        Notificaciones sobre nuevas funciones y mantenimiento
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 ml-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Email</Label>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Push</Label>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">In-App</Label>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              </div>

              {/* Configuración de Frecuencia */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Frecuencia de Notificaciones</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-frequency">Frecuencia de Email</Label>
                    <select 
                      id="email-frequency" 
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="immediate">Inmediato</option>
                      <option value="hourly">Cada hora</option>
                      <option value="daily">Resumen diario</option>
                      <option value="weekly">Resumen semanal</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="push-frequency">Frecuencia de Push</Label>
                    <select 
                      id="push-frequency" 
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="immediate">Inmediato</option>
                      <option value="hourly">Cada hora</option>
                      <option value="daily">Una vez al día</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Horario de No Molestar */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Horario de No Molestar</h3>
                <div className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Activar horario de no molestar</Label>
                    <Switch />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quiet-start">Hora de inicio</Label>
                      <Input 
                        id="quiet-start"
                        type="time"
                        defaultValue="22:00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quiet-end">Hora de fin</Label>
                      <Input 
                        id="quiet-end"
                        type="time"
                        defaultValue="08:00"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Días de la semana</Label>
                    <div className="flex gap-2">
                      {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, index) => (
                        <Button 
                          key={index}
                          variant="outline" 
                          size="sm"
                          className="w-8 h-8 p-0"
                        >
                          {day}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Guardar Preferencias
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Backup */}
        <TabsContent value="backup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Configuración de Backup
              </CardTitle>
              <CardDescription>
                Gestión de copias de seguridad automáticas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Configuración de Backup Automático */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Backup Automático</h3>
                
                <div className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Activar backup automático</Label>
                      <p className="text-sm text-muted-foreground">
                        Realizar copias de seguridad de forma automática
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="backup-frequency">Frecuencia</Label>
                      <select 
                        id="backup-frequency" 
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="daily">Diario</option>
                        <option value="weekly">Semanal</option>
                        <option value="monthly">Mensual</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="backup-time">Hora de ejecución</Label>
                      <Input 
                        id="backup-time"
                        type="time"
                        defaultValue="02:00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="backup-retention">Retención (días)</Label>
                    <Input 
                      id="backup-retention"
                      type="number"
                      defaultValue="30"
                      min="1"
                      max="365"
                    />
                    <p className="text-xs text-muted-foreground">
                      Número de días que se conservarán los backups
                    </p>
                  </div>
                </div>
              </div>

              {/* Tipos de Datos a Respaldar */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Tipos de Datos</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label className="font-medium">Documentos</Label>
                      <p className="text-sm text-muted-foreground">
                        PDFs originales y datos procesados
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label className="font-medium">Base de Datos</Label>
                      <p className="text-sm text-muted-foreground">
                        Metadatos y configuraciones
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label className="font-medium">Configuración</Label>
                      <p className="text-sm text-muted-foreground">
                        Ajustes del sistema y usuarios
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label className="font-medium">Logs de Auditoría</Label>
                      <p className="text-sm text-muted-foreground">
                        Registros de actividad del sistema
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>

              {/* Destino del Backup */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Destino del Backup</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input type="radio" id="local" name="backup-destination" value="local" defaultChecked />
                    <Label htmlFor="local">Local (servidor)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="radio" id="cloud" name="backup-destination" value="cloud" />
                    <Label htmlFor="cloud">Cloud (AWS S3, Google Drive)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="radio" id="both" name="backup-destination" value="both" />
                    <Label htmlFor="both">Ambos (local + cloud)</Label>
                  </div>
                </div>
              </div>

              {/* Backup Manual */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Backup Manual</h3>
                
                <div className="p-4 border rounded-lg space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Crear una copia de seguridad inmediata de todos los datos
                  </p>
                  <Button className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Crear Backup Ahora
                  </Button>
                </div>
              </div>

              {/* Historial de Backups */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Historial de Backups</h3>
                
                <div className="space-y-2">
                  {[
                    { date: '2024-01-15 02:00', size: '2.3 GB', status: 'Exitoso' },
                    { date: '2024-01-14 02:00', size: '2.1 GB', status: 'Exitoso' },
                    { date: '2024-01-13 02:00', size: '2.0 GB', status: 'Exitoso' },
                    { date: '2024-01-12 02:00', size: '1.9 GB', status: 'Error' },
                    { date: '2024-01-11 02:00', size: '1.8 GB', status: 'Exitoso' }
                  ].map((backup, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          backup.status === 'Exitoso' ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <div>
                          <p className="font-medium">{backup.date}</p>
                          <p className="text-sm text-muted-foreground">{backup.size}</p>
                        </div>
                      </div>
                      <Badge variant={backup.status === 'Exitoso' ? 'default' : 'destructive'}>
                        {backup.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Guardar Configuración
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Avanzado */}
        <TabsContent value="advanced" className="space-y-6">
          <AdvancedTab hasPermission={hasPermission} />
        </TabsContent>
      </Tabs>
    </div>
  );
} 