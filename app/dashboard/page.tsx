// app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileUp, BarChart, FileText, AlertCircle, MoreHorizontal } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import Link from 'next/link';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const { user, profile } = useAuth();

  // Cargar datos del dashboard
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Obtener datos de documentos recientes
        const docsResponse = await fetch('/api/dashboard/summary');
        
        if (!docsResponse.ok) {
          throw new Error('Error al cargar datos del dashboard');
        }
        
        const data = await docsResponse.json();
        setDashboardData(data);
      } catch (error) {
        console.error('Error al cargar el dashboard:', error);
        setError((error as Error).message);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Datos de prueba para el dashboard mientras se implementa la API real
  const mockDashboardData = {
    stats: {
      totalDocuments: 152,
      pendingDocuments: 7,
      totalAmount: 32560.75,
      totalTaxes: 6837.76,
      documentsTrend: 15,
      pendingTrend: -12,
      amountTrend: 22,
      taxesTrend: 18
    },
    documentTypes: [
      { name: 'Facturas', value: 87 },
      { name: 'Nóminas', value: 34 },
      { name: 'Recibos', value: 22 },
      { name: 'Extractos', value: 9 }
    ],
    documentStatus: [
      { name: 'Validados', value: 142 },
      { name: 'Procesando', value: 3 },
      { name: 'Con errores', value: 4 },
      { name: 'Pendientes', value: 3 }
    ],
    recentDocuments: [
      {
        id: '1',
        title: 'Factura Electricidad Abril',
        type: 'factura',
        status: 'validated',
        date: '2023-04-15T10:30:00',
        emitter: 'Iberdrola',
        receiver: 'Mi Empresa S.L.',
        amount: 125.60
      },
      {
        id: '2',
        title: 'Nómina Marzo 2023',
        type: 'nomina',
        status: 'validated',
        date: '2023-04-02T12:00:00',
        emitter: 'Mi Empresa S.L.',
        receiver: 'Juan Pérez',
        amount: 2350.00
      },
      {
        id: '3',
        title: 'Factura Material Oficina',
        type: 'factura',
        status: 'processing',
        date: '2023-04-18T15:20:00',
        emitter: 'Staples',
        receiver: 'Mi Empresa S.L.',
        amount: 89.75
      }
    ]
  };

  // Usar datos reales si están disponibles, o los datos de prueba en su defecto
  const data = dashboardData || mockDashboardData;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Bienvenido, {profile?.username || 'Usuario'}. Aquí tienes un resumen de tus documentos.
          </p>
        </div>
        <div className="flex space-x-2">
          <Button asChild>
            <Link href="/dashboard/documents/new">
              <FileUp className="mr-2 h-4 w-4" />
              Nuevo Documento
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/reports">
              <BarChart className="mr-2 h-4 w-4" />
              Ver Reportes
            </Link>
          </Button>
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.totalDocuments}</div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground pt-1">
                Documentos procesados
              </p>
              <div className="text-xs font-medium flex items-center text-green-600">
                +{data.stats.documentsTrend}% vs. mes anterior
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.pendingDocuments}</div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground pt-1">
                Documentos por revisar
              </p>
              <div className="text-xs font-medium flex items-center text-green-600">
                {data.stats.pendingTrend}% vs. mes anterior
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Importe Total</CardTitle>
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.stats.totalAmount)}</div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground pt-1">
                Valor procesado
              </p>
              <div className="text-xs font-medium flex items-center text-green-600">
                +{data.stats.amountTrend}% vs. mes anterior
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impuestos</CardTitle>
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.stats.totalTaxes)}</div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground pt-1">
                IVA + otros impuestos
              </p>
              <div className="text-xs font-medium flex items-center text-green-600">
                +{data.stats.taxesTrend}% vs. mes anterior
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Esqueleto de carga para el dashboard
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-[250px]" />
          <Skeleton className="h-4 w-[350px] mt-2" />
        </div>
        <div className="flex space-x-2">
          <Skeleton className="h-10 w-[150px]" />
          <Skeleton className="h-10 w-[150px]" />
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array(4).fill(0).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-[120px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[100px]" />
              <Skeleton className="h-4 w-[160px] mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}