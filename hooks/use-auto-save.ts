import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseAutoSaveOptions {
  delay?: number;
  onSave: (data: any) => Promise<boolean>;
  data: any;
  enabled?: boolean;
}

export interface UseAutoSaveReturn {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  saveNow: () => Promise<void>;
  resetUnsavedChanges: () => void;
}

export function useAutoSave({
  delay = 3000,
  onSave,
  data,
  enabled = true
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialData, setInitialData] = useState(data);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dataRef = useRef(data);
  const isFirstRender = useRef(true);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setInitialData(data);
      return;
    }

    if (enabled && JSON.stringify(data) !== JSON.stringify(initialData)) {
      setHasUnsavedChanges(true);
      
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        performSave();
      }, delay);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [data, initialData, enabled, delay]);

  const performSave = useCallback(async () => {
    if (!enabled || isSaving) return;

    try {
      setIsSaving(true);
      console.log('💾 [AutoSave] Guardando cambios automáticamente...');
      
      const success = await onSave(dataRef.current);
      
      if (success) {
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        setInitialData(dataRef.current);
        console.log('✅ [AutoSave] Cambios guardados correctamente');
      }
    } catch (error) {
      console.error('❌ [AutoSave] Error guardando:', error);
    } finally {
      setIsSaving(false);
    }
  }, [enabled, isSaving, onSave]);

  const saveNow = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await performSave();
  }, [performSave]);

  const resetUnsavedChanges = useCallback(() => {
    setHasUnsavedChanges(false);
    setInitialData(dataRef.current);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    saveNow,
    resetUnsavedChanges
  };
} 