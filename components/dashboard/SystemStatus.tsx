'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Database, 
  Server, 
  Wifi, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  RefreshCw,
  Zap,
  HardDrive,
  Cpu,
  MemoryStick
} from 'lucide-react';

interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  services: {
    database: {
      status: 'online' | 'offline' | 'degraded';
      responseTime: number;
      lastCheck: string;
    };
    api: {
      status: 'online' | 'offline' | 'degraded';
      responseTime: number;
      lastCheck: string;
    };
    mistral: {
      status: 'online' | 'offline' | 'degraded';
      responseTime: number;
      lastCheck: string;
    };
    storage: {
      status: 'online' | 'offline' | 'degraded';
      usedSpace: number;
      totalSpace: number;
      lastCheck: string;
    };
  };
  performance: {
    cpuUsage: number;
    memoryUsage: number;
    activeConnections: number;
    requestsPerMinute: number;
  };
  lastUpdated: string;
}

export default function SystemStatus() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Función para cargar estado del sistema
  const loadSystemHealth = async () => {
    try {
      setError(null);
      
      // Simular llamada a API de estado del sistema
      // En producción sería: const response = await fetch('/api/system/health');
      
      // Datos simulados para demo
      const mockHealth: SystemHealth = {
        overall: 'healthy',
        services: {
          database: {
            status: 'online',
            responseTime: 45,
            lastCheck: new Date().toISOString()
          },
          api: {
            status: 'online',
            responseTime: 120,
            lastCheck: new Date().toISOString()
          },
          mistral: {
            status: 'online',
            responseTime: 2500,
            lastCheck: new Date().toISOString()
          },
          storage: {
            status: 'online',
            usedSpace: 15.7, // GB
            totalSpace: 100, // GB
            lastCheck: new Date().toISOString()
          }
        },
        performance: {
          cpuUsage: Math.floor(Math.random() * 30) + 20, // 20-50%
          memoryUsage: Math.floor(Math.random() * 25) + 35, // 35-60%
          activeConnections: Math.floor(Math.random() * 50) + 10,
          requestsPerMinute: Math.floor(Math.random() * 100) + 50
        },
        lastUpdated: new Date().toISOString()
      };

      setSystemHealth(mockHealth);
      console.log('✅ [SYSTEM] Estado del sistema actualizado');

    } catch (err) {
      console.error('❌ [SYSTEM] Error cargando estado:', err);
      setError(err instanceof Error ? err.message : 'Error cargando estado del sistema');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    loadSystemHealth();
    
    if (autoRefresh) {
      const interval = setInterval(loadSystemHealth, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Función para obtener color del estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'degraded':
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'offline':
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Función para obtener icono del estado
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
      case 'healthy':
        return <CheckCircle className="h-4 w-4" />;
      case 'degraded':
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'offline':
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Estado del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Cargando estado del sistema...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Estado del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            onClick={loadSystemHealth} 
            className="mt-4"
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!systemHealth) return null;

  return (
    <div className="space-y-6">
      {/* Estado General */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              <CardTitle>Estado del Sistema</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(systemHealth.overall)}>
                {getStatusIcon(systemHealth.overall)}
                <span className="ml-1 capitalize">{systemHealth.overall}</span>
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={loadSystemHealth}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          <CardDescription>
            Última actualización: {new Date(systemHealth.lastUpdated).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Base de Datos */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span className="font-medium">Base de Datos</span>
              </div>
              <Badge className={getStatusColor(systemHealth.services.database.status)}>
                {getStatusIcon(systemHealth.services.database.status)}
                <span className="ml-1 capitalize">{systemHealth.services.database.status}</span>
              </Badge>
              <p className="text-sm text-muted-foreground">
                Respuesta: {systemHealth.services.database.responseTime}ms
              </p>
            </div>

            {/* API */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                <span className="font-medium">API</span>
              </div>
              <Badge className={getStatusColor(systemHealth.services.api.status)}>
                {getStatusIcon(systemHealth.services.api.status)}
                <span className="ml-1 capitalize">{systemHealth.services.api.status}</span>
              </Badge>
              <p className="text-sm text-muted-foreground">
                Respuesta: {systemHealth.services.api.responseTime}ms
              </p>
            </div>

            {/* Mistral AI */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span className="font-medium">Mistral AI</span>
              </div>
              <Badge className={getStatusColor(systemHealth.services.mistral.status)}>
                {getStatusIcon(systemHealth.services.mistral.status)}
                <span className="ml-1 capitalize">{systemHealth.services.mistral.status}</span>
              </Badge>
              <p className="text-sm text-muted-foreground">
                Respuesta: {systemHealth.services.mistral.responseTime}ms
              </p>
            </div>

            {/* Almacenamiento */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                <span className="font-medium">Almacenamiento</span>
              </div>
              <Badge className={getStatusColor(systemHealth.services.storage.status)}>
                {getStatusIcon(systemHealth.services.storage.status)}
                <span className="ml-1 capitalize">{systemHealth.services.storage.status}</span>
              </Badge>
              <div className="space-y-1">
                <Progress 
                  value={(systemHealth.services.storage.usedSpace / systemHealth.services.storage.totalSpace) * 100} 
                  className="h-2"
                />
                <p className="text-sm text-muted-foreground">
                  {systemHealth.services.storage.usedSpace.toFixed(1)}GB / {systemHealth.services.storage.totalSpace}GB
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rendimiento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Rendimiento del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* CPU */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">CPU</span>
                <span className="text-sm text-muted-foreground">
                  {systemHealth.performance.cpuUsage}%
                </span>
              </div>
              <Progress value={systemHealth.performance.cpuUsage} className="h-2" />
            </div>

            {/* Memoria */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Memoria</span>
                <span className="text-sm text-muted-foreground">
                  {systemHealth.performance.memoryUsage}%
                </span>
              </div>
              <Progress value={systemHealth.performance.memoryUsage} className="h-2" />
            </div>

            {/* Conexiones Activas */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                <span className="font-medium">Conexiones</span>
              </div>
              <p className="text-2xl font-bold">{systemHealth.performance.activeConnections}</p>
              <p className="text-sm text-muted-foreground">activas</p>
            </div>

            {/* Requests por Minuto */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="font-medium">Requests/min</span>
              </div>
              <p className="text-2xl font-bold">{systemHealth.performance.requestsPerMinute}</p>
              <p className="text-sm text-muted-foreground">último minuto</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuración de Auto-refresh */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="auto-refresh"
          checked={autoRefresh}
          onChange={(e) => setAutoRefresh(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="auto-refresh" className="text-sm text-muted-foreground">
          Actualización automática cada 30 segundos
        </label>
      </div>
    </div>
  );
} 