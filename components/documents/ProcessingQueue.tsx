'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock,
  Loader2,
  X,
  Timer,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

// Interfaz para elementos en la cola de procesamiento
export interface QueueItem {
  id: string;
  fileName: string;
  fileSize: number;
  status: 'waiting' | 'processing' | 'completed' | 'failed';
  progress: number;
  estimatedTime?: number;
  actualTime?: number;
  error?: string;
  result?: {
    jobId?: string;
    totalInvoices?: number;
    emitterName?: string;
    totalAmount?: number;
    isDuplicate?: boolean;
    mistralConfidence?: number;
  };
  retryCount?: number;
  startTime?: number;
}

interface ProcessingQueueProps {
  items: QueueItem[];
  onCancelItem?: (id: string) => void;
  onRetryItem?: (id: string) => void;
  onClearCompleted?: () => void;
  isProcessing: boolean;
  showDetails?: boolean;
}

// Componente principal de la cola de procesamiento
export default function ProcessingQueue({
  items,
  onCancelItem,
  onRetryItem,
  onClearCompleted,
  isProcessing,
  showDetails = true
}: ProcessingQueueProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Calcular estadísticas de procesamiento
  const stats = {
    total: items.length,
    completed: items.filter(item => item.status === 'completed').length,
    failed: items.filter(item => item.status === 'failed').length,
    processing: items.filter(item => item.status === 'processing').length,
    waiting: items.filter(item => item.status === 'waiting').length,
    duplicates: items.filter(item => item.result?.isDuplicate).length,
    totalInvoices: items.reduce((sum, item) => sum + (item.result?.totalInvoices || 0), 0),
    averageConfidence: items.filter(item => item.result?.mistralConfidence).length > 0
      ? items
          .filter(item => item.result?.mistralConfidence)
          .reduce((sum, item) => sum + (item.result?.mistralConfidence || 0), 0) / 
        items.filter(item => item.result?.mistralConfidence).length
      : 0
  };

  // Función para alternar expansión de detalles
  const toggleExpanded = useCallback((id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Función para formatear tiempo
  const formatTime = useCallback((ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  }, []);

  // Función para formatear tamaño de archivo
  const formatFileSize = useCallback((bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(0)}KB` : `${mb.toFixed(1)}MB`;
  }, []);

  // Función para obtener color del badge de estado
  const getStatusBadgeVariant = useCallback((status: QueueItem['status']) => {
    switch (status) {
      case 'completed': return 'default'; // verde
      case 'failed': return 'destructive'; // rojo
      case 'processing': return 'secondary'; // azul
      case 'waiting': return 'outline'; // gris
      default: return 'outline';
    }
  }, []);

  // Función para obtener icono de estado
  const getStatusIcon = useCallback((status: QueueItem['status'], isProcessing?: boolean) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'processing':
        return isProcessing ? (
          <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
        ) : (
          <Clock className="w-4 h-4 text-blue-600" />
        );
      case 'waiting':
        return <Clock className="w-4 h-4 text-gray-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Panel de estadísticas */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Cola de Procesamiento</CardTitle>
            {onClearCompleted && stats.completed > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearCompleted}
                className="text-xs"
              >
                Limpiar Completados
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-gray-500">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-gray-500">Completados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-gray-500">Fallidos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.totalInvoices}</div>
              <div className="text-gray-500">Facturas</div>
            </div>
          </div>
          
          {stats.total > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Progreso General</span>
                <span>{Math.round((stats.completed / stats.total) * 100)}%</span>
              </div>
              <Progress 
                value={(stats.completed / stats.total) * 100} 
                className="h-2"
              />
              
              {stats.duplicates > 0 && (
                <div className="flex items-center gap-1 text-xs text-amber-600">
                  <AlertTriangle className="w-3 h-3" />
                  {stats.duplicates} documento(s) duplicado(s) detectado(s)
                </div>
              )}
              
              {stats.averageConfidence > 0 && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <TrendingUp className="w-3 h-3" />
                  Confianza promedio: {(stats.averageConfidence * 100).toFixed(1)}%
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de archivos en procesamiento */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {items.map((item, index) => (
          <Card key={item.id} className="transition-all duration-200 hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {getStatusIcon(item.status, item.status === 'processing')}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {item.fileName}
                      </p>
                      <Badge variant={getStatusBadgeVariant(item.status)} className="text-xs">
                        {item.status === 'waiting' && 'Esperando'}
                        {item.status === 'processing' && 'Procesando'}
                        {item.status === 'completed' && 'Completado'}
                        {item.status === 'failed' && 'Error'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                      <span>{formatFileSize(item.fileSize)}</span>
                      {item.actualTime && (
                        <span className="flex items-center gap-1">
                          <Timer className="w-3 h-3" />
                          {formatTime(item.actualTime)}
                        </span>
                      )}
                      {item.result?.totalInvoices && (
                        <span>{item.result.totalInvoices} facturas</span>
                      )}
                      {item.retryCount && item.retryCount > 0 && (
                        <span className="text-amber-600">
                          Reintento {item.retryCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {showDetails && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(item.id)}
                      className="text-xs"
                    >
                      {expandedItems.has(item.id) ? 'Ocultar' : 'Detalles'}
                    </Button>
                  )}
                  
                  {item.status === 'failed' && onRetryItem && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRetryItem(item.id)}
                      className="text-xs"
                    >
                      Reintentar
                    </Button>
                  )}
                  
                  {(item.status === 'waiting' || item.status === 'failed') && onCancelItem && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCancelItem(item.id)}
                      className="text-xs hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Barra de progreso para archivos en procesamiento */}
              {item.status === 'processing' && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Procesando con Mistral OCR...</span>
                    <span>{item.progress}%</span>
                  </div>
                  <Progress value={item.progress} className="h-1" />
                </div>
              )}

              {/* Panel de detalles expandible */}
              {expandedItems.has(item.id) && (
                <div className="mt-4 pt-3 border-t border-gray-200 space-y-2">
                  {item.status === 'completed' && item.result && (
                    <div className="bg-green-50 p-3 rounded-md text-xs space-y-1">
                      <div className="font-medium text-green-800">Resultado del procesamiento:</div>
                      <div className="grid grid-cols-2 gap-2 text-green-700">
                        {item.result.emitterName && (
                          <div>
                            <span className="font-medium">Emisor:</span> {item.result.emitterName}
                          </div>
                        )}
                        {item.result.totalAmount && (
                          <div>
                            <span className="font-medium">Importe:</span> €{item.result.totalAmount}
                          </div>
                        )}
                        {item.result.mistralConfidence && (
                          <div>
                            <span className="font-medium">Confianza:</span> {(item.result.mistralConfidence * 100).toFixed(1)}%
                          </div>
                        )}
                        {item.result.jobId && (
                          <div>
                            <span className="font-medium">Job ID:</span> {item.result.jobId.slice(0, 8)}...
                          </div>
                        )}
                      </div>
                      {item.result.isDuplicate && (
                        <div className="text-amber-700 font-medium">
                          ⚠️ Documento duplicado detectado
                        </div>
                      )}
                    </div>
                  )}
                  
                  {item.status === 'failed' && item.error && (
                    <div className="bg-red-50 p-3 rounded-md text-xs">
                      <div className="font-medium text-red-800 mb-1">Error:</div>
                      <div className="text-red-700">{item.error}</div>
                    </div>
                  )}
                  
                  {item.estimatedTime && (
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Tiempo estimado:</span> {formatTime(item.estimatedTime)}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mensaje cuando no hay elementos */}
      {items.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>No hay archivos en la cola de procesamiento</p>
            <p className="text-sm">Los archivos aparecerán aquí cuando inicies un procesamiento masivo</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 