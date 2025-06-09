import { useSession } from 'next-auth/react'
import { hasPermission, hasAnyPermission, hasAllPermissions, canAccessRoute, getRolePermissions } from '@/lib/auth/roles'
import type { UserRole, Permission } from '@/lib/auth/roles'

export function usePermissions() {
  const { data: session } = useSession()
  const userRole = session?.user?.role as UserRole

  return {
    // Verificar un permiso específico
    hasPermission: (permission: Permission): boolean => {
      if (!userRole) return false
      return hasPermission(userRole, permission)
    },

    // Verificar si tiene alguno de los permisos
    hasAnyPermission: (permissions: Permission[]): boolean => {
      if (!userRole) return false
      return hasAnyPermission(userRole, permissions)
    },

    // Verificar si tiene todos los permisos
    hasAllPermissions: (permissions: Permission[]): boolean => {
      if (!userRole) return false
      return hasAllPermissions(userRole, permissions)
    },

    // Verificar acceso a una ruta
    canAccessRoute: (route: string): boolean => {
      if (!userRole) return false
      return canAccessRoute(userRole, route)
    },

    // Obtener todos los permisos del usuario
    getUserPermissions: (): Permission[] => {
      if (!userRole) return []
      return getRolePermissions(userRole)
    },

    // Información del usuario
    userRole,
    isAuthenticated: !!session,
    user: session?.user
  }
}

// Hook específico para verificar un permiso
export function useHasPermission(permission: Permission): boolean {
  const { hasPermission } = usePermissions()
  return hasPermission(permission)
}

// Hook para verificar múltiples permisos
export function useHasAnyPermission(permissions: Permission[]): boolean {
  const { hasAnyPermission } = usePermissions()
  return hasAnyPermission(permissions)
}

// Hook para verificar acceso a ruta
export function useCanAccessRoute(route: string): boolean {
  const { canAccessRoute } = usePermissions()
  return canAccessRoute(route)
} 