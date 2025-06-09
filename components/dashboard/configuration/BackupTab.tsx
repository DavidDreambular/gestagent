'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Database, Save } from 'lucide-react';

export function BackupTab() {
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);

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
                  checked={autoBackupEnabled}
                  onCheckedChange={setAutoBackupEnabled}
                />
              </div>

              {autoBackupEnabled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="backup-frequency">Frecuencia</Label>
                      <select 
                        id="backup-frequency" 
                        className="w-full p-2 border rounded-md"
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
                        defaultValue="02:00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="backup-retention">Retención (días)</Label>
                    <Input 
                      id="backup-retention"
                      type="number"
                      defaultValue="30"
                      min="1"
                      max="365"
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
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="font-medium">Base de Datos</Label>
                  <p className="text-sm text-muted-foreground">
                    Metadatos y configuraciones
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="font-medium">Configuración</Label>
                  <p className="text-sm text-muted-foreground">
                    Ajustes del sistema y usuarios
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="font-medium">Logs de Auditoría</Label>
                  <p className="text-sm text-muted-foreground">
                    Registros de actividad del sistema
                  </p>
                </div>
                <Switch />
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
              {[
                { date: '2024-01-15 02:00', size: '2.3 GB', status: 'Exitoso' },
                { date: '2024-01-14 02:00', size: '2.1 GB', status: 'Exitoso' },
                { date: '2024-01-13 02:00', size: '2.0 GB', status: 'Exitoso' },
                { date: '2024-01-12 02:00', size: '1.9 GB', status: 'Error' },
                { date: '2024-01-11 02:00', size: '1.8 GB', status: 'Exitoso' }
              ].map((backup, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      backup.status === 'Exitoso' ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <p className="font-medium">{backup.date}</p>
                      <p className="text-sm text-muted-foreground">{backup.size}</p>
                    </div>
                  </div>
                  <Badge variant={backup.status === 'Exitoso' ? 'default' : 'destructive'}>
                    {backup.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Guardar Configuración
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 