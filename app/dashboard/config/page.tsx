'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  Key, 
  Bell, 
  Shield, 
  Monitor,
  AlertCircle,
  CheckCircle,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  TestTube,
  Activity,
  HardDrive
} from 'lucide-react';

interface SystemConfig {
  mistralApiKey: string;
  mistralModel: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  enableNotifications: boolean;
  maxFileSize: number;
  sessionTimeout: number;
  enableAuditLog: boolean;
  maxConcurrentProcessing: number;
  enableAutoBackup: boolean;
  backupFrequency: string;
}

interface SystemStatus {
  database: { status: 'healthy' | 'warning' | 'error', message: string };
  mistral: { status: 'healthy' | 'warning' | 'error', message: string };
  email: { status: 'healthy' | 'warning' | 'error', message: string };
  storage: { status: 'healthy' | 'warning' | 'error', message: string };
  systemLoad: number;
  memoryUsage: number;
  diskUsage: number;
}

export default function ConfigurationPage() {
  const [config, setConfig] = useState<SystemConfig>({
    mistralApiKey: '',
    mistralModel: 'mistral-large-latest',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    enableNotifications: true,
    maxFileSize: 10,
    sessionTimeout: 24,
    enableAuditLog: true,
    maxConcurrentProcessing: 5,
    enableAutoBackup: false,
    backupFrequency: 'daily'
  });

  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    database: { status: 'healthy', message: 'PostgreSQL conectado' },
    mistral: { status: 'warning', message: 'API Key no configurada' },
    email: { status: 'warning', message: 'SMTP no configurado' },
    storage: { status: 'healthy', message: 'Espacio suficiente' },
    systemLoad: 0.3,
    memoryUsage: 45.2,
    diskUsage: 23.8
  });

  const [loading, setLoading] = useState(false);
  const [testingService, setTestingService] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const getStatusIcon = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
    }
  };

  const saveConfiguration = async () => {
    setLoading(true);
    try {
      console.log('💾 [Config] Guardando configuración:', config);
      const response = await fetch('/api/admin/configuration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      });
      
      if (response.ok) {
        console.log('✅ [Config] Configuración guardada exitosamente');
      } else {
        throw new Error('Error al guardar configuración');
      }
    } catch (error) {
      console.error('❌ [Config] Error guardando configuración:', error);
    } finally {
      setLoading(false);
    }
  };

  const testService = async (service: string) => {
    setTestingService(service);
    try {
      console.log(`🧪 [Config] Probando servicio: ${service}`);
      const response = await fetch(`/api/admin/test-service`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ service })
      });
      
      if (response.ok) {
        console.log(`✅ [Config] Test de ${service} exitoso`);
      } else {
        throw new Error(`Error al probar ${service}`);
      }
    } catch (error) {
      console.error(`❌ [Config] Error en test de ${service}:`, error);
    } finally {
      setTestingService(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración del Sistema</h1>
        <p className="text-muted-foreground">
          Configura APIs, notificaciones, seguridad y monitoreo del sistema
        </p>
      </div>

      {/* System Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Estado del Sistema
          </CardTitle>
          <CardDescription>
            Monitoreo en tiempo real de los servicios críticos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Object.entries(systemStatus).slice(0, 4).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  {getStatusIcon(value.status)}
                  <span className="font-medium capitalize">{key}</span>
                </div>
                <Badge className={getStatusColor(value.status)}>
                  {value.status}
                </Badge>
              </div>
            ))}
          </div>
          
          {/* System Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Carga del Sistema</span>
                <span className="text-sm font-medium">{(systemStatus.systemLoad * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${systemStatus.systemLoad * 100}%` }}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Uso de Memoria</span>
                <span className="text-sm font-medium">{systemStatus.memoryUsage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${systemStatus.memoryUsage}%` }}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Uso de Disco</span>
                <span className="text-sm font-medium">{systemStatus.diskUsage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${systemStatus.diskUsage}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Tabs */}
      <Tabs defaultValue="apis" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="apis">APIs</TabsTrigger>
          <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
          <TabsTrigger value="security">Seguridad</TabsTrigger>
          <TabsTrigger value="performance">Rendimiento</TabsTrigger>
        </TabsList>

        {/* APIs Configuration */}
        <TabsContent value="apis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Configuración de APIs
              </CardTitle>
              <CardDescription>
                Configura las claves de API para servicios externos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mistral API */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium">Mistral AI</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mistralApiKey">API Key</Label>
                    <div className="relative">
                      <Input
                        id="mistralApiKey"
                        type={showSecrets.mistralApiKey ? "text" : "password"}
                        value={config.mistralApiKey}
                        onChange={(e) => setConfig(prev => ({ ...prev, mistralApiKey: e.target.value }))}
                        placeholder="Ingresa tu Mistral API Key"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowSecrets(prev => ({ ...prev, mistralApiKey: !prev.mistralApiKey }))}
                      >
                        {showSecrets.mistralApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mistralModel">Modelo</Label>
                    <select
                      id="mistralModel"
                      value={config.mistralModel}
                      onChange={(e) => setConfig(prev => ({ ...prev, mistralModel: e.target.value }))}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="mistral-large-latest">Mistral Large (Latest)</option>
                      <option value="mistral-medium-latest">Mistral Medium (Latest)</option>
                      <option value="mistral-small-latest">Mistral Small (Latest)</option>
                    </select>
                  </div>
                </div>
                <Button
                  onClick={() => testService('mistral')}
                  disabled={!config.mistralApiKey || testingService === 'mistral'}
                  size="sm"
                  variant="outline"
                >
                  {testingService === 'mistral' ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Probando...
                    </>
                  ) : (
                    <>
                      <TestTube className="h-4 w-4 mr-2" />
                      Probar Conexión
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Configuration */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Configuración de Notificaciones
              </CardTitle>
              <CardDescription>
                Configura el sistema de notificaciones por email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-medium">Email (SMTP)</h4>
                  <Switch
                    checked={config.enableNotifications}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enableNotifications: checked }))}
                  />
                </div>
                
                {config.enableNotifications && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtpHost">Servidor SMTP</Label>
                      <Input
                        id="smtpHost"
                        value={config.smtpHost}
                        onChange={(e) => setConfig(prev => ({ ...prev, smtpHost: e.target.value }))}
                        placeholder="smtp.gmail.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpPort">Puerto</Label>
                      <Input
                        id="smtpPort"
                        type="number"
                        value={config.smtpPort}
                        onChange={(e) => setConfig(prev => ({ ...prev, smtpPort: parseInt(e.target.value) }))}
                        placeholder="587"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpUser">Usuario</Label>
                      <Input
                        id="smtpUser"
                        value={config.smtpUser}
                        onChange={(e) => setConfig(prev => ({ ...prev, smtpUser: e.target.value }))}
                        placeholder="tu-email@dominio.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpPassword">Contraseña</Label>
                      <div className="relative">
                        <Input
                          id="smtpPassword"
                          type={showSecrets.smtpPassword ? "text" : "password"}
                          value={config.smtpPassword}
                          onChange={(e) => setConfig(prev => ({ ...prev, smtpPassword: e.target.value }))}
                          placeholder="Contraseña de aplicación"
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowSecrets(prev => ({ ...prev, smtpPassword: !prev.smtpPassword }))}
                        >
                          {showSecrets.smtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                {config.enableNotifications && (
                  <Button
                    onClick={() => testService('email')}
                    disabled={!config.smtpHost || testingService === 'email'}
                    size="sm"
                    variant="outline"
                  >
                    {testingService === 'email' ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Enviando email de prueba...
                      </>
                    ) : (
                      <>
                        <TestTube className="h-4 w-4 mr-2" />
                        Enviar Email de Prueba
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Configuration */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Configuración de Seguridad
              </CardTitle>
              <CardDescription>
                Configura la seguridad del sistema y controles de acceso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-lg font-medium">Autenticación</h4>
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Timeout de Sesión (horas)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={config.sessionTimeout}
                      onChange={(e) => setConfig(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                      min="1"
                      max="168"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enableAuditLog"
                      checked={config.enableAuditLog}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enableAuditLog: checked }))}
                    />
                    <Label htmlFor="enableAuditLog">Habilitar Auditoría</Label>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-lg font-medium">Archivos</h4>
                  <div className="space-y-2">
                    <Label htmlFor="maxFileSize">Tamaño Máximo (MB)</Label>
                    <Input
                      id="maxFileSize"
                      type="number"
                      value={config.maxFileSize}
                      onChange={(e) => setConfig(prev => ({ ...prev, maxFileSize: parseInt(e.target.value) }))}
                      min="1"
                      max="100"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Configuration */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Configuración de Rendimiento
              </CardTitle>
              <CardDescription>
                Optimiza el rendimiento del sistema y uso de recursos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-lg font-medium">Procesamiento</h4>
                  <div className="space-y-2">
                    <Label htmlFor="maxConcurrentProcessing">Procesamiento Concurrente</Label>
                    <Input
                      id="maxConcurrentProcessing"
                      type="number"
                      value={config.maxConcurrentProcessing}
                      onChange={(e) => setConfig(prev => ({ ...prev, maxConcurrentProcessing: parseInt(e.target.value) }))}
                      min="1"
                      max="20"
                    />
                    <p className="text-xs text-muted-foreground">
                      Número máximo de documentos procesados simultáneamente
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-lg font-medium">Backup</h4>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enableAutoBackup"
                      checked={config.enableAutoBackup}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enableAutoBackup: checked }))}
                    />
                    <Label htmlFor="enableAutoBackup">Habilitar Backup Automático</Label>
                  </div>
                  {config.enableAutoBackup && (
                    <div className="space-y-2">
                      <Label htmlFor="backupFrequency">Frecuencia</Label>
                      <select
                        id="backupFrequency"
                        value={config.backupFrequency}
                        onChange={(e) => setConfig(prev => ({ ...prev, backupFrequency: e.target.value }))}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="daily">Diario</option>
                        <option value="weekly">Semanal</option>
                        <option value="monthly">Mensual</option>
                      </select>
                    </div>
                  )}
                  <Button
                    onClick={() => testService('backup')}
                    disabled={testingService === 'backup'}
                    size="sm"
                    variant="outline"
                  >
                    {testingService === 'backup' ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Creando backup...
                      </>
                    ) : (
                      <>
                        <HardDrive className="h-4 w-4 mr-2" />
                        Crear Backup Manual
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={saveConfiguration}
          disabled={loading}
          size="lg"
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar Configuración
            </>
          )}
        </Button>
      </div>
    </div>
  );
}