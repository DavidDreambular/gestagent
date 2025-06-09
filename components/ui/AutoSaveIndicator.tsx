'use client';

import React from 'react';
import { CheckCircle, Loader2, AlertCircle, Clock } from 'lucide-react';

interface AutoSaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error' | 'unsaved';
  lastSaved?: Date | null;
  className?: string;
}

export default function AutoSaveIndicator({ 
  status, 
  lastSaved, 
  className = '' 
}: AutoSaveIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'saving':
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          text: 'Guardando...',
          color: 'text-blue-600'
        };
      case 'saved':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          text: 'Guardado',
          color: 'text-green-600'
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          text: 'Error al guardar',
          color: 'text-red-600'
        };
      case 'unsaved':
        return {
          icon: <Clock className="h-4 w-4" />,
          text: 'Cambios sin guardar',
          color: 'text-orange-600'
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  
  if (!config) return null;

  const formatLastSaved = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    
    if (diffSeconds < 60) {
      return 'hace unos segundos';
    } else if (diffMinutes < 60) {
      return `hace ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
    } else {
      return date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  return (
    <div className={`flex items-center space-x-2 text-sm ${config.color} ${className}`}>
      {config.icon}
      <span>{config.text}</span>
      {status === 'saved' && lastSaved && (
        <span className="text-xs text-gray-500">
          {formatLastSaved(lastSaved)}
        </span>
      )}
    </div>
  );
} 