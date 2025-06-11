'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock,
  Loader2,
  X,
  Timer,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Zap,
  GitMerge,
  Link,
  Users
} from 'lucide-react';

interface BatchJob {
  jobId: string;
  fileName: string;
  status: 'waiting' | 'processing' | 'completed' | 'error' | 'cancelled';
  progress: number;
  error?: string;
  startTime?: string;
  endTime?: string;
  result?: {
    documentId?: string;
    extractedData?: any;
    supplierData?: any;
    customerData?: any;
    duplicateInfo?: {
      hasDuplicates: boolean;
      candidates: any[];
      recommendedAction: string;
    };
  };
}

interface BatchProcessingQueueProps {
  jobIds: string[];
  onComplete?: (results: any[]) => void;
  onCancel?: () => void;
}

export function BatchProcessingQueue({ jobIds, onComplete, onCancel }: BatchProcessingQueueProps) {
  const [jobs, setJobs] = useState<Map<string, BatchJob>>(new Map());
  const [isPolling, setIsPolling] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    errors: 0,
    cancelled: 0,
    processing: 0,
    waiting: 0,
    duplicatesFound: 0,
    suppliersCreated: 0,
    customersCreated: 0
  });

  // Función para obtener estado de jobs
  const fetchJobStatuses = useCallback(async () => {
    if (!isPolling || jobIds.length === 0) return;

    try {
      const responses = await Promise.all(
        jobIds.map(jobId => 
          fetch(`/api/documents/upload-batch?jobId=${jobId}`)
            .then(res => res.json())
            .catch(() => null)
        )
      );

      const newJobs = new Map<string, BatchJob>();
      let newStats = {
        total: jobIds.length,
        completed: 0,
        errors: 0,
        cancelled: 0,
        processing: 0,
        waiting: 0,
        duplicatesFound: 0,
        suppliersCreated: 0,
        customersCreated: 0
      };

      responses.forEach((response, index) => {
        if (response?.success && response.job) {
          const job = response.job;
          newJobs.set(job.jobId, job);

          // Actualizar estadísticas
          switch (job.status) {
            case 'completed':
              newStats.completed++;
              if (job.result?.duplicateInfo?.hasDuplicates) {
                newStats.duplicatesFound++;
              }
              if (job.result?.supplierData) {
                newStats.suppliersCreated++;
              }
              if (job.result?.customerData) {
                newStats.customersCreated++;
              }
              break;
            case 'error':
              newStats.errors++;
              break;
            case 'cancelled':
              newStats.cancelled++;
              break;
            case 'processing':
              newStats.processing++;
              break;
            case 'waiting':
              newStats.waiting++;
              break;
          }
        }
      });

      setJobs(newJobs);
      setStats(newStats);

      // Verificar si todos los trabajos han terminado
      if (newStats.completed + newStats.errors + newStats.cancelled === newStats.total) {
        setIsPolling(false);
        if (onComplete) {
          const results = Array.from(newJobs.values())
            .filter(job => job.status === 'completed')
            .map(job => job.result);
          onComplete(results);
        }
      }
    } catch (error) {
      console.error('Error obteniendo estado de trabajos:', error);
    }
  }, [jobIds, isPolling, onComplete]);

  // Polling para actualizar estados
  useEffect(() => {
    if (!isPolling) return;

    fetchJobStatuses();
    const interval = setInterval(fetchJobStatuses, 1000); // Actualizar cada segundo

    return () => clearInterval(interval);
  }, [fetchJobStatuses, isPolling]);

  // Cancelar todos los trabajos
  const handleCancelAll = async () => {
    try {
      await fetch('/api/documents/upload-batch?cancelAll=true', {
        method: 'DELETE'
      });
      setIsPolling(false);
      if (onCancel) onCancel();
    } catch (error) {
      console.error('Error cancelando trabajos:', error);
    }
  };

  // Reintentar trabajos fallidos
  const handleRetryFailed = async () => {
    // Por implementar: re-submit failed jobs
    console.log('Reintentar trabajos fallidos');
  };

  // Obtener color del estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'processing': return 'text-blue-600';
      case 'waiting': return 'text-gray-500';
      case 'cancelled': return 'text-orange-600';
      default: return 'text-gray-500';
    }
  };

  // Obtener icono del estado
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'error': return <XCircle className="h-4 w-4" />;
      case 'processing': return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'waiting': return <Clock className="h-4 w-4" />;
      case 'cancelled': return <X className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const overallProgress = stats.total > 0 
    ? ((stats.completed + stats.errors + stats.cancelled) / stats.total) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Procesamiento Paralelo en Curso
            </CardTitle>
            <div className="flex gap-2">
              {stats.errors > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetryFailed}
                  disabled={!isPolling}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reintentar Fallidos
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelAll}
                disabled={!isPolling}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar Todo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Barra de progreso general */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Progreso General</span>
              <span>{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>

          {/* Grid de estadísticas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-muted-foreground">Completados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
              <div className="text-sm text-muted-foreground">Procesando</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
              <div className="text-sm text-muted-foreground">Errores</div>
            </div>
          </div>

          {/* Estadísticas adicionales */}
          {(stats.duplicatesFound > 0 || stats.suppliersCreated > 0 || stats.customersCreated > 0) && (
            <div className="flex flex-wrap gap-3 pt-3 border-t">
              {stats.duplicatesFound > 0 && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <GitMerge className="h-3 w-3" />
                  {stats.duplicatesFound} duplicados detectados
                </Badge>
              )}
              {stats.suppliersCreated > 0 && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {stats.suppliersCreated} proveedores procesados
                </Badge>
              )}
              {stats.customersCreated > 0 && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Link className="h-3 w-3" />
                  {stats.customersCreated} clientes vinculados
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de trabajos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Documentos en Proceso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {Array.from(jobs.values()).map((job) => (
              <div
                key={job.jobId}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className={getStatusColor(job.status)}>
                    {getStatusIcon(job.status)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{job.fileName}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="capitalize">{job.status}</span>
                      {job.status === 'processing' && (
                        <span>{job.progress}%</span>
                      )}
                      {job.startTime && job.endTime && (
                        <span className="flex items-center gap-1">
                          <Timer className="h-3 w-3" />
                          {((new Date(job.endTime).getTime() - new Date(job.startTime).getTime()) / 1000).toFixed(1)}s
                        </span>
                      )}
                      {job.result?.duplicateInfo?.hasDuplicates && (
                        <Badge variant="outline" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Duplicado
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progreso para trabajos en proceso */}
                {job.status === 'processing' && (
                  <div className="w-24">
                    <Progress value={job.progress} className="h-1" />
                  </div>
                )}

                {/* Error para trabajos fallidos */}
                {job.status === 'error' && job.error && (
                  <Badge variant="destructive" className="text-xs">
                    {job.error}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resumen cuando se completa */}
      {!isPolling && stats.completed > 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Procesamiento completado. {stats.completed} documento(s) procesado(s) exitosamente.
            {stats.errors > 0 && ` ${stats.errors} error(es) encontrado(s).`}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}