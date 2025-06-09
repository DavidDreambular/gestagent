'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface AutoSaveEditableFieldProps {
  label: string;
  value: any;
  field: string;
  type?: 'text' | 'number' | 'date' | 'email' | 'textarea';
  className?: string;
  onChange?: (field: string, newValue: any) => void;
  readOnly?: boolean;
  placeholder?: string;
}

export function AutoSaveEditableField({
  label,
  value,
  field,
  type = 'text',
  className = '',
  onChange,
  readOnly = false,
  placeholder
}: AutoSaveEditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Sincronizar con el valor externo
  useEffect(() => {
    setEditValue(value || '');
  }, [value]);

  // Enfocar cuando entra en modo edición
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
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
  const handleSave = () => {
    if (readOnly) return;
    
    const finalValue = type === 'number' ? parseFloat(editValue) || 0 : editValue;
    
    if (onChange) {
      onChange(field, finalValue);
    }
    
    setIsEditing(false);
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
      <label className="text-sm font-medium text-muted-foreground">
        {label}
      </label>

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
              className="flex-1"
            />
          )}
        </div>
      ) : (
        <div
          onClick={handleClick}
          className={cn(
            "min-h-[40px] px-3 py-2 border rounded-md cursor-pointer transition-colors",
            "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring",
            readOnly && "cursor-default hover:bg-transparent"
          )}
          tabIndex={readOnly ? -1 : 0}
        >
          {formatDisplayValue(value)}
        </div>
      )}
    </div>
  );
} 