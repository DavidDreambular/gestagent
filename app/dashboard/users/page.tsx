'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  Shield,
  Mail,
  Phone,
  Calendar,
  UserCheck,
  UserX,
  Settings,
  Eye,
  MoreVertical
} from 'lucide-react';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'contable' | 'gestor' | 'operador' | 'supervisor';
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  last_login?: string;
  phone?: string;
  department?: string;
  permissions: string[];
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    // Simular carga de usuarios para gestoría
    const mockUsers: User[] = [
      {
        id: '1',
        username: 'admin.gestor',
        email: 'admin@gestoria.com',
        role: 'admin',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        last_login: '2024-01-10T09:30:00Z',
        phone: '+34 666 123 456',
        department: 'Administración',
        permissions: ['all']
      },
      {
        id: '2',
        username: 'maria.contable',
        email: 'maria@gestoria.com',
        role: 'contable',
        status: 'active',
        created_at: '2024-01-02T00:00:00Z',
        last_login: '2024-01-10T08:15:00Z',
        phone: '+34 666 234 567',
        department: 'Contabilidad',
        permissions: ['documents.read', 'documents.write', 'reports.read']
      },
      {
        id: '3',
        username: 'carlos.gestor',
        email: 'carlos@gestoria.com',
        role: 'gestor',
        status: 'active',
        created_at: '2024-01-03T00:00:00Z',
        last_login: '2024-01-09T16:20:00Z',
        phone: '+34 666 345 678',
        department: 'Gestión',
        permissions: ['clients.read', 'clients.write', 'suppliers.read', 'suppliers.write']
      },
      {
        id: '4',
        username: 'ana.operadora',
        email: 'ana@gestoria.com',
        role: 'operador',
        status: 'active',
        created_at: '2024-01-04T00:00:00Z',
        last_login: '2024-01-10T07:45:00Z',
        phone: '+34 666 456 789',
        department: 'Operaciones',
        permissions: ['documents.read', 'documents.upload']
      },
      {
        id: '5',
        username: 'luis.supervisor',
        email: 'luis@gestoria.com',
        role: 'supervisor',
        status: 'inactive',
        created_at: '2024-01-05T00:00:00Z',
        last_login: '2024-01-08T14:30:00Z',
        phone: '+34 666 567 890',
        department: 'Supervisión',
        permissions: ['reports.read', 'users.read', 'audit.read']
      },
      {
        id: '6',
        username: 'nuevo.usuario',
        email: 'nuevo@gestoria.com',
        role: 'operador',
        status: 'pending',
        created_at: '2024-01-10T00:00:00Z',
        department: 'Operaciones',
        permissions: []
      }
    ];

    setTimeout(() => {
      setUsers(mockUsers);
      setLoading(false);
    }, 1000);
  }, []);

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      admin: { variant: 'destructive' as const, label: 'Administrador' },
      contable: { variant: 'default' as const, label: 'Contable' },
      gestor: { variant: 'secondary' as const, label: 'Gestor' },
      operador: { variant: 'outline' as const, label: 'Operador' },
      supervisor: { variant: 'default' as const, label: 'Supervisor' }
    };
    
    const config = roleConfig[role as keyof typeof roleConfig] || { variant: 'outline' as const, label: role };
    
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'default' as const, label: 'Activo', color: 'text-green-600' },
      inactive: { variant: 'secondary' as const, label: 'Inactivo', color: 'text-gray-600' },
      pending: { variant: 'outline' as const, label: 'Pendiente', color: 'text-yellow-600' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { variant: 'outline' as const, label: status, color: 'text-gray-600' };
    
    return (
      <Badge variant={config.variant} className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const handleToggleStatus = (userId: string) => {
    setUsers(prev => 
      prev.map(user => 
        user.id === userId 
          ? { ...user, status: user.status === 'active' ? 'inactive' : 'active' as const }
          : user
      )
    );
  };

  const handleDeleteUser = (userId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      return;
    }
    
    setUsers(prev => prev.filter(user => user.id !== userId));
    alert('Usuario eliminado exitosamente');
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.department && user.department.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const userStats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    inactive: users.filter(u => u.status === 'inactive').length,
    pending: users.filter(u => u.status === 'pending').length
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8 text-purple-500" />
            Gestión de Usuarios
          </h1>
          <p className="text-muted-foreground">
            Administra usuarios, roles y permisos del sistema de gestoría
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configurar Roles
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Usuario
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Usuarios</p>
                <p className="text-2xl font-bold">{userStats.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Activos</p>
                <p className="text-2xl font-bold text-green-600">{userStats.active}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Inactivos</p>
                <p className="text-2xl font-bold text-gray-600">{userStats.inactive}</p>
              </div>
              <UserX className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">{userStats.pending}</p>
              </div>
              <Calendar className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y Búsqueda */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuarios por nombre, email o departamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">Todos los Roles</option>
                <option value="admin">Administrador</option>
                <option value="contable">Contable</option>
                <option value="gestor">Gestor</option>
                <option value="operador">Operador</option>
                <option value="supervisor">Supervisor</option>
              </select>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">Todos los Estados</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
                <option value="pending">Pendientes</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Usuarios */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios ({filteredUsers.length})</CardTitle>
          <CardDescription>
            {searchTerm || filterRole !== 'all' || filterStatus !== 'all' ? 
              `Mostrando ${filteredUsers.length} de ${users.length} usuarios` : 
              'Gestión completa de usuarios del sistema'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchTerm ? 'No se encontraron usuarios' : 'No hay usuarios'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 
                  'Intenta con otros términos de búsqueda.' : 
                  'Comienza creando el primer usuario.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <Card key={user.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <Users className="h-6 w-6 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{user.username}</h3>
                            {getRoleBadge(user.role)}
                            {getStatusBadge(user.status)}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div className="flex items-center gap-2">
                              <Mail className="h-3 w-3" />
                              <span>{user.email}</span>
                            </div>
                            {user.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3" />
                                <span>{user.phone}</span>
                              </div>
                            )}
                            {user.department && (
                              <div className="flex items-center gap-2">
                                <Shield className="h-3 w-3" />
                                <span>Departamento: {user.department}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              <span>Creado: {new Date(user.created_at).toLocaleDateString('es-ES')}</span>
                              {user.last_login && (
                                <span className="ml-4">
                                  Último acceso: {new Date(user.last_login).toLocaleDateString('es-ES')}
                                </span>
                              )}
                            </div>
                            <div className="text-xs">
                              <span className="font-medium">Permisos:</span> {user.permissions.length > 0 ? user.permissions.join(', ') : 'Sin permisos asignados'}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="gap-2">
                          <Eye className="h-4 w-4" />
                          <span className="hidden sm:inline">Ver</span>
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Edit className="h-4 w-4" />
                          <span className="hidden sm:inline">Editar</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className={`gap-2 ${user.status === 'active' ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                          onClick={() => handleToggleStatus(user.id)}
                        >
                          {user.status === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          <span className="hidden sm:inline">
                            {user.status === 'active' ? 'Desactivar' : 'Activar'}
                          </span>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" 
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="hidden sm:inline">Eliminar</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 