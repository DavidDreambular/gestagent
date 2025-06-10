// Página de gestión de Proveedores
// /app/dashboard/suppliers/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Building2, 
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
  Users,
  Activity,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface Supplier {
  supplier_id: string;
  name: string;
  commercial_name?: string;
  nif_cif: string;
  address?: string;
  city?: string;
  province?: string;
  phone?: string;
  email?: string;
  website?: string;
  business_sector?: string;
  company_size?: string;
  status: string;
  total_invoices: number;
  total_amount: number;
  last_invoice_date?: string;
  activity_status: string;
  volume_category: string;
  created_at: string;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [sortBy, setSortBy] = useState('total_amount');
  const [sortOrder, setSortOrder] = useState('desc');
  const [totalActive, setTotalActive] = useState(0);
  const [availableSectors, setAvailableSectors] = useState<string[]>([]);

  const fetchSuppliers = async () => {
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        status: statusFilter,
        sortBy,
        sortOrder
      });

      if (sectorFilter && sectorFilter !== 'all') params.append('sector', sectorFilter);

      const response = await fetch(`/api/suppliers?${params}`);
      const data = await response.json();

      if (data.success) {
        setSuppliers(data.data.suppliers);
        setTotalActive(data.data.metadata.total_active);
        setAvailableSectors(data.data.metadata.available_sectors);
      } else {
        console.error('Error fetching suppliers:', data.error);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [searchTerm, statusFilter, sectorFilter, sortBy, sortOrder]);

  const handleDeleteSupplier = async (supplierId: string, supplierName: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar al proveedor "${supplierName}"?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/suppliers/${supplierId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message);
        fetchSuppliers(); // Recargar lista
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting supplier:', error);
      alert('Error de conexión al eliminar el proveedor');
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
    const variants = {
      alto: 'default',
      medio: 'secondary',
      bajo: 'outline'
    } as const;

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
          <p className="mt-4 text-gray-600">Cargando proveedores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proveedores</h1>
          <p className="text-muted-foreground">
            Gestión integral de proveedores y sus documentos financieros
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Proveedor
        </Button>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Proveedores</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers.length}</div>
            <p className="text-xs text-muted-foreground">
              {totalActive} activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sectores</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableSectors.length}</div>
            <p className="text-xs text-muted-foreground">
              diferentes sectores
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
              {formatCurrency(suppliers.reduce((sum, s) => sum + s.total_amount, 0))}
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
              {suppliers.filter(s => s.activity_status === 'reciente').length}
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
              <label className="text-sm font-medium">Sector</label>
              <Select value={sectorFilter} onValueChange={setSectorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los sectores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {availableSectors.filter(sector => sector && sector.trim()).map((sector) => (
                    <SelectItem key={sector} value={sector}>
                      {sector}
                    </SelectItem>
                  ))}
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

      {/* Lista de proveedores */}
      <div className="grid gap-4">
        {suppliers.map((supplier) => (
          <Card key={supplier.supplier_id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  {/* Header del proveedor */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold hover:text-blue-600 transition-colors">
                          <Link href={`/dashboard/suppliers/${supplier.supplier_id}`}>
                            {supplier.name}
                          </Link>
                        </h3>
                        {getStatusBadge(supplier.status)}
                        {getActivityBadge(supplier.activity_status)}
                        {getVolumeBadge(supplier.volume_category)}
                      </div>
                      {supplier.commercial_name && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {supplier.commercial_name}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        <strong>NIF/CIF:</strong> {supplier.nif_cif}
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
                        <Link href={`/dashboard/suppliers/${supplier.supplier_id}`}>
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
                        onClick={() => handleDeleteSupplier(supplier.supplier_id, supplier.name)}
                        className="flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        Eliminar
                      </Button>
                    </div>
                  </div>

                  {/* Información de contacto */}
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                    {supplier.address && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{supplier.city}, {supplier.province}</span>
                      </div>
                    )}
                    
                    {supplier.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{supplier.phone}</span>
                      </div>
                    )}
                    
                    {supplier.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span>{supplier.email}</span>
                      </div>
                    )}
                    
                    {supplier.website && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Globe className="h-3 w-3" />
                        <a 
                          href={supplier.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:text-blue-600 transition-colors"
                        >
                          {supplier.website}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Estadísticas del proveedor */}
                  <div className="grid gap-4 md:grid-cols-4 pt-2 border-t">
                    <div className="text-center">
                      <div className="text-sm font-medium text-muted-foreground">Facturas</div>
                      <div className="text-lg font-semibold">{supplier.total_invoices}</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-sm font-medium text-muted-foreground">Facturación</div>
                      <div className="text-lg font-semibold">{formatCurrency(supplier.total_amount)}</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-sm font-medium text-muted-foreground">Sector</div>
                      <div className="text-sm">{supplier.business_sector || 'No especificado'}</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-sm font-medium text-muted-foreground">Última Factura</div>
                      <div className="text-sm">{formatDate(supplier.last_invoice_date)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Estado vacío */}
      {suppliers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No se encontraron proveedores</h3>
            <p className="text-muted-foreground text-center mb-4">
              No hay proveedores que coincidan con los filtros seleccionados.
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Añadir primer proveedor
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 