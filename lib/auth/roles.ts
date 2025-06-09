export type UserRole = 'admin' | 'contable' | 'gestor' | 'operador' | 'supervisor'

export type Permission = 
  | 'documents:read'
  | 'documents:create'
  | 'documents:update'
  | 'documents:delete'
  | 'documents:export'
  | 'documents:debug'
  | 'users:read'
  | 'users:create'
  | 'users:update'
  | 'users:delete'
  | 'config:read'
  | 'config:update'
  | 'config:apis'
  | 'config:backup'
  | 'config:advanced'
  | 'audit:read'
  | 'audit:export'
  | 'reports:read'
  | 'reports:export'
  | 'reports:advanced'
  | 'customers:read'
  | 'customers:create'
  | 'customers:update'
  | 'customers:delete'
  | 'suppliers:read'
  | 'suppliers:create'
  | 'suppliers:update'
  | 'suppliers:delete'

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'documents:read', 'documents:create', 'documents:update', 'documents:delete', 'documents:export', 'documents:debug',
    'users:read', 'users:create', 'users:update', 'users:delete',
    'config:read', 'config:update', 'config:apis', 'config:backup', 'config:advanced',
    'audit:read', 'audit:export',
    'reports:read', 'reports:export', 'reports:advanced',
    'customers:read', 'customers:create', 'customers:update', 'customers:delete',
    'suppliers:read', 'suppliers:create', 'suppliers:update', 'suppliers:delete'
  ],
  
  supervisor: [
    'documents:read', 'documents:create', 'documents:update', 'documents:export', 'documents:debug',
    'users:read',
    'config:read',
    'audit:read', 'audit:export',
    'reports:read', 'reports:export', 'reports:advanced',
    'customers:read', 'customers:create', 'customers:update',
    'suppliers:read', 'suppliers:create', 'suppliers:update'
  ],
  
  contable: [
    'documents:read', 'documents:create', 'documents:update', 'documents:export',
    'config:read',
    'reports:read', 'reports:export',
    'customers:read', 'customers:update',
    'suppliers:read', 'suppliers:update'
  ],
  
  gestor: [
    'documents:read', 'documents:create', 'documents:export',
    'customers:read', 'customers:create', 'customers:update',
    'suppliers:read', 'suppliers:create', 'suppliers:update',
    'reports:read'
  ],
  
  operador: [
    'documents:read', 'documents:create',
    'customers:read',
    'suppliers:read'
  ]
}

export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[userRole]?.includes(permission) ?? false
}

export function getRolePermissions(userRole: UserRole): Permission[] {
  return ROLE_PERMISSIONS[userRole] ?? []
}

export function hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission))
}

export function hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(userRole, permission))
}

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: 'Administrador - Acceso completo al sistema',
  supervisor: 'Supervisor - Gestion completa de documentos y reportes',
  contable: 'Contable - Enfoque en documentos financieros y reportes',
  gestor: 'Gestor de Cuentas - Gestion de clientes y documentos basicos',
  operador: 'Operador - Operaciones basicas de documentos'
}

export function canAccessRoute(userRole: UserRole, route: string): boolean {
  if (route.startsWith('/auth/') || route === '/') {
    return true
  }
  
  if (route === '/dashboard') {
    return true
  }
  
  if (route.startsWith('/dashboard/configuration')) {
    return hasPermission(userRole, 'config:read')
  }
  
  if (route.startsWith('/dashboard/users')) {
    return hasPermission(userRole, 'users:read')
  }
  
  if (route.startsWith('/dashboard/documents')) {
    return hasPermission(userRole, 'documents:read')
  }
  
  if (route.startsWith('/dashboard/reports')) {
    return hasPermission(userRole, 'reports:read')
  }
  
  if (route.startsWith('/dashboard/customers')) {
    return hasPermission(userRole, 'customers:read')
  }
  
  if (route.startsWith('/dashboard/suppliers')) {
    return hasPermission(userRole, 'suppliers:read')
  }
  
  return false
}
