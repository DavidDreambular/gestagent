'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  FileSpreadsheet, 
  Loader2,
  CheckCircle
} from 'lucide-react';
import { exportDocumentsToExcel } from '@/lib/utils/excel-export';

interface ExportButtonProps {
  documentIds?: string[];
  exportType?: 'selected' | 'all' | 'filtered';
  filters?: any;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  children?: React.ReactNode;
  onExportStart?: () => void;
  onExportComplete?: () => void;
  onExportError?: (error: Error) => void;
}

export default function ExportButton({
  documentIds = [],
  exportType = 'selected',
  filters = {},
  variant = 'outline',
  size = 'default',
  className = '',
  children,
  onExportStart,
  onExportComplete,
  onExportError
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportSuccess(false);
      onExportStart?.();

      if (exportType === 'selected' && documentIds.length > 0) {
        // Para documentos seleccionados, necesitamos los objetos completos
        throw new Error('La exportación de documentos seleccionados debe hacerse desde el componente padre con los datos completos');
      } else if (exportType === 'all' || exportType === 'filtered') {
        // Para exportar todos/filtrados, necesitamos hacer fetch de los datos
        const response = await fetch('/api/documents/list');
        if (!response.ok) throw new Error('Error obteniendo documentos');
        
        const data = await response.json();
        const documents = data.documents || [];
        
        await exportDocumentsToExcel(documents, {
          includeDetails: true,
          includeIndex: true,
          filename: `documentos_${exportType === 'all' ? 'todos' : 'filtrados'}_${new Date().toISOString().split('T')[0]}.xlsx`
        });
      } else {
        throw new Error('No hay documentos para exportar');
      }

      setExportSuccess(true);
      onExportComplete?.();
      
      // Reset success state after 2 seconds
      setTimeout(() => setExportSuccess(false), 2000);

    } catch (error) {
      console.error('Error exportando:', error);
      onExportError?.(error as Error);
      
      // Show user-friendly error
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`Error al exportar: ${errorMessage}`);
    } finally {
      setIsExporting(false);
    }
  };

  const getButtonContent = () => {
    if (isExporting) {
      return (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Exportando...
        </>
      );
    }

    if (exportSuccess) {
      return (
        <>
          <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
          ¡Exportado!
        </>
      );
    }

    if (children) {
      return children;
    }

    const count = exportType === 'selected' ? documentIds.length : '';
    const countText = count ? ` (${count})` : '';

    return (
      <>
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        {exportType === 'selected' && `Exportar Seleccionados${countText}`}
        {exportType === 'all' && 'Exportar Todos'}
        {exportType === 'filtered' && 'Exportar Filtrados'}
      </>
    );
  };

  const isDisabled = isExporting || 
    (exportType === 'selected' && documentIds.length === 0);

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={isDisabled}
      className={`${className} ${exportSuccess ? 'border-green-500 bg-green-50' : ''}`}
    >
      {getButtonContent()}
    </Button>
  );
}

// Componente específico para exportar documentos seleccionados
export function ExportSelectedButton({ 
  selectedIds, 
  onClearSelection,
  ...props 
}: { 
  selectedIds: string[];
  onClearSelection?: () => void;
} & Omit<ExportButtonProps, 'documentIds' | 'exportType'>) {
  return (
    <ExportButton
      documentIds={selectedIds}
      exportType="selected"
      onExportComplete={() => {
        onClearSelection?.();
        props.onExportComplete?.();
      }}
      {...props}
    />
  );
}

// Componente específico para exportar todos los documentos
export function ExportAllButton(props: Omit<ExportButtonProps, 'exportType'>) {
  return (
    <ExportButton
      exportType="all"
      {...props}
    >
      <Download className="h-4 w-4 mr-2" />
      Exportar Todos
    </ExportButton>
  );
} 