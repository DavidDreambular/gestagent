'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle, 
  XCircle, 
  Clock,
  PlayCircle,
  Trash2,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import ProcessingQueue, { QueueItem } from './ProcessingQueue';

interface FileUploadItem {
  id: string;
  file: File;
  status: 'waiting' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: any;
  error?: string;
  startTime?: number;
  endTime?: number;
}

interface MultiFileUploadProps {
  documentType: string;
  onFilesProcessed: (results: any[]) => void;
  maxFiles?: number;
  maxSizePerFile?: number;
  onUploadComplete?: () => void;
}

export default function MultiFileUpload({ 
  documentType, 
  onFilesProcessed,
  onUploadComplete,
  maxFiles = 25, // Aumentado para coincidir con el backend
  maxSizePerFile = 50 * 1024 * 1024 // 50MB
}: MultiFileUploadProps) {
  const [uploadQueue, setUploadQueue] = useState<FileUploadItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [processingStats, setProcessingStats] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validar archivo individual
  const validateFile = useCallback((file: File): boolean => {
    if (file.type !== 'application/pdf') {
      alert(`${file.name}: Solo se permiten archivos PDF`);
      return false;
    }
    
    if (file.size > maxSizePerFile) {
      alert(`${file.name}: Archivo demasiado grande. Máximo ${maxSizePerFile / 1024 / 1024}MB`);
      return false;
    }
    
    return true;
  }, [maxSizePerFile]);

  // Agregar archivos a la cola
  const addFilesToQueue = useCallback((files: File[]) => {
    const validFiles = files.filter(validateFile);
    
    if (uploadQueue.length + validFiles.length > maxFiles) {
      alert(`Máximo ${maxFiles} archivos permitidos`);
      return;
    }

    const newItems: FileUploadItem[] = validFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      status: 'waiting',
      progress: 0
    }));

    setUploadQueue(prev => [...prev, ...newItems]);
  }, [uploadQueue.length, maxFiles, validateFile]);

  // Manejar selección de archivos
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    addFilesToQueue(files);
    
    // Resetear input
    if (event.target) {
      event.target.value = '';
    }
  }, [addFilesToQueue]);

  // Manejar drag & drop
  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
    
    const files = Array.from(event.dataTransfer.files);
    addFilesToQueue(files);
  }, [addFilesToQueue]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragActive(false);
    }
  }, []);

  // Remover archivo de la cola
  const removeFromQueue = useCallback((id: string) => {
    setUploadQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  // Limpiar archivos completados
  const clearCompleted = useCallback(() => {
    setUploadQueue(prev => prev.filter(item => item.status !== 'completed'));
  }, []);

  // Procesar todos los archivos usando la nueva API mejorada
  const processAllFiles = async () => {
    const waitingFiles = uploadQueue.filter(item => item.status === 'waiting');
    
    if (waitingFiles.length === 0) return;

    setIsProcessing(true);
    setProcessingStats(null);

    try {
      // Preparar FormData con todos los archivos
      const formData = new FormData();
      formData.append('documentType', documentType);
      
      waitingFiles.forEach(item => {
        formData.append('files', item.file);
      });

      // Actualizar estado a processing
      setUploadQueue(prev => prev.map(item => 
        waitingFiles.find(f => f.id === item.id)
          ? { ...item, status: 'processing', progress: 10, startTime: Date.now() }
          : item
      ));

      // Simular progreso durante el procesamiento
      const progressInterval = setInterval(() => {
        setUploadQueue(prev => prev.map(item => 
          item.status === 'processing' && item.progress < 90
            ? { ...item, progress: Math.min(item.progress + 15, 90) }
            : item
        ));
      }, 2000);

      // Llamar a la API mejorada
      const response = await fetch('/api/documents/upload-multiple', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      const result = await response.json();

      if (result.success) {
        // Actualizar estado basado en los resultados
        const resultMap = new Map(result.results.map((r: any) => [r.fileName, r]));
        
        setUploadQueue(prev => prev.map(item => {
          const fileResult = Array.from(resultMap.values()).find((r: any) => 
            r.fileName === item.file.name
          );
          
          if (fileResult && typeof fileResult === 'object' && 'status' in fileResult) {
            return {
              ...item,
              status: (fileResult as any).status === 'completed' ? 'completed' : 'error' as const,
              progress: 100,
              result: (fileResult as any).result,
              error: (fileResult as any).error,
              endTime: Date.now()
            };
          }
          return item;
        }));

        // Guardar estadísticas
        setProcessingStats(result.stats);

        // Notificar resultados
        const completedResults = result.results
          .filter((r: any) => r.status === 'completed')
          .map((r: any) => r.result);
        
        onFilesProcessed(completedResults);
        
        if (onUploadComplete) {
          onUploadComplete();
        }

        // Mostrar resumen
        const { completed, failed, totalFiles } = result.stats;
        if (failed > 0) {
          alert(`Procesamiento completado: ${completed}/${totalFiles} archivos exitosos, ${failed} fallidos`);
        } else {
          alert(`¡Procesamiento exitoso! ${completed} archivos procesados correctamente`);
        }

      } else {
        throw new Error(result.error || 'Error en el procesamiento');
      }

    } catch (error: any) {
      console.error('Error procesando archivos:', error);
      
      // Marcar todos como error
      setUploadQueue(prev => prev.map(item => 
        item.status === 'processing' 
          ? { ...item, status: 'error', error: error.message, endTime: Date.now() }
          : item
      ));
      
      alert(`Error procesando archivos: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Convertir a formato QueueItem para el componente ProcessingQueue
  const queueItems: QueueItem[] = uploadQueue.map(item => ({
    id: item.id,
    fileName: item.file.name,
    fileSize: item.file.size,
    status: item.status === 'error' ? 'failed' : item.status,
    progress: item.progress,
    error: item.error,
    result: item.result ? {
      jobId: item.result.jobId,
      totalInvoices: item.result.totalInvoices,
      emitterName: item.result.emitterName,
      totalAmount: item.result.totalAmount,
      isDuplicate: item.result.isDuplicate,
      mistralConfidence: item.result.mistralConfidence
    } : undefined,
    actualTime: item.endTime && item.startTime ? item.endTime - item.startTime : undefined
  }));

  return (
    <div className="space-y-6">
      {/* Área de carga de archivos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Procesamiento Masivo con Mistral OCR
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
          >
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">
              {isDragActive ? 'Suelta los archivos aquí' : 'Arrastra archivos PDF o haz click para seleccionar'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Máximo {maxFiles} archivos PDF, {maxSizePerFile / 1024 / 1024}MB cada uno
            </p>
            
            <div className="space-y-2">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="mb-2"
              >
                Seleccionar Archivos PDF
              </Button>
              
              {uploadQueue.length > 0 && (
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={processAllFiles}
                    disabled={isProcessing || uploadQueue.filter(f => f.status === 'waiting').length === 0}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <PlayCircle className="w-4 h-4 mr-2" />
                    {isProcessing ? 'Procesando...' : `Procesar ${uploadQueue.filter(f => f.status === 'waiting').length} Archivos`}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => setUploadQueue([])}
                    disabled={isProcessing}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Limpiar Todo
                  </Button>
                </div>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Estadísticas de procesamiento */}
          {processingStats && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Estadísticas del Último Procesamiento
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-lg font-bold text-green-700">{processingStats.completed}</div>
                  <div className="text-green-600">Exitosos</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-orange-700">{processingStats.totalInvoicesDetected}</div>
                  <div className="text-orange-600">Facturas</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-purple-700">
                    {(processingStats.totalProcessingTime / 1000).toFixed(1)}s
                  </div>
                  <div className="text-purple-600">Tiempo Total</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-700">{processingStats.duplicatesDetected}</div>
                  <div className="text-blue-600">Duplicados</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cola de procesamiento */}
      {uploadQueue.length > 0 && (
        <ProcessingQueue
          items={queueItems}
          onCancelItem={removeFromQueue}
          onClearCompleted={clearCompleted}
          isProcessing={isProcessing}
          showDetails={true}
        />
      )}
    </div>
  );
} 