'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, DollarSign, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface Invoice {
  id: string;
  number: string;
  date: string;
  amount: number;
  status: 'pending' | 'processed' | 'error';
  documentType: string;
  supplier?: string;
  customer?: string;
}

interface InvoiceHistoryProps {
  entityId: string;
  entityType: 'supplier' | 'customer';
  entityName: string;
}

export function InvoiceHistory({ entityId, entityType, entityName }: InvoiceHistoryProps) {
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setError(null);
        console.log(`Fetching invoices for ${entityType}: ${entityId}`);
        
        const response = await fetch(`/api/${entityType}s/${entityId}/invoices`);
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Invoices API response:', data);
        
        if (data.success) {
          if (data.invoices && Array.isArray(data.invoices)) {
            setInvoices(data.invoices);
          } else {
            setInvoices([]);
            console.warn('No invoices found in response');
          }
        } else {
          throw new Error(data.error || 'Error desconocido al cargar facturas');
        }
      } catch (error) {
        console.error(`Error loading invoices for ${entityType}:`, error);
        setError(error instanceof Error ? error.message : 'Error desconocido');
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (entityId && entityId !== 'undefined') {
      fetchInvoices();
    } else {
      setLoading(false);
      setError('ID de entidad inválido');
    }
  }, [entityId, entityType]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processed':
        return <Badge className="bg-green-100 text-green-800">Procesado</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const processedCount = invoices.filter(invoice => invoice.status === 'processed').length;

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    // El useEffect se reejecutará al cambiar loading
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error al cargar facturas</h3>
            <p className="text-muted-foreground text-center mb-4">{error}</p>
            <Button onClick={handleRetry} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total Documentos</p>
                <p className="text-2xl font-bold">{invoices.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Importe Total</p>
                <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Procesados</p>
                <p className="text-2xl font-bold">{processedCount}/{invoices.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Documentos - {entityName}</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Sin documentos</h3>
              <p className="text-gray-600">No hay documentos asociados a esta entidad</p>
            </div>
          ) : (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-100 rounded-md">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">
                        {invoice.documentType.charAt(0).toUpperCase() + invoice.documentType.slice(1)} - {invoice.number}
                      </h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(invoice.date)}
                        </span>
                        <span className="flex items-center">
                          <DollarSign className="h-3 w-3 mr-1" />
                          {formatCurrency(invoice.amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(invoice.status)}
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/documents/${invoice.id}`}>
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Ver Documento
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
              
              {invoices.length > 5 && (
                <div className="text-center pt-4">
                  <Button variant="outline">
                    Ver todos los documentos
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default InvoiceHistory;