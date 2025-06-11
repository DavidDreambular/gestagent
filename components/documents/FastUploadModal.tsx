import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface FastUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (result: any) => void;
}

export const FastUploadModal: React.FC<FastUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadComplete,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setUploadProgress(0);
      setUploadStatus('idle');
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadStatus('uploading');
    setUploadProgress(10);
    setStatusMessage('Subiendo archivo...');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('documentType', 'factura');

      // Simular progreso de upload
      setUploadProgress(30);
      setStatusMessage('Archivo enviado, iniciando procesamiento...');
      
      setUploadStatus('processing');
      setUploadProgress(50);
      setStatusMessage('🤖 Procesando con Mistral AI (puede tomar 2-3 minutos)...');

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(90);
      setStatusMessage('Finalizando procesamiento...');

      const result = await response.json();

      if (result.success) {
        setUploadProgress(100);
        setUploadStatus('complete');
        setStatusMessage('✅ Documento procesado exitosamente');
        
        setTimeout(() => {
          onUploadComplete(result);
          onClose();
          // Reset form
          setSelectedFile(null);
          setUploadProgress(0);
          setUploadStatus('idle');
          setIsUploading(false);
        }, 1500);
      } else {
        throw new Error(result.error || 'Error procesando documento');
      }
    } catch (error: any) {
      setUploadStatus('error');
      setUploadProgress(0);
      setStatusMessage(`❌ Error: ${error.message}`);
      setIsUploading(false);
    }
  }, [selectedFile, onUploadComplete, onClose]);

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'uploading':
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>📄 Upload Rápido</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Input */}
          <div>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileSelect}
              disabled={isUploading}
              className="w-full p-2 border rounded-md disabled:opacity-50"
            />
            {selectedFile && (
              <p className="text-sm text-gray-600 mt-1">
                📎 {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Progress */}
          {uploadProgress > 0 && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="w-full" />
              <div className="flex items-center space-x-2 text-sm">
                {getStatusIcon()}
                <span>{statusMessage}</span>
              </div>
              
              {uploadStatus === 'processing' && (
                <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                  ⚠️ El procesamiento puede tomar 2-3 minutos. El sistema está trabajando en segundo plano.
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isUploading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? 'Procesando...' : 'Subir y Procesar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};