'use client';

import { CheckCircle, Loader2, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSaved?: Date | null;
  error?: string | null;
  className?: string;
}

export function SaveIndicator({ status, lastSaved, error, className }: SaveIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'saving':
        return {
          icon: Loader2,
          text: 'Guardando...',
          className: 'text-blue-600 animate-spin'
        };
      case 'saved':
        return {
          icon: CheckCircle,
          text: 'Guardado',
          className: 'text-green-600'
        };
      case 'error':
        return {
          icon: AlertCircle,
          text: 'Error al guardar',
          className: 'text-red-600'
        };
      default:
        return {
          icon: Clock,
          text: lastSaved ? `Guardado ${formatLastSaved(lastSaved)}` : 'Sin cambios',
          className: 'text-gray-500'
        };
    }
  };

  const formatLastSaved = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 1) {
      return 'hace un momento';
    } else if (diffMinutes < 60) {
      return `hace ${diffMinutes} min`;
    } else {
      return date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <Icon className={cn('h-4 w-4', config.className)} />
      <span className={config.className}>
        {config.text}
      </span>
      {status === 'error' && error && (
        <span className="text-xs text-red-500 ml-1">
          ({error})
        </span>
      )}
    </div>
  );
} 