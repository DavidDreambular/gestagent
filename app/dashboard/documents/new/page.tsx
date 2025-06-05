'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: any;
}

interface UploadResult {
  success: boolean;
  jobId?: string;
  extracted_data?: any;
  document_url?: string;
  processing_metadata?: {
    upload_time_ms: number;
    mistral_processing_time_ms: number;
    total_time_ms: number;
    method: string;
    confidence: number;
  };
  error?: string;
  error_code?: string;
}

const DOCUMENT_TYPES = [
  { value: 'factura', label: '📄 Factura', description: 'Facturas de venta, servicios o productos' },
  { value: 'nomina', label: '💰 Nómina', description: 'Documentos de pago de salarios' },
  { value: 'recibo', label: '🧾 Recibo', description: 'Recibos de compra o servicios' },
  { value: 'documento', label: '📋 Otro documento', description: 'Cualquier otro documento financiero' }
];

export default function NewDocumentPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estados principales
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('factura'); // Valor por defecto
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);

  // Función para agregar logs
  const addLog = useCallback((level: LogEntry['level'], message: string, details?: any) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      level,
      message,
      details
    };
    setLogs(prev => [...prev, newLog]);
    console.log(`[${level.toUpperCase()}] ${message}`, details);
  }, []);

  // Función para validar archivo
  const validateFile = useCallback((file: File) => {
    if (file.type !== 'application/pdf') {
      addLog('error', 'Solo se permiten archivos PDF');
      return false;
    }
    
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      addLog('error', `Archivo demasiado grande. Máximo 50MB. Tu archivo: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return false;
    }
    
    return true;
  }, [addLog]);

  // Función para procesar archivo seleccionado
  const processSelectedFile = useCallback((selectedFile: File) => {
    if (validateFile(selectedFile)) {
      setFile(selectedFile);
      setResult(null);
      setLogs([]);
      addLog('success', `Archivo seleccionado: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`);
    }
  }, [validateFile, addLog]);

  // Manejar selección de archivo
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      processSelectedFile(selectedFile);
    }
    
    // Resetear el input para permitir seleccionar el mismo archivo
    if (event.target) {
      event.target.value = '';
    }
  }, [processSelectedFile]);

  // Manejar click en área de drop
  const handleAreaClick = useCallback(() => {
    if (!isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [isUploading]);

  // Manejar drag & drop con prevención de eventos duplicados
  const handleDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (!isUploading && event.dataTransfer.types.includes('Files')) {
      setIsDragActive(true);
    }
  }, [isUploading]);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Solo desactivar si realmente salimos del área completa
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
    
    if (isUploading) {
      addLog('warning', 'Procesamiento en curso, espera a que termine');
      return;
    }
    
    const files = Array.from(event.dataTransfer.files);
    if (files.length === 0) {
      addLog('error', 'No se detectaron archivos');
      return;
    }
    
    const droppedFile = files[0];
    processSelectedFile(droppedFile);
  }, [processSelectedFile, addLog, isUploading]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  // Función principal de upload
  const handleUpload = async () => {
    if (!file) {
      addLog('error', 'Por favor selecciona un archivo PDF');
      return;
    }
    
    if (!documentType) {
      addLog('error', 'Por favor selecciona un tipo de documento');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setResult(null);
      
      addLog('info', `Iniciando procesamiento de ${file.name} como ${documentType}...`);

      // Crear FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);

      addLog('info', 'Enviando documento al servidor...');
      setUploadProgress(20);

      // Enviar a nuestro endpoint funcional
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(60);
      addLog('info', 'Documento recibido por el servidor, procesando con Mistral...');

      const data: UploadResult = await response.json();
      
      setUploadProgress(100);

      if (data.success) {
        addLog('success', `¡Documento procesado exitosamente!`);
        addLog('info', `Job ID: ${data.jobId}`);
        addLog('info', `Tiempo de procesamiento: ${data.processing_metadata?.mistral_processing_time_ms}ms`);
        addLog('info', `Confianza: ${Math.round((data.processing_metadata?.confidence || 0) * 100)}%`);
        
        // Mostrar información específica de múltiples IVAs y facturas
        if (data.extracted_data?.detected_invoices) {
          addLog('success', `${data.extracted_data.detected_invoices.length} facturas detectadas`);
        }
        
        if (data.extracted_data?.detected_tax_info) {
          const taxTypes = data.extracted_data.detected_tax_info.filter((t: any) => t.type === 'rate').length;
          addLog('info', `${taxTypes} tipos de IVA detectados`);
        }
        
        if (data.extracted_data?.detected_totals) {
          addLog('info', `${data.extracted_data.detected_totals.length} totales encontrados`);
        }
        
        setResult(data);
      } else {
        addLog('error', `Error en procesamiento: ${data.error}`);
        addLog('error', `Código de error: ${data.error_code || 'UNKNOWN'}`);
        setResult(data);
      }

    } catch (error: any) {
      addLog('error', `Error de conexión: ${error.message}`);
      setResult({
        success: false,
        error: error.message,
        error_code: 'CONNECTION_ERROR'
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Función para limpiar y empezar de nuevo
  const handleReset = () => {
    setFile(null);
    setDocumentType('factura'); // Restaurar valor por defecto
    setResult(null);
    setLogs([]);
    setUploadProgress(0);
    setIsDragActive(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    addLog('info', 'Formulario reiniciado');
  };

  // Función para ir al documento procesado
  const viewDocument = () => {
    if (result?.jobId) {
      router.push(`/dashboard/documents/${result.jobId}`);
    }
  };

  // Verificar si el botón debe estar habilitado
  const isButtonEnabled = file && documentType && !isUploading;

  // CSS estilos base
  const styles = {
    container: {
      padding: '2rem',
      maxWidth: '1200px',
      margin: '0 auto',
      fontFamily: 'system-ui, sans-serif',
      backgroundColor: '#f9fafb',
      minHeight: '100vh'
    },
    header: {
      marginBottom: '2rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem'
    },
    backButton: {
      background: 'white',
      border: '1px solid #e5e7eb',
      padding: '0.5rem 1rem',
      borderRadius: '0.375rem',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      textDecoration: 'none',
      color: '#374151',
      fontSize: '0.875rem'
    },
    title: {
      fontSize: '2rem',
      fontWeight: 'bold',
      margin: 0,
      color: '#111827'
    },
    subtitle: {
      color: '#6b7280',
      margin: 0,
      fontSize: '0.875rem'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '2rem'
    },
    card: {
      border: '1px solid #e5e7eb',
      borderRadius: '0.5rem',
      padding: '1.5rem',
      backgroundColor: 'white',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
    },
    dropArea: {
      border: '2px dashed #d1d5db',
      borderRadius: '0.5rem',
      padding: '2rem',
      textAlign: 'center' as const,
      cursor: 'pointer',
      transition: 'all 0.2s',
      position: 'relative' as const
    },
    select: {
      width: '100%',
      padding: '0.5rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.375rem',
      fontSize: '0.875rem',
      backgroundColor: 'white'
    },
    button: {
      flex: 1,
      border: 'none',
      padding: '0.75rem 1rem',
      borderRadius: '0.375rem',
      fontSize: '0.875rem',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem'
    },
    progressBar: {
      width: '100%',
      backgroundColor: '#e5e7eb',
      borderRadius: '0.25rem',
      height: '0.5rem'
    },
    progressFill: {
      backgroundColor: '#3b82f6',
      height: '100%',
      borderRadius: '0.25rem',
      transition: 'width 0.3s ease'
    }
  };

  return (
    <div style={styles.container}>
      {/* Navegación */}
      <div style={styles.header}>
        <button 
          onClick={() => router.push('/dashboard')}
          style={styles.backButton}
        >
          ← Volver al Dashboard
        </button>
        <div>
          <h1 style={styles.title}>Nuevo Documento</h1>
          <p style={styles.subtitle}>
            Sube un PDF para procesarlo con Mistral Document Understanding
          </p>
        </div>
      </div>

      <div style={styles.grid}>
        {/* Panel izquierdo: Upload */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Área de upload */}
          <div style={styles.card}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Subir Documento</h3>
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
              Arrastra un archivo PDF o haz clic para seleccionar (máximo 50MB)
            </p>
            
            {/* Área de drop mejorada */}
            <div
              style={{
                ...styles.dropArea,
                backgroundColor: file ? '#f0fdf4' : isDragActive ? '#eff6ff' : '#f9fafb',
                borderColor: file ? '#bbf7d0' : isDragActive ? '#93c5fd' : '#d1d5db',
                opacity: isUploading ? 0.5 : 1,
                pointerEvents: isUploading ? 'none' : 'auto'
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onClick={handleAreaClick}
            >
              {file ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ fontSize: '3rem' }}>📄</div>
                  <p style={{ fontWeight: '500', color: '#15803d', margin: 0 }}>{file.name}</p>
                  <p style={{ fontSize: '0.875rem', color: '#16a34a', margin: 0 }}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <span style={{ 
                    backgroundColor: '#dcfce7', 
                    color: '#15803d', 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '0.25rem', 
                    fontSize: '0.75rem' 
                  }}>
                    ✓ Archivo válido
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ fontSize: '3rem', color: isDragActive ? "#2563eb" : "#9ca3af" }}>⬆️</div>
                  <p style={{ fontWeight: '500', margin: 0 }}>
                    {isDragActive ? "Suelta el PDF aquí" : "Arrastra tu PDF aquí"}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>o haz clic para seleccionar</p>
                </div>
              )}
            </div>
            
            {/* Input de archivo separado y oculto */}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              disabled={isUploading}
            />

            {/* Selector de tipo de documento */}
            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                Tipo de Documento
              </label>
              <select 
                value={documentType} 
                onChange={(e) => setDocumentType(e.target.value)}
                style={styles.select}
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </select>
              {documentType && (
                <p style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.25rem' }}>
                  ✓ Tipo seleccionado: {DOCUMENT_TYPES.find(t => t.value === documentType)?.label}
                </p>
              )}
            </div>

            {/* Progreso */}
            {isUploading && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  <span>Procesando con Mistral Document Understanding...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div style={styles.progressBar}>
                  <div 
                    style={{ 
                      ...styles.progressFill,
                      width: `${uploadProgress}%`
                    }}
                  />
                </div>
              </div>
            )}

            {/* Botones de acción */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                onClick={handleUpload}
                disabled={!isButtonEnabled}
                style={{
                  ...styles.button,
                  backgroundColor: isButtonEnabled ? '#3b82f6' : '#9ca3af',
                  color: 'white',
                  cursor: isButtonEnabled ? 'pointer' : 'not-allowed'
                }}
              >
                {isUploading ? (
                  <>
                    ⏳ Procesando con Mistral...
                  </>
                ) : (
                  <>
                    ⬆️ Procesar Documento
                  </>
                )}
              </button>
              
              {(file || result) && (
                <button 
                  onClick={handleReset} 
                  disabled={isUploading}
                  style={{
                    backgroundColor: 'white',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    cursor: isUploading ? 'not-allowed' : 'pointer'
                  }}
                >
                  🧹 Limpiar
                </button>
              )}
            </div>

            {/* Estado del formulario */}
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ 
                  width: '0.5rem', 
                  height: '0.5rem', 
                  borderRadius: '50%', 
                  backgroundColor: file ? '#10b981' : '#d1d5db',
                  display: 'inline-block'
                }} />
                <span>Archivo PDF seleccionado</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ 
                  width: '0.5rem', 
                  height: '0.5rem', 
                  borderRadius: '50%', 
                  backgroundColor: documentType ? '#10b981' : '#d1d5db',
                  display: 'inline-block'
                }} />
                <span>Tipo de documento seleccionado</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ 
                  width: '0.5rem', 
                  height: '0.5rem', 
                  borderRadius: '50%', 
                  backgroundColor: isButtonEnabled ? '#10b981' : '#d1d5db',
                  display: 'inline-block'
                }} />
                <span>Listo para procesar</span>
              </div>
            </div>
          </div>

          {/* Resultado */}
          {result && (
            <div style={styles.card}>
              <h3 style={{ 
                fontSize: '1.25rem', 
                fontWeight: '600', 
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                {result.success ? '✅' : '❌'}
                <span>Resultado del Procesamiento</span>
              </h3>

              {result.success ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ 
                    backgroundColor: '#f0fdf4', 
                    border: '1px solid #bbf7d0', 
                    borderRadius: '0.375rem', 
                    padding: '0.75rem' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem' }}>
                        ✅ Documento procesado exitosamente con Job ID: {result.jobId}
                      </span>
                    </div>
                  </div>
                  
                  {/* Métricas mejoradas para múltiples IVAs */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                    <div style={{ backgroundColor: '#eff6ff', padding: '0.75rem', borderRadius: '0.375rem' }}>
                      <div style={{ fontWeight: '500', color: '#1e40af' }}>Tiempo Total</div>
                      <div style={{ color: '#2563eb' }}>
                        {result.processing_metadata?.mistral_processing_time_ms}ms
                      </div>
                    </div>
                    <div style={{ backgroundColor: '#f0fdf4', padding: '0.75rem', borderRadius: '0.375rem' }}>
                      <div style={{ fontWeight: '500', color: '#15803d' }}>Confianza</div>
                      <div style={{ color: '#16a34a' }}>
                        {Math.round((result.processing_metadata?.confidence || 0) * 100)}%
                      </div>
                    </div>
                  </div>

                  {/* Info adicional sobre múltiples IVAs y facturas */}
                  {result.extracted_data && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                      {result.extracted_data.detected_invoices && (
                        <div style={{ backgroundColor: '#fef3c7', padding: '0.75rem', borderRadius: '0.375rem' }}>
                          <div style={{ fontWeight: '500', color: '#92400e' }}>Facturas</div>
                          <div style={{ color: '#d97706' }}>
                            {result.extracted_data.detected_invoices.length} detectadas
                          </div>
                        </div>
                      )}
                      {result.extracted_data.detected_tax_info && (
                        <div style={{ backgroundColor: '#e0e7ff', padding: '0.75rem', borderRadius: '0.375rem' }}>
                          <div style={{ fontWeight: '500', color: '#3730a3' }}>Tipos de IVA</div>
                          <div style={{ color: '#4338ca' }}>
                            {result.extracted_data.detected_tax_info.filter((t: any) => t.type === 'rate').length} detectados
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <button 
                    onClick={viewDocument} 
                    style={{
                      width: '100%',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    👁️ Ver Documento Procesado
                  </button>
                </div>
              ) : (
                <div style={{ 
                  backgroundColor: '#fef2f2', 
                  border: '1px solid #fecaca', 
                  borderRadius: '0.375rem', 
                  padding: '0.75rem' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', color: '#dc2626' }}>
                      ❌ Error: {result.error}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Panel derecho: Logs */}
        <div style={styles.card}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
            📊 Logs en Tiempo Real
          </h3>
          
          <div style={{ 
            height: '400px', 
            overflow: 'auto', 
            border: '1px solid #e5e7eb', 
            borderRadius: '0.375rem', 
            padding: '1rem',
            backgroundColor: '#f9fafb'
          }}>
            {logs.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#6b7280', padding: '2rem 0' }}>
                📋 No hay logs aún. Sube un documento para ver el progreso.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {logs.map((log) => (
                  <div key={log.id} style={{ fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ color: '#6b7280' }}>
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                      <span style={{ 
                        backgroundColor: 
                          log.level === 'success' ? '#dcfce7' :
                          log.level === 'error' ? '#fef2f2' :
                          log.level === 'warning' ? '#fefce8' : '#f3f4f6',
                        color:
                          log.level === 'success' ? '#15803d' :
                          log.level === 'error' ? '#dc2626' :
                          log.level === 'warning' ? '#d97706' : '#374151',
                        padding: '0.125rem 0.375rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.625rem',
                        fontWeight: '500'
                      }}>
                        {log.level.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ margin: '0.25rem 0', fontFamily: 'monospace', fontSize: '0.625rem' }}>
                      {log.message}
                    </p>
                    {log.details && (
                      <pre style={{ 
                        fontSize: '0.625rem', 
                        backgroundColor: '#f3f4f6', 
                        padding: '0.5rem', 
                        borderRadius: '0.25rem', 
                        overflow: 'auto',
                        marginTop: '0.25rem'
                      }}>
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}