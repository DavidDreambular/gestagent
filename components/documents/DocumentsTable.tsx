'use client';

import React, { useState, useCallback } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';
import { exportDocumentsToExcel } from '@/lib/utils/excel-export';
import Link from 'next/link';

interface Document {
  jobId: string;
  documentType: string;
  status: string;
  uploadTimestamp: string;
  supplierName?: string;
  customerName?: string;
  invoiceNumber?: string;
  totalAmount?: number;
  extractedData?: any;
}

interface DocumentsTableProps {
  documents: Document[];
  loading?: boolean;
  onRefresh?: () => void;
}

export default function DocumentsTable({ 
  documents, 
  loading = false, 
  onRefresh 
}: DocumentsTableProps) {
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  // Manejar selección individual
  const handleSelectDocument = useCallback((jobId: string, checked: boolean) => {
    setSelectedDocuments(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(jobId);
      } else {
        newSet.delete(jobId);
      }
      return newSet;
    });
  }, []);

  // Manejar selección de todos
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedDocuments(new Set(documents.map(doc => doc.jobId)));
    } else {
      setSelectedDocuments(new Set());
    }
  }, [documents]);

  // Exportar documentos seleccionados
  const handleExportSelected = async () => {
    if (selectedDocuments.size === 0) {
      alert('Por favor selecciona al menos un documento para exportar');
      return;
    }

    try {
      setIsExporting(true);
      
      // Convertir IDs seleccionados a objetos DocumentData
      const selectedDocs = documents
        .filter(doc => selectedDocuments.has(doc.jobId))
        .map(doc => ({
          job_id: doc.jobId,
          document_type: doc.documentType,
          emitter_name: doc.supplierName,
          receiver_name: doc.customerName,
          document_date: doc.uploadTimestamp,
          total_amount: doc.totalAmount,
          status: doc.status,
          upload_timestamp: doc.uploadTimestamp,
          processed_json: doc.extractedData || null
        }));
      
      await exportDocumentsToExcel(selectedDocs, {
        includeDetails: true,
        includeIndex: true,
        filename: `documentos_seleccionados_${new Date().toISOString().split('T')[0]}.xlsx`
      });

      // Limpiar selección después de exportar
      setSelectedDocuments(new Set());
      
    } catch (error) {
      console.error('Error exportando documentos:', error);
      alert('Error al exportar documentos. Por favor intenta de nuevo.');
    } finally {
      setIsExporting(false);
    }
  };

  // Exportar todos los documentos
  const handleExportAll = async () => {
    try {
      setIsExporting(true);
      
      // Convertir todos los documentos a objetos DocumentData
      const allDocs = documents.map(doc => ({
        job_id: doc.jobId,
        document_type: doc.documentType,
        emitter_name: doc.supplierName,
        receiver_name: doc.customerName,
        document_date: doc.uploadTimestamp,
        total_amount: doc.totalAmount,
        status: doc.status,
        upload_timestamp: doc.uploadTimestamp,
        processed_json: doc.extractedData || null
      }));
      
      await exportDocumentsToExcel(allDocs, {
        includeDetails: true,
        includeIndex: true,
        filename: `todos_los_documentos_${new Date().toISOString().split('T')[0]}.xlsx`
      });
      
    } catch (error) {
      console.error('Error exportando todos los documentos:', error);
      alert('Error al exportar documentos. Por favor intenta de nuevo.');
    } finally {
      setIsExporting(false);
    }
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Obtener badge de estado
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'processed':
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Procesado
          </Badge>
        );
      case 'processing':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Procesando
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-100 text-red-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Formatear moneda
  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const allSelected = documents.length > 0 && selectedDocuments.size === documents.length;
  const someSelected = selectedDocuments.size > 0 && selectedDocuments.size < documents.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Cargando documentos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barra de acciones */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            {selectedDocuments.size > 0 
              ? `${selectedDocuments.size} documento(s) seleccionado(s)`
              : `${documents.length} documento(s) total`
            }
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {selectedDocuments.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportSelected}
              disabled={isExporting}
              className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 mr-2" />
              )}
              Exportar Seleccionados ({selectedDocuments.size})
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportAll}
            disabled={isExporting || documents.length === 0}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Exportar Todos
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Número</TableHead>
              <TableHead>Importe</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No hay documentos disponibles</p>
                  <p className="text-sm">Sube tu primer documento para comenzar</p>
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => (
                <TableRow key={doc.jobId} className="hover:bg-gray-50">
                  <TableCell>
                    <Checkbox
                      checked={selectedDocuments.has(doc.jobId)}
                      onCheckedChange={(checked) => 
                        handleSelectDocument(doc.jobId, checked as boolean)
                      }
                    />
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="font-medium capitalize">
                          {doc.documentType || 'Documento'}
                        </p>
                        <p className="text-xs text-gray-500">
                          ID: {doc.jobId.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <span className="text-sm">
                      {doc.supplierName || 'No detectado'}
                    </span>
                  </TableCell>
                  
                  <TableCell>
                    <span className="text-sm font-mono">
                      {doc.invoiceNumber || '-'}
                    </span>
                  </TableCell>
                  
                  <TableCell>
                    <span className="font-medium">
                      {formatCurrency(doc.totalAmount)}
                    </span>
                  </TableCell>
                  
                  <TableCell>
                    {getStatusBadge(doc.status)}
                  </TableCell>
                  
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {formatDate(doc.uploadTimestamp)}
                    </span>
                  </TableCell>
                  
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/documents/${doc.jobId}`}>
                        Ver
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Información adicional */}
      {selectedDocuments.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                Exportación Excel disponible
              </p>
              <p className="text-xs text-blue-700">
                Los documentos seleccionados se exportarán con múltiples hojas: 
                resumen, documentos, conceptos e índice con enlaces.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 