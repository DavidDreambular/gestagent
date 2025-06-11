'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BatchProcessingQueue } from './BatchProcessingQueue';
import { 
  Upload, 
  FileText, 
  Settings, 
  Zap, 
  AlertCircle,
  X,
  CheckCircle,
  GitMerge,
  Link,
  Users
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface ProcessingOptions {
  maxConcurrency: number;
  detectDuplicates: boolean;
  autoLinkInvoices: boolean;
  skipSupplierCreation: boolean;
}

interface FileWithId extends File {
  id: string;
}

export function ParallelUploadForm() {
  const router = useRouter();
  const [files, setFiles] = useState<FileWithId[]>([]);
  const [processing, setProcessing] = useState(false);
  const [jobIds, setJobIds] = useState<string[]>([]);
  const [options, setOptions] = useState<ProcessingOptions>({
    maxConcurrency: 3,
    detectDuplicates: true,
    autoLinkInvoices: true,
    skipSupplierCreation: false
  });
  const [activeTab, setActiveTab] = useState('upload');
  const [error, setError] = useState<string | null>(null);

  // Configurar dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => 
      Object.assign(file, { id: Math.random().toString(36).substr(2, 9) })
    ) as FileWithId[];
    
    setFiles(prev => [...prev, ...newFiles]);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 20,
    maxSize: 10485760 // 10MB por archivo
  });

  // Eliminar archivo
  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Iniciar procesamiento
  const startProcessing = async () => {
    if (files.length === 0) {
      setError('Por favor selecciona al menos un archivo');
      return;
    }

    setProcessing(true);
    setError(null);
    setActiveTab('processing');

    try {
      const formData = new FormData();
      
      // Añadir archivos
      files.forEach(file => {
        formData.append('files', file);
      });
      
      // Añadir opciones
      formData.append('maxConcurrency', options.maxConcurrency.toString());
      formData.append('detectDuplicates', options.detectDuplicates.toString());
      formData.append('autoLinkInvoices', options.autoLinkInvoices.toString());
      formData.append('skipSupplierCreation', options.skipSupplierCreation.toString());

      const response = await fetch('/api/documents/upload-batch', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setJobIds(data.jobIds);
      } else {
        throw new Error(data.error || 'Error al procesar archivos');
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
      setProcessing(false);
      setActiveTab('upload');
    }
  };

  // Limpiar y volver a empezar
  const reset = () => {
    setFiles([]);
    setJobIds([]);
    setProcessing(false);
    setActiveTab('upload');
    setError(null);
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload" disabled={processing}>
            <Upload className="h-4 w-4 mr-2" />
            Cargar Archivos
          </TabsTrigger>
          <TabsTrigger value="options" disabled={processing}>
            <Settings className="h-4 w-4 mr-2" />
            Opciones
          </TabsTrigger>
          <TabsTrigger value="processing" disabled={!processing && jobIds.length === 0}>
            <Zap className="h-4 w-4 mr-2" />
            Procesamiento
          </TabsTrigger>
        </TabsList>

        {/* Tab: Cargar Archivos */}
        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Procesamiento Masivo de Documentos</CardTitle>
              <CardDescription>
                Carga múltiples PDFs para procesarlos en paralelo con detección automática de duplicados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">
                  {isDragActive
                    ? 'Suelta los archivos aquí...'
                    : 'Arrastra archivos PDF o haz clic para seleccionar'
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  Máximo 20 archivos, 10MB por archivo
                </p>
              </div>

              {/* Lista de archivos */}
              {files.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">
                      Archivos seleccionados ({files.length})
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFiles([])}
                    >
                      Limpiar todo
                    </Button>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-gray-500" />
                          <div>
                            <p className="font-medium text-sm">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Botón de procesamiento */}
              <div className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={processing}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => setActiveTab('options')}
                  disabled={files.length === 0 || processing}
                >
                  Siguiente: Configurar Opciones
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Opciones */}
        <TabsContent value="options" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Opciones de Procesamiento</CardTitle>
              <CardDescription>
                Configura cómo se procesarán los documentos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Concurrencia */}
              <div className="space-y-3">
                <Label htmlFor="concurrency">Documentos en paralelo</Label>
                <Select
                  value={options.maxConcurrency.toString()}
                  onValueChange={(value) => 
                    setOptions(prev => ({ ...prev, maxConcurrency: parseInt(value) }))
                  }
                >
                  <SelectTrigger id="concurrency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 documento (más lento, menos recursos)</SelectItem>
                    <SelectItem value="3">3 documentos (recomendado)</SelectItem>
                    <SelectItem value="5">5 documentos (rápido)</SelectItem>
                    <SelectItem value="10">10 documentos (muy rápido, más recursos)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Más concurrencia = procesamiento más rápido pero mayor uso de recursos
                </p>
              </div>

              {/* Opciones de procesamiento */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <GitMerge className="h-4 w-4 text-blue-500" />
                      <Label htmlFor="duplicates" className="font-medium">
                        Detectar duplicados
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Identificar proveedores y clientes duplicados automáticamente
                    </p>
                  </div>
                  <Switch
                    id="duplicates"
                    checked={options.detectDuplicates}
                    onCheckedChange={(checked) =>
                      setOptions(prev => ({ ...prev, detectDuplicates: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Link className="h-4 w-4 text-green-500" />
                      <Label htmlFor="autoLink" className="font-medium">
                        Vincular facturas automáticamente
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Vincular facturas con proveedores y clientes detectados
                    </p>
                  </div>
                  <Switch
                    id="autoLink"
                    checked={options.autoLinkInvoices}
                    onCheckedChange={(checked) =>
                      setOptions(prev => ({ ...prev, autoLinkInvoices: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-orange-500" />
                      <Label htmlFor="skipSupplier" className="font-medium">
                        Omitir creación de proveedores
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Solo procesar documentos sin crear nuevos proveedores
                    </p>
                  </div>
                  <Switch
                    id="skipSupplier"
                    checked={options.skipSupplierCreation}
                    onCheckedChange={(checked) =>
                      setOptions(prev => ({ ...prev, skipSupplierCreation: checked }))
                    }
                  />
                </div>
              </div>

              {/* Resumen */}
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Se procesarán {files.length} archivo(s) con {options.maxConcurrency} documento(s) en paralelo.
                  {options.detectDuplicates && ' Se detectarán duplicados.'}
                  {options.autoLinkInvoices && ' Se vincularán facturas automáticamente.'}
                </AlertDescription>
              </Alert>

              {/* Botones */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('upload')}
                  disabled={processing}
                >
                  Atrás
                </Button>
                <Button
                  onClick={startProcessing}
                  disabled={files.length === 0 || processing}
                  className="gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Iniciar Procesamiento
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Procesamiento */}
        <TabsContent value="processing" className="space-y-6">
          {jobIds.length > 0 ? (
            <BatchProcessingQueue
              jobIds={jobIds}
              onComplete={(results) => {
                console.log('Procesamiento completado:', results);
                // Opcional: redirigir a documentos
                setTimeout(() => {
                  router.push('/dashboard/documents');
                }, 2000);
              }}
              onCancel={reset}
            />
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No hay trabajos de procesamiento activos
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={reset}
                >
                  Volver a cargar archivos
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}