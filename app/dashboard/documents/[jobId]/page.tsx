'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, FileText, Calendar, User, Building, DollarSign, Clock, CheckCircle, AlertCircle, Loader2, ExternalLink, AlertTriangle, ChevronLeft, ChevronRight, Grid, List, Search, Filter, Edit3, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EditableField, NestedEditableField, ItemEditableField } from '@/components/documents/EditableField';
import Link from 'next/link';

interface DocumentData {
  jobId: string;
  documentType: string;
  status: string;
  uploadTimestamp: string;
  processingMetadata: {
    mistral_processing_time_ms?: number;
    confidence?: number;
    method?: string;
    total_time_ms?: number;
  };
  documentUrl?: string;
  extractedData: any;
  rawResponse?: string;
}

interface IndividualInvoice {
  index: number;
  invoice_number: string;
  supplier: any;
  customer: any;
  issue_date: string;
  due_date?: string;
  items: any[];
  totals: any;
  tax_breakdown: any[];
  payment_method?: string;
  notes?: string;
}

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [invoices, setInvoices] = useState<IndividualInvoice[]>([]);
  const [isEditMode, setIsEditMode] = useState(true); // Edición habilitada por defecto


  // Cargar datos del documento
  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/documents/data/${jobId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Documento no encontrado');
        }
        
        const data = await response.json();
        setDocumentData(data);

        // Procesar múltiples facturas
        const processedInvoices = processMultipleInvoices(data.extractedData);
        setInvoices(processedInvoices);
        
      } catch (err) {
        console.error('❌ [Frontend] Error loading document:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar el documento');
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      fetchDocument();
    }
  }, [jobId]);

  // Función para procesar múltiples facturas
  const processMultipleInvoices = (extractedData: any): IndividualInvoice[] => {
    if (Array.isArray(extractedData)) {
      // Si ya es un array de facturas
      return extractedData.map((invoice, index) => ({
        index,
        invoice_number: invoice.invoice_number || `Factura ${index + 1}`,
        supplier: invoice.supplier || {},
        customer: invoice.customer || {},
        issue_date: invoice.issue_date || '',
        due_date: invoice.due_date,
        items: invoice.items || [],
        totals: invoice.totals || {},
        tax_breakdown: invoice.tax_breakdown || [],
        payment_method: invoice.payment_method,
        notes: invoice.notes
      }));
    }

    // Si hay datos de fallback con múltiples facturas detectadas
    if (extractedData.detected_invoices && extractedData.detected_invoices.length > 1) {
      return extractedData.detected_invoices.map((invoiceNum: string, index: number) => ({
        index,
        invoice_number: invoiceNum,
        supplier: { name: extractedData.detected_suppliers?.[index] || 'No detectado' },
        customer: {},
        issue_date: extractedData.detected_dates?.[index] || '',
        items: [],
        totals: { 
          total: extractedData.detected_totals?.[index] || 0,
          total_tax_amount: extractedData.detected_tax_info?.filter((t: any) => t.type === 'amount')?.[index]?.value || 0
        },
        tax_breakdown: []
      }));
    }

    // Si es una sola factura
    return [{
      index: 0,
      invoice_number: extractedData.invoice_number || 'Factura única',
      supplier: extractedData.supplier || {},
      customer: extractedData.customer || {},
      issue_date: extractedData.issue_date || '',
      due_date: extractedData.due_date,
      items: extractedData.items || [],
      totals: extractedData.totals || {},
      tax_breakdown: extractedData.tax_breakdown || [],
      payment_method: extractedData.payment_method,
      notes: extractedData.notes
    }];
  };

  // Filtrar facturas según búsqueda
  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.customer.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Función para formatear moneda
  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(num || 0);
  };

  // Función para formatear fechas
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  // Función para refrescar datos
  const refreshData = async () => {
    const response = await fetch(`/api/documents/data/${jobId}`);
    if (response.ok) {
      const data = await response.json();
      setDocumentData(data);
      const processedInvoices = processMultipleInvoices(data.extractedData);
      setInvoices(processedInvoices);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Cargando documento...</p>
        </div>
      </div>
    );
  }

  if (error || !documentData) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Documento no encontrado'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const currentInvoice = invoices[selectedInvoice];

  return (
    <div className="space-y-6">
      {/* Barra de herramientas estilo Office */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Link>
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div>
              <h1 className="text-xl font-bold">
                {currentInvoice?.supplier?.name || 'Documento de Facturas'}
              </h1>
              <p className="text-sm text-gray-600">
                Factura: {currentInvoice?.invoice_number || 'N/A'} | Job ID: {documentData.jobId}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="px-3 py-1">
              <Edit3 className="h-3 w-3 mr-1" />
              Edición directa habilitada
            </Badge>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
            {documentData.documentUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={documentData.documentUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  PDF Original
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Información de edición directa */}
        <Alert className="mb-4">
          <Edit3 className="h-4 w-4" />
          <AlertDescription>
            <strong>Edición directa:</strong> Haz clic en cualquier campo para editarlo. Los cambios se guardan automáticamente.
          </AlertDescription>
        </Alert>

        {/* Controles de navegación y búsqueda */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por número, proveedor o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            
            <Select value={viewMode} onValueChange={(value) => setViewMode(value as 'grid' | 'list')}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">
                  <div className="flex items-center">
                    <Grid className="h-4 w-4 mr-2" />
                    Tarjetas
                  </div>
                </SelectItem>
                <SelectItem value="list">
                  <div className="flex items-center">
                    <List className="h-4 w-4 mr-2" />
                    Lista
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-gray-600">
            {filteredInvoices.length} de {invoices.length} facturas
          </div>
        </div>
      </div>

      {/* Vista principal */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Panel izquierdo - Lista de facturas */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Facturas Detectadas</CardTitle>
              <CardDescription>
                {invoices.length} factura{invoices.length !== 1 ? 's' : ''} en este documento
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <div className="space-y-2 p-4">
                  {filteredInvoices.map((invoice, index) => (
                    <div
                      key={invoice.index}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedInvoice === invoice.index
                          ? 'bg-blue-50 border-blue-200'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedInvoice(invoice.index)}
                    >
                      <div className="font-medium text-sm truncate">
                        {invoice.invoice_number}
                      </div>
                      <div className="text-xs text-gray-600 truncate">
                        {invoice.supplier.name || 'Proveedor no detectado'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(invoice.issue_date)}
                      </div>
                      {invoice.totals.total && (
                        <div className="text-xs font-semibold text-green-600">
                          {formatCurrency(invoice.totals.total)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Panel derecho - Detalles de la factura seleccionada */}
        <div className="lg:col-span-3">
          {currentInvoice ? (
            <div className="space-y-6">
              {/* Encabezado de la factura */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">
                        Factura: {currentInvoice.invoice_number}
                      </CardTitle>
                      <CardDescription>
                        Factura {selectedInvoice + 1} de {invoices.length}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedInvoice(Math.max(0, selectedInvoice - 1))}
                        disabled={selectedInvoice === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedInvoice(Math.min(invoices.length - 1, selectedInvoice + 1))}
                        disabled={selectedInvoice === invoices.length - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <EditableField
                      label="Número de Factura"
                      value={currentInvoice.invoice_number}
                      field="invoice_number"
                      jobId={jobId}
                      invoiceIndex={selectedInvoice}
                      readOnly={!isEditMode}
                      onUpdate={refreshData}
                    />
                    <EditableField
                      label="Fecha de emisión"
                      value={currentInvoice.issue_date}
                      field="issue_date"
                      type="date"
                      jobId={jobId}
                      invoiceIndex={selectedInvoice}
                      readOnly={!isEditMode}
                      onUpdate={refreshData}
                    />
                    <EditableField
                      label="Fecha de vencimiento"
                      value={currentInvoice.due_date}
                      field="due_date"
                      type="date"
                      jobId={jobId}
                      invoiceIndex={selectedInvoice}
                      readOnly={!isEditMode}
                      onUpdate={refreshData}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Información de proveedor y cliente */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Proveedor */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Building className="h-5 w-5" />
                      <span>Proveedor / Emisor</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <NestedEditableField
                      label="Nombre del Proveedor"
                      data={currentInvoice}
                      nestedField="supplier.name"
                      field="supplier.name"
                      jobId={jobId}
                      invoiceIndex={selectedInvoice}
                      placeholder="Nombre de la empresa"
                      readOnly={!isEditMode}
                      onUpdate={refreshData}
                    />
                    
                    <NestedEditableField
                      label="NIF/CIF"
                      data={currentInvoice}
                      nestedField="supplier.nif_cif"
                      field="supplier.nif_cif"
                      jobId={jobId}
                      invoiceIndex={selectedInvoice}
                      placeholder="12345678A"
                      readOnly={!isEditMode}
                      onUpdate={refreshData}
                    />
                    
                    <NestedEditableField
                      label="Dirección"
                      data={currentInvoice}
                      nestedField="supplier.address"
                      field="supplier.address"
                      jobId={jobId}
                      invoiceIndex={selectedInvoice}
                      type="textarea"
                      placeholder="Dirección completa del proveedor"
                      readOnly={!isEditMode}
                      onUpdate={refreshData}
                    />
                  </CardContent>
                </Card>

                {/* Cliente */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="h-5 w-5" />
                      <span>Cliente / Receptor</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <NestedEditableField
                      label="Nombre del Cliente"
                      data={currentInvoice}
                      nestedField="customer.name"
                      field="customer.name"
                      jobId={jobId}
                      invoiceIndex={selectedInvoice}
                      placeholder="Nombre del cliente"
                      readOnly={!isEditMode}
                      onUpdate={refreshData}
                    />
                    
                    <NestedEditableField
                      label="NIF/CIF"
                      data={currentInvoice}
                      nestedField="customer.nif_cif"
                      field="customer.nif_cif"
                      jobId={jobId}
                      invoiceIndex={selectedInvoice}
                      placeholder="87654321B"
                      readOnly={!isEditMode}
                      onUpdate={refreshData}
                    />
                    
                    <NestedEditableField
                      label="Dirección"
                      data={currentInvoice}
                      nestedField="customer.address"
                      field="customer.address"
                      jobId={jobId}
                      invoiceIndex={selectedInvoice}
                      type="textarea"
                      placeholder="Dirección completa del cliente"
                      readOnly={!isEditMode}
                      onUpdate={refreshData}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Items de la factura editables */}
              {currentInvoice.items && currentInvoice.items.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Líneas de Facturación</CardTitle>
                    <CardDescription>
                      {isEditMode ? 'Haz clic en cualquier campo para editarlo' : 'Activa el modo edición para modificar'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {currentInvoice.items.map((item: any, index: number) => (
                        <div key={index} className="p-4 border rounded-lg bg-gray-50">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                              <EditableField
                                label="Descripción"
                                value={item.description}
                                field={`items.${index}.description`}
                                jobId={jobId}
                                invoiceIndex={selectedInvoice}
                                readOnly={!isEditMode}
                                onUpdate={refreshData}
                              />
                            </div>
                            <EditableField
                              label="Cantidad"
                              value={item.quantity}
                              field={`items.${index}.quantity`}
                              type="number"
                              jobId={jobId}
                              invoiceIndex={selectedInvoice}
                              readOnly={!isEditMode}
                              onUpdate={refreshData}
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                            <EditableField
                              label="Precio Unitario"
                              value={item.unit_price}
                              field={`items.${index}.unit_price`}
                              type="number"
                              jobId={jobId}
                              invoiceIndex={selectedInvoice}
                              readOnly={!isEditMode}
                              onUpdate={refreshData}
                            />
                            <EditableField
                              label="% IVA"
                              value={item.tax_rate}
                              field={`items.${index}.tax_rate`}
                              type="number"
                              jobId={jobId}
                              invoiceIndex={selectedInvoice}
                              readOnly={!isEditMode}
                              onUpdate={refreshData}
                            />
                            <EditableField
                              label="Subtotal"
                              value={item.subtotal}
                              field={`items.${index}.subtotal`}
                              type="number"
                              jobId={jobId}
                              invoiceIndex={selectedInvoice}
                              readOnly={!isEditMode}
                              onUpdate={refreshData}
                            />
                            <EditableField
                              label="Total"
                              value={item.total}
                              field={`items.${index}.total`}
                              type="number"
                              jobId={jobId}
                              invoiceIndex={selectedInvoice}
                              readOnly={!isEditMode}
                              onUpdate={refreshData}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Resumen de totales editables */}
              <Card>
                <CardHeader>
                  <CardTitle>Resumen de Totales</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <NestedEditableField
                      label="Subtotal (sin IVA)"
                      data={currentInvoice}
                      nestedField="totals.subtotal"
                      field="totals.subtotal"
                      type="number"
                      jobId={jobId}
                      invoiceIndex={selectedInvoice}
                      readOnly={!isEditMode}
                      onUpdate={refreshData}
                    />
                    <NestedEditableField
                      label="Total IVA"
                      data={currentInvoice}
                      nestedField="totals.total_tax_amount"
                      field="totals.total_tax_amount"
                      type="number"
                      jobId={jobId}
                      invoiceIndex={selectedInvoice}
                      readOnly={!isEditMode}
                      onUpdate={refreshData}
                    />
                    <NestedEditableField
                      label="Total Factura"
                      data={currentInvoice}
                      nestedField="totals.total"
                      field="totals.total"
                      type="number"
                      jobId={jobId}
                      invoiceIndex={selectedInvoice}
                      readOnly={!isEditMode}
                      onUpdate={refreshData}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Método de pago y notas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Información de Pago</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EditableField
                      label="Método de Pago"
                      value={currentInvoice.payment_method}
                      field="payment_method"
                      jobId={jobId}
                      invoiceIndex={selectedInvoice}
                      placeholder="Transferencia, Efectivo, etc."
                      readOnly={!isEditMode}
                      onUpdate={refreshData}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Notas Adicionales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EditableField
                      label="Notas"
                      value={currentInvoice.notes}
                      field="notes"
                      type="textarea"
                      jobId={jobId}
                      invoiceIndex={selectedInvoice}
                      placeholder="Información adicional sobre la factura"
                      readOnly={!isEditMode}
                      onUpdate={refreshData}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Selecciona una factura para ver sus detalles</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 