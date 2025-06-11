'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Zap, Brain, Settings, TrendingUp, Layers } from 'lucide-react';
import MultiFileUpload from '@/components/documents/MultiFileUpload';
import { ParallelUploadForm } from '@/components/documents/ParallelUploadForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const DOCUMENT_TYPES = [
  { 
    value: 'factura', 
    label: '📄 Factura', 
    description: 'Facturas de venta, servicios o productos con Mistral OCR avanzado' 
  },
  { 
    value: 'nomina', 
    label: '💰 Nómina', 
    description: 'Documentos de pago de salarios con detección automática' 
  },
  { 
    value: 'recibo', 
    label: '🧾 Recibo', 
    description: 'Recibos de compra o servicios con validación GPT-4o' 
  },
  { 
    value: 'documento', 
    label: '📋 Otro documento', 
    description: 'Cualquier otro documento financiero' 
  }
];

export default function NewDocumentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Estados principales
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('factura');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [processingResults, setProcessingResults] = useState<any[]>([]);
  const [uploadMode, setUploadMode] = useState<'standard' | 'batch'>('standard');

  // Verificar si se accede desde el botón de procesamiento masivo
  useEffect(() => {
    if (searchParams.get('batch') === 'true') {
      setUploadMode('batch');
    }
  }, [searchParams]);

  // Manejar completado de procesamiento
  const handleFilesProcessed = (results: any[]) => {
    setProcessingResults(results);
    console.log('Archivos procesados:', results);
  };

  // Manejar completado total del upload
  const handleUploadComplete = () => {
    // Opcionalmente redirigir al dashboard después de un delay
    setTimeout(() => {
      // router.push('/dashboard/documents');
    }, 2000);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Nuevo Documento</h1>
            <p className="text-gray-600">Procesa múltiples PDFs con Mistral OCR + GPT-4o</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Mistral OCR
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Brain className="w-3 h-3" />
            GPT-4o Validation
          </Badge>
        </div>
      </div>

      {/* Selector de modo de carga */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Modo de Procesamiento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={uploadMode} onValueChange={(value) => setUploadMode(value as 'standard' | 'batch')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="standard">
                <FileText className="w-4 h-4 mr-2" />
                Carga Estándar
              </TabsTrigger>
              <TabsTrigger value="batch">
                <Layers className="w-4 h-4 mr-2" />
                Procesamiento Masivo
              </TabsTrigger>
            </TabsList>
            
            <div className="mt-4">
              {uploadMode === 'standard' ? (
                <p className="text-sm text-muted-foreground">
                  Procesamiento tradicional con interfaz completa y vista previa de archivos
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Procesamiento paralelo optimizado para múltiples documentos con opciones avanzadas
                </p>
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Características del sistema */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Procesamiento Paralelo</h3>
              <p className="text-sm text-gray-600 mt-1">
                Hasta {uploadMode === 'batch' ? '10' : '5'} documentos simultáneos con Mistral OCR
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Brain className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">IA Avanzada</h3>
              <p className="text-sm text-gray-600 mt-1">
                Validación inteligente con GPT-4o para máxima precisión
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Detección Inteligente</h3>
              <p className="text-sm text-gray-600 mt-1">
                Duplicados, plantillas y extracción automática
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selector de tipo de documento (solo para modo estándar) */}
      {uploadMode === 'standard' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Tipo de Documento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {DOCUMENT_TYPES.map((type) => (
                <div
                  key={type.value}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedDocumentType === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedDocumentType(type.value)}
                >
                  <div className="text-lg font-medium mb-1">{type.label}</div>
                  <div className="text-sm text-gray-600">{type.description}</div>
                </div>
              ))}
            </div>
            
            {/* Opciones avanzadas */}
            <div className="mt-4 pt-4 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                {showAdvancedOptions ? 'Ocultar' : 'Mostrar'} opciones avanzadas
              </Button>
              
              {showAdvancedOptions && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-gray-700 mb-1">Configuración actual:</div>
                      <ul className="space-y-1 text-gray-600">
                        <li>• Máximo 25 archivos por lote</li>
                        <li>• 50MB por archivo</li>
                        <li>• 250MB total máximo</li>
                        <li>• 3 reintentos automáticos</li>
                      </ul>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700 mb-1">Características activas:</div>
                      <ul className="space-y-1 text-gray-600">
                        <li>• Detección de duplicados</li>
                        <li>• Gestión automática de proveedores</li>
                        <li>• Auditoría completa</li>
                        <li>• Plantillas de extracción</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Componente de upload según el modo */}
      {uploadMode === 'standard' ? (
        <MultiFileUpload
          documentType={selectedDocumentType}
          onFilesProcessed={handleFilesProcessed}
          onUploadComplete={handleUploadComplete}
          maxFiles={25}
          maxSizePerFile={50 * 1024 * 1024}
        />
      ) : (
        <ParallelUploadForm />
      )}

      {/* Resultados de procesamiento */}
      {processingResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">
              ✅ Procesamiento Completado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                Se procesaron {processingResults.length} documento(s) exitosamente
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {processingResults.slice(0, 6).map((result, index) => (
                  <div key={index} className="p-3 bg-green-50 rounded-lg">
                    <div className="font-medium text-green-800 text-sm">
                      {result.fileName || `Documento ${index + 1}`}
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      {result.emitterName && `De: ${result.emitterName}`}
                      {result.totalAmount && ` • €${result.totalAmount}`}
                    </div>
                    {result.isDuplicate && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        Duplicado detectado
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              
              {processingResults.length > 6 && (
                <div className="text-sm text-gray-500">
                  Y {processingResults.length - 6} documento(s) más...
                </div>
              )}
              
              <div className="pt-3 border-t">
                <Button 
                  onClick={() => router.push('/dashboard/documents')}
                  className="w-full"
                >
                  Ver Todos los Documentos
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}