// Componente Modal para Exportación a Sage
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Calendar, 
  Building, 
  Users, 
  FileSpreadsheet, 
  Eye, 
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react';

interface SageExportModalProps {
  documents?: any[];
  suppliers?: any[];
  customers?: any[];
}

interface ExportFilters {
  dateFrom?: string;
  dateTo?: string;
  supplierIds?: string[];
  customerIds?: string[];
  status?: string[];
}

interface ExportOptions {
  includePreview?: boolean;
  serieNumber?: number;
}

export default function SageExportModal({ 
  documents = [], 
  suppliers = [], 
  customers = [] 
}: SageExportModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [filters, setFilters] = useState<ExportFilters>({
    dateFrom: '',
    dateTo: '',
    supplierIds: [],
    customerIds: [],
    status: ['completed']
  });

  const [options, setOptions] = useState<ExportOptions>({
    includePreview: false,
    serieNumber: 2400857
  });

  const handleSupplierChange = (supplierId: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      supplierIds: checked 
        ? [...(prev.supplierIds || []), supplierId]
        : (prev.supplierIds || []).filter(id => id !== supplierId)
    }));
  };

  const handleCustomerChange = (customerId: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      customerIds: checked 
        ? [...(prev.customerIds || []), customerId]
        : (prev.customerIds || []).filter(id => id !== customerId)
    }));
  };

  const handlePreview = async () => {
    setIsLoading(true);
    setError(null);
    setExportProgress(30);

    try {
      const response = await fetch('/api/documents/export/sage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': 'dev-user'
        },
        body: JSON.stringify({
          filters,
          options: { ...options, includePreview: true }
        })
      });

      setExportProgress(70);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en la vista previa');
      }

      const data = await response.json();
      setPreviewData(data.preview || []);
      setTotalRecords(data.totalRecords || 0);
      setShowPreview(true);
      setSuccess(data.message || 'Vista previa generada correctamente');
      setExportProgress(100);

    } catch (error: any) {
      console.error('Error en vista previa:', error);
      setError(error.message || 'Error al generar vista previa');
      setExportProgress(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    setIsLoading(true);
    setError(null);
    setExportProgress(20);

    try {
      const response = await fetch('/api/documents/export/sage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': 'dev-user'
        },
        body: JSON.stringify({
          filters,
          options: { ...options, includePreview: false }
        })
      });

      setExportProgress(60);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en la exportación');
      }

      // Descargar archivo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // Extraer nombre del archivo de los headers
      const contentDisposition = response.headers.get('Content-Disposition');
      const fileName = contentDisposition?.match(/filename="(.+)"/)?.[1] || 
                     `sage_facturas_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.xls`;
      
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportProgress(100);
      setSuccess(`Archivo ${fileName} descargado correctamente`);
      
      // Cerrar modal después de éxito
      setTimeout(() => {
        setIsOpen(false);
        setShowPreview(false);
        setExportProgress(0);
        setSuccess(null);
      }, 2000);

    } catch (error: any) {
      console.error('Error en exportación:', error);
      setError(error.message || 'Error al exportar archivo');
      setExportProgress(0);
    } finally {
      setIsLoading(false);
    }
  };

  const resetModal = () => {
    setShowPreview(false);
    setPreviewData([]);
    setTotalRecords(0);
    setError(null);
    setSuccess(null);
    setExportProgress(0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetModal();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Exportar a Sage
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Exportación a Sage
          </DialogTitle>
          <DialogDescription>
            Configura los filtros y opciones para exportar facturas al formato específico de Sage (.xls)
          </DialogDescription>
        </DialogHeader>

        {/* Progreso de exportación */}
        {isLoading && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">
                {showPreview ? 'Generando vista previa...' : 'Exportando archivo...'}
              </span>
            </div>
            <Progress value={exportProgress} className="w-full" />
          </div>
        )}

        {/* Alertas */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {!showPreview ? (
          <>
            {/* Filtros de Fecha */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Filtros de Fecha
                </Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="dateFrom">Fecha desde</Label>
                    <Input
                      id="dateFrom"
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateTo">Fecha hasta</Label>
                    <Input
                      id="dateTo"
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Filtros de Proveedores */}
              <div>
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Proveedores
                </Label>
                <div className="max-h-32 overflow-y-auto mt-2 space-y-2">
                  {suppliers.length > 0 ? (
                    suppliers.map((supplier) => (
                      <div key={supplier.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`supplier-${supplier.id}`}
                          checked={filters.supplierIds?.includes(supplier.id)}
                          onCheckedChange={(checked) => 
                            handleSupplierChange(supplier.id, checked as boolean)
                          }
                        />
                        <Label htmlFor={`supplier-${supplier.id}`} className="text-sm">
                          {supplier.name}
                        </Label>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No hay proveedores disponibles
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Opciones de Exportación */}
              <div>
                <Label className="text-base font-semibold">Opciones de Exportación</Label>
                <div className="mt-2 space-y-3">
                  <div>
                    <Label htmlFor="serieNumber">Número de Serie Inicial</Label>
                    <Input
                      id="serieNumber"
                      type="number"
                      value={options.serieNumber}
                      onChange={(e) => setOptions(prev => ({ 
                        ...prev, 
                        serieNumber: parseInt(e.target.value) || 2400857 
                      }))}
                      placeholder="2400857"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Número secuencial inicial para el campo &quot;Reg&quot; en Sage
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Vista Previa */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span className="font-semibold">Vista Previa</span>
                <Badge variant="secondary">{totalRecords} registros</Badge>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowPreview(false)}
              >
                Volver a Filtros
              </Button>
            </div>

            <div className="max-h-80 overflow-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Reg</th>
                    <th className="p-2 text-left">Serie</th>
                    <th className="p-2 text-left">Número factura</th>
                    <th className="p-2 text-left">Fecha</th>
                    <th className="p-2 text-left">NIF Proveedor</th>
                    <th className="p-2 text-left">Nombre Proveedor</th>
                    <th className="p-2 text-left">Total factura</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((record, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">{record.Reg}</td>
                      <td className="p-2">{record.Serie}</td>
                      <td className="p-2">{record['Número factura']}</td>
                      <td className="p-2">{record['Fecha factura']}</td>
                      <td className="p-2">{record['NIF proveedor']}</td>
                      <td className="p-2">{record['Nombre proveedor']}</td>
                      <td className="p-2">{record['Total factura']}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {previewData.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                No hay datos para mostrar con los filtros seleccionados
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {!showPreview && (
              <Button
                variant="outline"
                onClick={handlePreview}
                disabled={isLoading}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                Vista Previa
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleExport}
              disabled={isLoading || (showPreview && previewData.length === 0)}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {isLoading ? 'Exportando...' : 'Exportar .xls'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 