// Página de gestión de Clientes
// /app/dashboard/customers/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users2, 
  Search, 
  Filter, 
  Plus,
  MapPin,
  Phone,
  Mail,
  Globe,
  FileText,
  Edit,
  Trash2,
  Eye,
  Download,
  TrendingUp,
  Activity,
  AlertCircle,
  Building
} from 'lucide-react';
import Link from 'next/link';

interface Customer {
  customer_id: string;
  name: string;
  commercial_name?: string;
  nif_cif: string;
  address?: string;
  city?: string;
  province?: string;
  phone?: string;
  email?: string;
  website?: string;
  customer_type: string;
  status: string;
  total_invoices: number;
  total_amount: number;
  last_invoice_date?: string;
  activity_status: string;
  volume_category: string;
  created_at: string;
}

interface CustomersList {
  customers: Customer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  metadata: {
    total_active: number;
    available_customer_types: string[];
  };
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('total_amount');
  const [sortOrder, setSortOrder] = useState('desc');
  const [totalActive, setTotalActive] = useState(0);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);

  const fetchCustomers = async () => {
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        status: statusFilter,
        sortBy,
        sortOrder
      });

      if (typeFilter && typeFilter !== 'all') params.append('customerType', typeFilter);

      const response = await fetch(`/api/customers?${params}`);
      const data = await response.json();

      if (data.success) {
        setCustomers(data.data.customers);
        setTotalActive(data.data.metadata.total_active);
        setAvailableTypes(data.data.metadata.available_types || []);
      } else {
        console.error('Error fetching customers:', data.error);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [searchTerm, statusFilter, typeFilter, sortBy, sortOrder]);

  const handleDeleteCustomer = async (customerId: string, customerName: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar al cliente "${customerName}"?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message);
        fetchCustomers(); // Recargar lista
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Error de conexión al eliminar el cliente');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      inactive: 'secondary',
      pending: 'outline'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status === 'active' ? 'Activo' : status === 'inactive' ? 'Inactivo' : 'Pendiente'}
      </Badge>
    );
  };

  const getActivityBadge = (activity: string) => {
    const variants = {
      reciente: 'default',
      activo: 'secondary',
      inactivo: 'destructive'
    } as const;

    return (
      <Badge variant={variants[activity as keyof typeof variants] || 'outline'} className="text-xs">
        {activity === 'reciente' ? 'Reciente' : activity === 'activo' ? 'Activo' : 'Inactivo'}
      </Badge>
    );
  };

  const getVolumeBadge = (volume: string) => {
    const colors = {
      alto: 'bg-green-100 text-green-800 border-green-200',
      medio: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      bajo: 'bg-gray-100 text-gray-800 border-gray-200'
    } as const;

    return (
      <Badge className={colors[volume as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        Vol. {volume}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const config = {
      company: { label: 'Empresa', color: 'bg-blue-100 text-blue-800' },
      individual: { label: 'Particular', color: 'bg-green-100 text-green-800' },
      freelancer: { label: 'Autónomo', color: 'bg-purple-100 text-purple-800' },
      public: { label: 'Público', color: 'bg-orange-100 text-orange-800' }
    } as const;

    const typeConfig = config[type as keyof typeof config] || { label: type, color: 'bg-gray-100 text-gray-800' };

    return (
      <Badge className={typeConfig.color}>
        {typeConfig.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Sin datos';
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gestión integral de clientes y sus documentos financieros
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
            <p className="text-xs text-muted-foreground">
              {totalActive} activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tipos de Cliente</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableTypes.length}</div>
            <p className="text-xs text-muted-foreground">
              diferentes tipos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturación Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(customers.reduce((sum, c) => sum + c.total_amount, 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              este año
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actividad Reciente</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customers.filter(c => c.activity_status === 'reciente').length}
            </div>
            <p className="text-xs text-muted-foreground">
              últimos 30 días
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros y Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nombre, NIF/CIF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="company">Empresas</SelectItem>
                  <SelectItem value="individual">Particulares</SelectItem>
                  <SelectItem value="freelancer">Autónomos</SelectItem>
                  <SelectItem value="public">Públicos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ordenar por</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total_amount">Facturación</SelectItem>
                  <SelectItem value="name">Nombre</SelectItem>
                  <SelectItem value="last_invoice_date">Última factura</SelectItem>
                  <SelectItem value="created_at">Fecha registro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de clientes */}
      <div className="grid gap-4">
        {customers.map((customer) => (
          <Card key={customer.customer_id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  {/* Header del cliente */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold hover:text-blue-600 transition-colors">
                          <Link href={`/dashboard/customers/${customer.customer_id}`}>
                            {customer.name}
                          </Link>
                        </h3>
                        {getStatusBadge(customer.status)}
                        {getActivityBadge(customer.activity_status)}
                        {getVolumeBadge(customer.volume_category)}
                        {getTypeBadge(customer.customer_type)}
                      </div>
                      {customer.commercial_name && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {customer.commercial_name}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        <strong>NIF/CIF:</strong> {customer.nif_cif}
                      </p>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="flex items-center gap-1"
                      >
                        <Link href={`/dashboard/customers/${customer.customer_id}`}>
                          <Eye className="h-3 w-3" />
                          Ver Ficha
                        </Link>
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Edit className="h-3 w-3" />
                        Editar
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" />
                        Exportar
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteCustomer(customer.customer_id, customer.name)}
                        className="flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        Eliminar
                      </Button>
                    </div>
                  </div>

                  {/* Información de contacto */}
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                    {customer.address && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{customer.city}, {customer.province}</span>
                      </div>
                    )}
                    
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                    
                    {customer.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span>{customer.email}</span>
                      </div>
                    )}
                    
                    {customer.website && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Globe className="h-3 w-3" />
                        <a 
                          href={customer.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:text-blue-600 transition-colors"
                        >
                          {customer.website}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Estadísticas del cliente */}
                  <div className="grid gap-4 md:grid-cols-4 pt-2 border-t">
                    <div className="text-center">
                      <div className="text-sm font-medium text-muted-foreground">Facturas</div>
                      <div className="text-lg font-semibold">{customer.total_invoices}</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-sm font-medium text-muted-foreground">Facturación</div>
                      <div className="text-lg font-semibold">{formatCurrency(customer.total_amount)}</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-sm font-medium text-muted-foreground">Tipo</div>
                      <div className="text-sm capitalize">{customer.customer_type}</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-sm font-medium text-muted-foreground">Última Factura</div>
                      <div className="text-sm">{formatDate(customer.last_invoice_date)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Estado vacío */}
      {customers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No se encontraron clientes</h3>
            <p className="text-muted-foreground text-center mb-4">
              No hay clientes que coincidan con los filtros seleccionados.
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Añadir primer cliente
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 