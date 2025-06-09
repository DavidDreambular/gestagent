'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Download, 
  FileSpreadsheet, 
  Loader2,
  X,
  Calendar
} from 'lucide-react';

export default function SageExportButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: ''
  });

  const handleExport = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/documents/export/sage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': 'dev-user'
        },
        body: JSON.stringify({
          filters,
          options: { includePreview: false }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en la exportación');
      }

      // Descargar archivo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const fileName = `sage_facturas_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.xls`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(`Archivo ${fileName} descargado correctamente`);
      
      // Cerrar modal después de éxito
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(null);
      }, 2000);

    } catch (error: any) {
      console.error('Error en exportación:', error);
      setError(error.message || 'Error al exportar archivo');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button 
        variant="outline" 
        className="gap-2"
        onClick={() => setIsOpen(true)}
      >
        <FileSpreadsheet className="h-4 w-4" />
        Exportar a Sage
      </Button>
    );
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Exportación a Sage
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            Exportar facturas al formato específico de Sage (.xls) para importación contable
          </p>
          
          {/* Filtros */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Filtros de Fecha
              </Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <Label htmlFor="dateFrom" className="text-xs text-gray-500">
                    Desde
                  </Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="dateTo" className="text-xs text-gray-500">
                    Hasta
                  </Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Información sobre el formato */}
            <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
              <p className="text-xs text-blue-800">
                <strong>Formato Sage:</strong> El archivo incluirá todos los campos requeridos por Sage:
                Reg, Serie, Número factura, Fecha, NIF proveedor, Nombre proveedor, Concepto, 
                Totales, IVA, Retenciones, y datos de provincia.
              </p>
            </div>

            {/* Alertas */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                <strong>Error:</strong> {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
                <strong>Éxito:</strong> {success}
              </div>
            )}

            {/* Progreso */}
            {isLoading && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-gray-700">
                  Generando archivo Sage (.xls)...
                </span>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
              size="sm"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleExport}
              disabled={isLoading}
              className="gap-2"
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isLoading ? 'Exportando...' : 'Exportar .xls'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}