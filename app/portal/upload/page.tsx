'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface ProviderData {
  id: string;
  email: string;
  supplier: {
    id: string;
    name: string;
    nif: string;
  };
}

export default function PortalUpload() {
  const router = useRouter();
  const [provider, setProvider] = useState<ProviderData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [documentType, setDocumentType] = useState('factura');
  const [documentNumber, setDocumentNumber] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    checkAuth();
  }, [router]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/portal/auth/profile', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const userData = await response.json();
        setProvider({
          id: userData.user.id,
          email: userData.user.email,
          supplier: {
            id: userData.user.providerId,
            name: userData.user.providerName,
            nif: userData.user.providerNif || 'N/A'
          }
        });
      } else {
        router.push('/portal/login');
      }
    } catch (error) {
      console.error('Error verificando autenticación:', error);
      router.push('/portal/login');
    }
  };

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
        setUploadError('');
      } else {
        setUploadError('Solo se permiten archivos PDF');
      }
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    multiple: false
  });

  const handleUpload = async () => {
    if (!selectedFile || !provider) {
      setUploadError('Selecciona un archivo PDF');
      return;
    }

    if (!documentNumber.trim()) {
      setUploadError('El número de documento es requerido');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('document_type', documentType);
      formData.append('document_number', documentNumber);
      formData.append('description', description);
      formData.append('supplier_id', provider.supplier.id);
      formData.append('supplier_name', provider.supplier.name);

      const response = await fetch('/api/portal/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        setUploadSuccess(true);
        setSelectedFile(null);
        setDocumentNumber('');
        setDescription('');
        
        // Redirigir al dashboard después de 3 segundos
        setTimeout(() => {
          router.push('/portal/dashboard');
        }, 3000);
      } else {
        setUploadError(result.error || 'Error al subir el documento');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setDocumentNumber('');
    setDescription('');
    setUploadError('');
    setUploadSuccess(false);
  };

  if (!provider) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() => router.push('/portal/dashboard')}
                className="mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <h1 className="text-xl font-bold text-gray-900">Subir Documento</h1>
            </div>
            <div className="text-sm text-gray-600">
              {provider.supplier.name} ({provider.supplier.nif})
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {uploadSuccess ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  ¡Documento subido exitosamente!
                </h3>
                <p className="text-gray-500 mb-4">
                  Tu documento ha sido enviado y está siendo procesado.
                </p>
                <div className="space-y-2">
                  <Button 
                    onClick={() => router.push('/portal/dashboard')}
                    className="w-full"
                  >
                    Ir al Dashboard
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={resetForm}
                    className="w-full"
                  >
                    Subir Otro Documento
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Formulario */}
            <Card>
              <CardHeader>
                <CardTitle>Información del Documento</CardTitle>
                <CardDescription>
                  Completa los datos del documento que vas a subir
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="document_type">Tipo de Documento</Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="factura">Factura</SelectItem>
                      <SelectItem value="recibo">Recibo</SelectItem>
                      <SelectItem value="nomina">Nómina</SelectItem>
                      <SelectItem value="extracto">Extracto Bancario</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="document_number">Número de Documento *</Label>
                  <Input
                    id="document_number"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    placeholder="Ej: FAC-2024-001"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descripción (Opcional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descripción adicional del documento..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Proveedor</Label>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="font-medium">{provider.supplier.name}</p>
                    <p className="text-sm text-gray-600">NIF: {provider.supplier.nif}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upload Area */}
            <Card>
              <CardHeader>
                <CardTitle>Archivo PDF</CardTitle>
                <CardDescription>
                  Arrastra y suelta tu archivo PDF o haz clic para seleccionar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? 'border-blue-400 bg-blue-50'
                      : selectedFile
                      ? 'border-green-400 bg-green-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input {...getInputProps()} />
                  
                  {selectedFile ? (
                    <div>
                      <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-4" />
                      <p className="text-lg font-medium text-gray-900 mb-2">
                        Archivo seleccionado
                      </p>
                      <p className="text-sm text-gray-600 mb-2">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                        className="mt-2"
                      >
                        Cambiar archivo
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-lg font-medium text-gray-900 mb-2">
                        {isDragActive ? 'Suelta el archivo aquí' : 'Selecciona un archivo PDF'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Solo archivos PDF, máximo 10MB
                      </p>
                    </div>
                  )}
                </div>

                {uploadError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                      <p className="text-sm text-red-700">{uploadError}</p>
                    </div>
                  </div>
                )}

                <div className="mt-6 space-y-3">
                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading || !documentNumber.trim()}
                    className="w-full"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Subir Documento
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => router.push('/portal/dashboard')}
                    className="w-full"
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
} 