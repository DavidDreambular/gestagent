// Componente de campo editable para documentos
// /components/documents/EditableField.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface EditableFieldProps {
  label: string;
  value: any;
  field: string;
  jobId: string;
  invoiceIndex?: number;
  type?: 'text' | 'number' | 'date' | 'email' | 'textarea';
  className?: string;
  onUpdate?: (field: string, newValue: any) => void;
  readOnly?: boolean;
  placeholder?: string;
}

export function EditableField({
  label,
  value,
  field,
  jobId,
  invoiceIndex = 0,
  type = 'text',
  className = '',
  onUpdate,
  readOnly = false,
  placeholder
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Sincronizar con el valor externo
  useEffect(() => {
    setEditValue(value || '');
  }, [value]);

  // Enfocar cuando entra en modo edición
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Seleccionar todo el texto para facilitar edición
      if ('select' in inputRef.current) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  // Formatear valor para mostrar
  const formatDisplayValue = (val: any) => {
    if (val === null || val === undefined || val === '') {
      return <span className="text-muted-foreground italic">Haz clic para editar</span>;
    }
    
    if (type === 'number') {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      if (field.includes('amount') || field.includes('total') || field.includes('price')) {
        return new Intl.NumberFormat('es-ES', {
          style: 'currency',
          currency: 'EUR'
        }).format(num || 0);
      }
      return num?.toLocaleString('es-ES') || '0';
    }
    
    if (type === 'date' && val) {
      return new Date(val).toLocaleDateString('es-ES');
    }
    
    return String(val);
  };

  // Manejar guardado
  const handleSave = async () => {
    if (readOnly) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/documents/update/${jobId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          field: field,
          value: type === 'number' ? parseFloat(editValue) || 0 : editValue,
          invoiceIndex: invoiceIndex
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar');
      }

      const result = await response.json();
      
      // Callback al padre
      if (onUpdate) {
        onUpdate(field, editValue);
      }
      
      setLastSaved(new Date().toLocaleTimeString('es-ES'));
      setIsEditing(false);
      
      console.log(`✅ Campo ${field} actualizado:`, result);
      
    } catch (error) {
      console.error('❌ Error actualizando campo:', error);
      alert('Error al guardar los cambios. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar cancelación
  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
  };

  // Manejar Enter y Escape
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // Manejar clic para activar edición
  const handleClick = () => {
    if (!readOnly && !isEditing) {
      setIsEditing(true);
    }
  };

  // Manejar pérdida de foco para guardar automáticamente
  const handleBlur = () => {
    if (isEditing && editValue !== (value || '')) {
      handleSave();
    } else if (isEditing) {
      setIsEditing(false);
    }
  };

  return (
    <div className={cn("space-y-1", className)}>
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-muted-foreground">
          {label}
        </label>
        {lastSaved && (
          <Badge variant="outline" className="text-xs">
            Guardado {lastSaved}
          </Badge>
        )}
      </div>

      {/* Campo editable o valor estático */}
      {isEditing ? (
        <div className="flex items-center space-x-2">
          {type === 'textarea' ? (
            <Textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              placeholder={placeholder || `Ingresa ${label.toLowerCase()}`}
              className="min-h-[80px]"
              disabled={isLoading}
            />
          ) : (
            <Input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type={type}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              placeholder={placeholder || `Ingresa ${label.toLowerCase()}`}
              disabled={isLoading}
              className="flex-1"
            />
          )}
          
          <div className="flex items-center space-x-1">
            <Button
              size="sm"
              variant="default"
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <div 
          className={cn(
            "p-3 rounded-md border bg-background transition-all duration-200",
            !readOnly && "cursor-text hover:border-primary hover:shadow-sm",
            "min-h-[40px] flex items-center"
          )}
          onClick={handleClick}
        >
          <div className="flex-1 min-w-0">
            <div className="text-sm">
              {formatDisplayValue(value)}
            </div>
          </div>
        </div>
      )}
      
      {/* Hint para edición */}
      {isEditing && (
        <p className="text-xs text-muted-foreground">
          Presiona Enter para guardar, Escape para cancelar, o haz clic fuera para guardar automáticamente
        </p>
      )}
      
      {/* Hint para indicar que es editable */}
      {!isEditing && !readOnly && (
        <p className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          Haz clic para editar
        </p>
      )}
    </div>
  );
}

// Componente especializado para campos anidados (ej: supplier.name)
interface NestedEditableFieldProps extends Omit<EditableFieldProps, 'value'> {
  data: any;
  nestedField: string;
}

export function NestedEditableField({
  data,
  nestedField,
  field,
  ...props
}: NestedEditableFieldProps) {
  // Extraer valor anidado (ej: supplier.name de data.supplier.name)
  const getValue = (obj: any, path: string) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  const value = getValue(data, nestedField);

  return (
    <EditableField
      value={value}
      field={field}
      {...props}
    />
  );
}

// Componente para campos de líneas de items (arrays)
interface ItemFieldProps extends EditableFieldProps {
  itemIndex: number;
}

export function ItemEditableField({
  itemIndex,
  field,
  ...props
}: ItemFieldProps) {
  return (
    <EditableField
      field={`items.${itemIndex}.${field}`}
      {...props}
    />
  );
} 