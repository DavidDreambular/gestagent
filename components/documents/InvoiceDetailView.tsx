"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Building, 
  User, 
  Calendar, 
  CreditCard, 
  Receipt, 
  MapPin, 
  Phone, 
  Mail,
  Hash,
  DollarSign,
  FileText,
  Clock,
  Banknote
} from 'lucide-react';

interface InvoiceDetailViewProps {
  invoiceData: any;
  className?: string;
}

export default function InvoiceDetailView({ invoiceData, className = '' }: InvoiceDetailViewProps) {
  // Extraer datos de la nueva estructura completa de Mistral
  const document_info = invoiceData.document_info || {};
  const emitter = invoiceData.emitter || {};
  const receiver = invoiceData.receiver || {};
  const line_items = invoiceData.line_items || [];
  const totals = invoiceData.totals || {};
  const payment = invoiceData.payment || {};
  const notes = invoiceData.notes || '';
  const metadata = invoiceData.metadata || {};

  const formatCurrency = (amount: number | undefined | null): string => {
    if (!amount && amount !== 0) return '-';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatPercentage = (rate: number | undefined): string => {
    if (!rate && rate !== 0) return '-';
    return `${rate}%`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Información del Documento */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <CardTitle>Información del Documento</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Hash className="h-4 w-4" />
                <span>Número</span>
              </div>
              <p className="font-semibold">{document_info.number || '-'}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Fecha Emisión</span>
              </div>
              <p className="font-semibold">{formatDate(document_info.date)}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Fecha Vencimiento</span>
              </div>
              <p className="font-semibold">{formatDate(document_info.due_date)}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Receipt className="h-4 w-4" />
                <span>Serie</span>
              </div>
              <p className="font-semibold">{document_info.series || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emisor y Receptor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Datos del Emisor */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-green-600" />
              <CardTitle>Datos del Emisor</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="font-semibold text-lg">{emitter.name || '-'}</p>
              <div className="flex items-center gap-2 text-sm">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">CIF/NIF:</span>
                <span className="font-medium">{emitter.tax_id || '-'}</span>
              </div>
            </div>
            
            {(emitter.address || emitter.postal_code || emitter.city || emitter.province) && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>Dirección</span>
                </div>
                <div className="text-sm space-y-1">
                  {emitter.address && <p>{emitter.address}</p>}
                  <p>
                    {emitter.postal_code && `${emitter.postal_code} `}
                    {emitter.city}
                    {emitter.province && `, ${emitter.province}`}
                  </p>
                  {emitter.country && <p>{emitter.country}</p>}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 gap-3">
              {emitter.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{emitter.phone}</span>
                </div>
              )}
              {emitter.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{emitter.email}</span>
                </div>
              )}
              {emitter.website && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Web:</span>
                  <span>{emitter.website}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Datos del Receptor */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-purple-600" />
              <CardTitle>Datos del Receptor</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="font-semibold text-lg">{receiver.name || '-'}</p>
              <div className="flex items-center gap-2 text-sm">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">CIF/NIF:</span>
                <span className="font-medium">{receiver.tax_id || '-'}</span>
              </div>
            </div>
            
            {(receiver.address || receiver.postal_code || receiver.city || receiver.province) && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>Dirección</span>
                </div>
                <div className="text-sm space-y-1">
                  {receiver.address && <p>{receiver.address}</p>}
                  <p>
                    {receiver.postal_code && `${receiver.postal_code} `}
                    {receiver.city}
                    {receiver.province && `, ${receiver.province}`}
                  </p>
                  {receiver.country && <p>{receiver.country}</p>}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 gap-3">
              {receiver.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{receiver.phone}</span>
                </div>
              )}
              {receiver.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{receiver.email}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Líneas de Detalle */}
      {line_items.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-orange-600" />
              <CardTitle>Conceptos</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Descripción</th>
                    <th className="text-center p-3 font-medium">Cant.</th>
                    <th className="text-center p-3 font-medium">Unidad</th>
                    <th className="text-right p-3 font-medium">P. Unitario</th>
                    <th className="text-right p-3 font-medium">Descuento</th>
                    <th className="text-right p-3 font-medium">Neto</th>
                    <th className="text-center p-3 font-medium">IVA %</th>
                    <th className="text-right p-3 font-medium">IVA €</th>
                    <th className="text-right p-3 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {line_items.map((item: any, index: number) => (
                    <tr key={index} className="border-b">
                      <td className="p-3">
                        <div className="font-medium">{item.description}</div>
                        {item.id && (
                          <div className="text-xs text-muted-foreground">ID: {item.id}</div>
                        )}
                      </td>
                      <td className="text-center p-3">{item.quantity || '-'}</td>
                      <td className="text-center p-3 text-muted-foreground">{item.unit || '-'}</td>
                      <td className="text-right p-3 font-mono">{formatCurrency(item.unit_price)}</td>
                      <td className="text-right p-3">
                        {item.discount_percent ? (
                          <div>
                            <div className="font-mono">{formatPercentage(item.discount_percent)}</div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {formatCurrency(item.discount_amount)}
                            </div>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="text-right p-3 font-mono">{formatCurrency(item.net_amount)}</td>
                      <td className="text-center p-3">{formatPercentage(item.tax_rate)}</td>
                      <td className="text-right p-3 font-mono">{formatCurrency(item.tax_amount)}</td>
                      <td className="text-right p-3 font-mono font-semibold">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Totales */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            <CardTitle>Totales</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Subtotal</p>
                <p className="text-xl font-semibold">{formatCurrency(totals.subtotal)}</p>
              </div>
              {totals.total_discount > 0 && (
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Descuentos</p>
                  <p className="text-xl font-semibold text-red-600">
                    -{formatCurrency(totals.total_discount)}
                  </p>
                </div>
              )}
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-muted-foreground">IVA Total</p>
                <p className="text-xl font-semibold text-blue-600">{formatCurrency(totals.tax_total)}</p>
              </div>
            </div>

            {/* Desglose de IVA */}
            {totals.tax_details && totals.tax_details.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium text-sm">Desglose de IVA:</p>
                <div className="grid gap-2">
                  {totals.tax_details.map((tax: any, index: number) => (
                    <div key={index} className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded">
                      <span className="text-sm">IVA {formatPercentage(tax.rate)}</span>
                      <div className="text-right font-mono">
                        <div className="text-sm">{formatCurrency(tax.base)} → {formatCurrency(tax.amount)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />
            
            <div className="text-center p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-emerald-200">
              <p className="text-lg text-muted-foreground mb-2">Total a Pagar</p>
              <p className="text-3xl font-bold text-emerald-700">{formatCurrency(totals.total)}</p>
              {totals.currency && totals.currency !== 'EUR' && (
                <p className="text-sm text-muted-foreground mt-1">({totals.currency})</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información de Pago */}
      {(payment.method || payment.bank_account || payment.terms) && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-indigo-600" />
              <CardTitle>Información de Pago</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {payment.method && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Forma de Pago</p>
                  <p className="font-semibold">{payment.method}</p>
                </div>
              )}
              {payment.terms && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Condiciones</p>
                  <p className="font-semibold">{payment.terms}</p>
                </div>
              )}
              {payment.bank_account && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Cuenta Bancaria</p>
                  </div>
                  <p className="font-mono text-sm bg-muted/50 p-2 rounded">{payment.bank_account}</p>
                  {payment.swift && (
                    <p className="text-xs text-muted-foreground">SWIFT: {payment.swift}</p>
                  )}
                </div>
              )}
              {payment.bank_name && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Banco</p>
                  <p className="font-semibold">{payment.bank_name}</p>
                </div>
              )}
              {payment.payment_reference && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Referencia de Pago</p>
                  <p className="font-mono text-sm">{payment.payment_reference}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Observaciones */}
      {notes && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-600" />
              <CardTitle>Observaciones</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Metadatos de Extracción */}
      {metadata && Object.keys(metadata).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Información de Procesamiento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              {metadata.confidence_score && (
                <div>
                  <p className="text-muted-foreground">Confianza</p>
                  <Badge variant={metadata.confidence_score > 0.9 ? 'default' : 'secondary'}>
                    {(metadata.confidence_score * 100).toFixed(1)}%
                  </Badge>
                </div>
              )}
              {metadata.language && (
                <div>
                  <p className="text-muted-foreground">Idioma</p>
                  <p className="font-medium uppercase">{metadata.language}</p>
                </div>
              )}
              {metadata.extracted_fields && (
                <div>
                  <p className="text-muted-foreground">Campos</p>
                  <p className="font-medium">{metadata.extracted_fields}</p>
                </div>
              )}
              {metadata.processing_method && (
                <div>
                  <p className="text-muted-foreground">Método</p>
                  <p className="font-medium">{metadata.processing_method}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 