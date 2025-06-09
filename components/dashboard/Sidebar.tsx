// components/dashboard/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  BarChart,
  Bell,
  LogOut,
  Plus,
  Building2,
  UserCheck,
  Shield,
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const isAdmin = user?.role === 'admin';

  const navItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'contable', 'gestor', 'operador', 'supervisor'],
    },
    {
      name: 'Documentos',
      href: '/dashboard/documents',
      icon: FileText,
      roles: ['admin', 'contable', 'gestor', 'operador', 'supervisor'],
    },
    {
      name: 'Nuevo Documento',
      href: '/dashboard/documents/new',
      icon: Plus,
      roles: ['admin', 'contable', 'gestor', 'operador'],
    },
    {
      name: 'Proveedores',
      href: '/dashboard/suppliers',
      icon: Building2,
      roles: ['admin', 'contable', 'gestor', 'supervisor'],
    },
    {
      name: 'Clientes',
      href: '/dashboard/customers',
      icon: UserCheck,
      roles: ['admin', 'contable', 'gestor', 'supervisor'],
    },
    {
      name: 'Reportes',
      href: '/dashboard/reports',
      icon: BarChart,
      roles: ['admin', 'contable', 'supervisor'],
    },
    {
      name: 'Usuarios',
      href: '/dashboard/users',
      icon: Users,
      roles: ['admin'],
    },
    {
      name: 'Auditoría',
      href: '/dashboard/audit',
      icon: Shield,
      roles: ['admin'],
    },
    {
      name: 'Notificaciones',
      href: '/dashboard/notifications',
      icon: Bell,
      roles: ['admin', 'contable', 'gestor', 'operador', 'supervisor'],
    },
    {
      name: 'Configuración',
      href: '/dashboard/configuration',
      icon: Settings,
      roles: ['admin'],
    },
  ];

  // Filtrar los elementos del menú según el rol del usuario
  const filteredNavItems = navItems.filter(
            (item) => !user?.role || item.roles.includes(user.role)
  );

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold">GESTAGENT</h1>
      </div>
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-4 py-2 rounded-md ${
                isActive
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={signOut}
          className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}