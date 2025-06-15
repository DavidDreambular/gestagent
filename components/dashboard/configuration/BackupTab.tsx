'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Database, Save, Loader2 } from 'lucide-react';
import { useBackupConfig } from '@/hooks/useConfiguration';
import { useToast } from '@/components/ui/use-toast';

interface BackupTabProps {
  hasPermission: (permission: string) => boolean;
}

export function BackupTab({ hasPermission }: BackupTabProps) {
  const { toast } = useToast();
  const { backupConfig, updateBackupConfig, loading } = useBackupConfig();
  const [isSaving, setIsSaving] = useState(false);
  const [backupHistory, setBackupHistory] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    auto_backup_enabled: true,
    backup_frequency: 'daily',
    backup_time: '02:00',
    backup_retention_days: 30,
    backup_types: {
      documents: true,
      database: true,
      configuration: true,
      audit_logs: false
    },
    backup_destination: 'local'
  });

  // Load backup history
  useEffect(() => {
    fetchBackupHistory();
  }, []);

  // Load config data
  useEffect(() => {
    if (backupConfig) {
      setFormData({
        auto_backup_enabled: backupConfig.auto_backup_enabled,
        backup_frequency: backupConfig.backup_frequency_days === 1 ? 'daily' : 
                         backupConfig.backup_frequency_days === 7 ? 'weekly' : 'monthly',
        backup_time: '02:00', // Default, should come from config
        backup_retention_days: backupConfig.backup_retention_days,
        backup_types: {
          documents: true,
          database: true,
          configuration: true,
          audit_logs: false
        },
        backup_destination: backupConfig.backup_location
      });
    }
  }, [backupConfig]);

  const fetchBackupHistory = async () => {
    try {
      const response = await fetch('/api/configuration/backup');
      if (response.ok) {
        const data = await response.json();
        setBackupHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error fetching backup history:', error);
    }
  };

  const saveBackupConfig = async () => {
    setIsSaving(true);
    try {
      const configData = {
        auto_backup_enabled: formData.auto_backup_enabled,
        backup_frequency_days: formData.backup_frequency === 'daily' ? 1 : 
                              formData.backup_frequency === 'weekly' ? 7 : 30,
        backup_retention_days: formData.backup_retention_days,
        backup_location: formData.backup_destination
      };
      
      const success = await updateBackupConfig(configData);
      if (success) {
        toast({
          title: 'Backup configurado',
          description: 'La configuración de backup se ha actualizado.',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar la configuración de backup.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const createManualBackup = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/configuration/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        toast({
          title: 'Backup iniciado',
          description: 'El proceso de backup ha comenzado. Recibirás una notificación cuando termine.',
        });
        // Refresh history after a delay
        setTimeout(fetchBackupHistory, 6000);
      } else {
        throw new Error('Error al crear backup');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo iniciar el backup.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Configuración de Backup
          </CardTitle>
          <CardDescription>
            Gestión de copias de seguridad automáticas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configuración de Backup Automático */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Backup Automático</h3>
            
            <div className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Activar backup automático</Label>
                  <p className="text-sm text-muted-foreground">
                    Realizar copias de seguridad de forma automática
                  </p>
                </div>
                <Switch 
                  checked={formData.auto_backup_enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, auto_backup_enabled: checked })}
                  disabled={!hasPermission('config:backup')}
                />
              </div>

              {formData.auto_backup_enabled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="backup-frequency">Frecuencia</Label>
                      <select 
                        id="backup-frequency" 
                        className="w-full p-2 border rounded-md"
                        value={formData.backup_frequency}
                        onChange={(e) => setFormData({ ...formData, backup_frequency: e.target.value })}
                        disabled={!hasPermission('config:backup')}
                      >
                        <option value="daily">Diario</option>
                        <option value="weekly">Semanal</option>
                        <option value="monthly">Mensual</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="backup-time">Hora de ejecución</Label>
                      <Input 
                        id="backup-time"
                        type="time"
                        value={formData.backup_time}
                        onChange={(e) => setFormData({ ...formData, backup_time: e.target.value })}
                        disabled={!hasPermission('config:backup')}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="backup-retention">Retención (días)</Label>
                    <Input 
                      id="backup-retention"
                      type="number"
                      value={formData.backup_retention_days}
                      onChange={(e) => setFormData({ ...formData, backup_retention_days: parseInt(e.target.value) })}
                      min="1"
                      max="365"
                      disabled={!hasPermission('config:backup')}
                    />
                    <p className="text-xs text-muted-foreground">
                      Número de días que se conservarán los backups
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Tipos de Datos a Respaldar */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Tipos de Datos</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="font-medium">Documentos</Label>
                  <p className="text-sm text-muted-foreground">
                    PDFs originales y datos procesados
                  </p>
                </div>
                <Switch 
                  checked={formData.backup_types.documents}
                  onCheckedChange={(checked) => setFormData({ 
                    ...formData, 
                    backup_types: { ...formData.backup_types, documents: checked }
                  })}
                  disabled={!hasPermission('config:backup')}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="font-medium">Base de Datos</Label>
                  <p className="text-sm text-muted-foreground">
                    Metadatos y configuraciones
                  </p>
                </div>
                <Switch 
                  checked={formData.backup_types.database}
                  onCheckedChange={(checked) => setFormData({ 
                    ...formData, 
                    backup_types: { ...formData.backup_types, database: checked }
                  })}
                  disabled={!hasPermission('config:backup')}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="font-medium">Configuración</Label>
                  <p className="text-sm text-muted-foreground">
                    Ajustes del sistema y usuarios
                  </p>
                </div>
                <Switch 
                  checked={formData.backup_types.configuration}
                  onCheckedChange={(checked) => setFormData({ 
                    ...formData, 
                    backup_types: { ...formData.backup_types, configuration: checked }
                  })}
                  disabled={!hasPermission('config:backup')}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="font-medium">Logs de Auditoría</Label>
                  <p className="text-sm text-muted-foreground">
                    Registros de actividad del sistema
                  </p>
                </div>
                <Switch 
                  checked={formData.backup_types.audit_logs}
                  onCheckedChange={(checked) => setFormData({ 
                    ...formData, 
                    backup_types: { ...formData.backup_types, audit_logs: checked }
                  })}
                  disabled={!hasPermission('config:backup')}
                />
              </div>
            </div>
          </div>

          {/* Destino del Backup */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Destino del Backup</h3>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input type="radio" id="local" name="backup-destination" value="local" defaultChecked />
                <Label htmlFor="local">Local (servidor)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="radio" id="cloud" name="backup-destination" value="cloud" />
                <Label htmlFor="cloud">Cloud (AWS S3, Google Drive)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="radio" id="both" name="backup-destination" value="both" />
                <Label htmlFor="both">Ambos (local + cloud)</Label>
              </div>
            </div>
          </div>

          {/* Backup Manual */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Backup Manual</h3>
            
            <div className="p-4 border rounded-lg space-y-4">
              <p className="text-sm text-muted-foreground">
                Crear una copia de seguridad inmediata de todos los datos
              </p>
              <Button className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Crear Backup Ahora
              </Button>
            </div>
          </div>

          {/* Historial de Backups */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Historial de Backups</h3>
            
            <div className="space-y-2">
              {backupHistory.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No hay backups anteriores</p>
              ) : (
                backupHistory.map((backup, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        backup.status === 'completed' ? 'bg-green-500' : 
                        backup.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                      }`} />
                      <div>
                        <p className="font-medium">{new Date(backup.date).toLocaleString('es-ES')}</p>
                        <p className="text-sm text-muted-foreground">{backup.size}</p>
                      </div>
                    </div>
                    <Badge variant={backup.status === 'completed' ? 'default' : backup.status === 'failed' ? 'destructive' : 'secondary'}>
                      {backup.status === 'completed' ? 'Exitoso' : backup.status === 'failed' ? 'Error' : 'En progreso'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>

          {hasPermission('config:backup') && (
            <div className="flex justify-end">
              <Button 
                className="flex items-center gap-2"
                onClick={saveBackupConfig}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Guardar Configuración
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 