// Hook personalizado para configuración del sistema
// /hooks/useConfiguration.ts

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface SystemConfiguration {
  company: {
    name: string;
    cif: string;
    address: string;
    phone: string;
    email: string;
    logo_url?: string;
  };
  apis: {
    mistral_api_key: string;
    openai_api_key: string;
    openrouter_api_key?: string;
    stripe_api_key?: string;
  };
  notifications: {
    email_enabled: boolean;
    push_enabled: boolean;
    vencimientos_dias: number;
    alertas_criticas: boolean;
  };
  backup: {
    auto_backup_enabled: boolean;
    backup_frequency_days: number;
    backup_retention_days: number;
    backup_location: string;
  };
  advanced: {
    debug_mode: boolean;
    api_rate_limit: number;
    max_file_size_mb: number;
    allowed_file_types: string[];
    ocr_language: string;
  };
}

interface UseConfigurationReturn {
  config: SystemConfiguration | null;
  loading: boolean;
  error: string | null;
  updateConfig: (section: string, data: any) => Promise<boolean>;
  resetConfig: () => Promise<boolean>;
  refreshConfig: () => void;
}

export function useConfiguration(): UseConfigurationReturn {
  const { data: session } = useSession();
  const [config, setConfig] = useState<SystemConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Función para cargar configuración
  const loadConfiguration = async () => {
    if (!session) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/configuration', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('No autorizado para acceder a la configuración');
          return;
        }
        if (response.status === 403) {
          setError('Permisos insuficientes para ver la configuración');
          return;
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setConfig(result.data);
        console.log('✅ [CONFIG] Configuración cargada:', result.source);
      } else {
        throw new Error(result.error || 'Error desconocido');
      }

    } catch (err) {
      console.error('❌ [CONFIG] Error cargando configuración:', err);
      setError(err instanceof Error ? err.message : 'Error cargando configuración');
    } finally {
      setLoading(false);
    }
  };

  // Función para actualizar configuración
  const updateConfig = async (section: string, data: any): Promise<boolean> => {
    if (!session) {
      setError('Sesión requerida');
      return false;
    }

    try {
      setError(null);

      const response = await fetch('/api/configuration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ section, data }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Actualizar configuración local
        if (config) {
          setConfig({
            ...config,
            [section]: { ...config[section as keyof SystemConfiguration], ...data }
          });
        }
        console.log(`✅ [CONFIG] Sección ${section} actualizada`);
        return true;
      } else {
        throw new Error(result.error || 'Error actualizando configuración');
      }

    } catch (err) {
      console.error(`❌ [CONFIG] Error actualizando ${section}:`, err);
      setError(err instanceof Error ? err.message : 'Error actualizando configuración');
      return false;
    }
  };

  // Función para restablecer configuración
  const resetConfig = async (): Promise<boolean> => {
    if (!session) {
      setError('Sesión requerida');
      return false;
    }

    try {
      setError(null);

      const response = await fetch('/api/configuration', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setConfig(result.data);
        console.log('✅ [CONFIG] Configuración restablecida');
        return true;
      } else {
        throw new Error(result.error || 'Error restableciendo configuración');
      }

    } catch (err) {
      console.error('❌ [CONFIG] Error restableciendo configuración:', err);
      setError(err instanceof Error ? err.message : 'Error restableciendo configuración');
      return false;
    }
  };

  // Función para refrescar configuración
  const refreshConfig = () => {
    loadConfiguration();
  };

  // Cargar configuración al montar el componente
  useEffect(() => {
    loadConfiguration();
  }, [session]);

  return {
    config,
    loading,
    error,
    updateConfig,
    resetConfig,
    refreshConfig,
  };
}

// Hook para configuración específica de empresa
export function useCompanyConfig() {
  const { config, updateConfig, loading, error } = useConfiguration();
  
  const updateCompanyConfig = async (companyData: Partial<SystemConfiguration['company']>) => {
    return await updateConfig('company', companyData);
  };

  return {
    companyConfig: config?.company || null,
    updateCompanyConfig,
    loading,
    error,
  };
}

// Hook para configuración de APIs
export function useApiConfig() {
  const { config, updateConfig, loading, error } = useConfiguration();
  
  const updateApiConfig = async (apiData: Partial<SystemConfiguration['apis']>) => {
    return await updateConfig('apis', apiData);
  };

  const testApiConnection = async (apiType: string, apiKey: string): Promise<boolean> => {
    try {
      console.log(`🧪 [CONFIG] Probando conexión ${apiType}...`);
      
      const response = await fetch('/api/configuration/test-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiType, apiKey }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`❌ [CONFIG] Error de API: ${errorData.error}`);
        return false;
      }

      const result = await response.json();
      console.log(`${result.success ? '✅' : '❌'} [CONFIG] ${apiType}: ${result.message}`);
      return result.success;
      
    } catch (error) {
      console.error(`❌ [CONFIG] Error probando ${apiType}:`, error);
      return false;
    }
  };

  return {
    apiConfig: config?.apis || null,
    updateApiConfig,
    testApiConnection,
    loading,
    error,
  };
}

// Hook para configuración de notificaciones
export function useNotificationConfig() {
  const { config, updateConfig, loading, error } = useConfiguration();
  
  const updateNotificationConfig = async (notificationData: Partial<SystemConfiguration['notifications']>) => {
    return await updateConfig('notifications', notificationData);
  };

  return {
    notificationConfig: config?.notifications || null,
    updateNotificationConfig,
    loading,
    error,
  };
}

// Hook para configuración de backup
export function useBackupConfig() {
  const { config, updateConfig, loading, error } = useConfiguration();
  
  const updateBackupConfig = async (backupData: Partial<SystemConfiguration['backup']>) => {
    return await updateConfig('backup', backupData);
  };

  return {
    backupConfig: config?.backup || null,
    updateBackupConfig,
    loading,
    error,
  };
}

// Hook para configuración avanzada
export function useAdvancedConfig() {
  const { config, updateConfig, loading, error } = useConfiguration();
  
  const updateAdvancedConfig = async (advancedData: Partial<SystemConfiguration['advanced']>) => {
    return await updateConfig('advanced', advancedData);
  };

  return {
    advancedConfig: config?.advanced || null,
    updateAdvancedConfig,
    loading,
    error,
  };
} 