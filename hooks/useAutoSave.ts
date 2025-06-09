import { useEffect, useRef, useState } from 'react';

interface UseAutoSaveOptions {
  delay?: number; // Delay en milisegundos (default: 3000)
  onSave: (data: any) => Promise<void>;
  enabled?: boolean;
}

interface UseAutoSaveReturn {
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  triggerSave: (data: any) => void;
  lastSaved: Date | null;
  error: string | null;
}

export function useAutoSave({
  delay = 3000,
  onSave,
  enabled = true
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingDataRef = useRef<any>(null);

  const triggerSave = (data: any) => {
    if (!enabled) return;

    // Guardar los datos pendientes
    pendingDataRef.current = data;

    // Limpiar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Establecer nuevo timeout
    timeoutRef.current = setTimeout(async () => {
      if (!pendingDataRef.current) return;

      try {
        setSaveStatus('saving');
        setError(null);
        
        await onSave(pendingDataRef.current);
        
        setSaveStatus('saved');
        setLastSaved(new Date());
        
        // Volver a idle después de 2 segundos
        setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
        
      } catch (err) {
        console.error('Error en auto-guardado:', err);
        setSaveStatus('error');
        setError(err instanceof Error ? err.message : 'Error al guardar');
        
        // Volver a idle después de 5 segundos
        setTimeout(() => {
          setSaveStatus('idle');
        }, 5000);
      } finally {
        pendingDataRef.current = null;
      }
    }, delay);
  };

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    saveStatus,
    triggerSave,
    lastSaved,
    error
  };
} 