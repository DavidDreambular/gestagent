// lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistance, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';

// Función para combinar clases de Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Función para formatear fechas
export function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
  } catch (error) {
    console.error('Error al formatear fecha:', error);
    return dateString;
  }
}

// Función para formatear fechas en formato relativo
export function formatRelativeTime(dateString: string): string {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return `Hoy, ${format(date, 'HH:mm')}`;
    }
    
    if (isYesterday(date)) {
      return `Ayer, ${format(date, 'HH:mm')}`;
    }
    
    return formatDistance(date, new Date(), {
      addSuffix: true,
      locale: es
    });
  } catch (error) {
    console.error('Error al formatear fecha relativa:', error);
    return dateString;
  }
}

// Función para formatear moneda
export function formatCurrency(value: number): string {
  if (value === undefined || value === null) return 'N/A';
  
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  } catch (error) {
    console.error('Error al formatear moneda:', error);
    return value.toString();
  }
}

// Función para capitalizar texto
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Función para traducir roles
export function translateRole(role: string): string {
  const roleMap: Record<string, string> = {
    admin: 'Administrador',
    contable: 'Contable',
    gestor: 'Gestor de Cuentas',
    operador: 'Operador',
    supervisor: 'Supervisor',
  };
  return roleMap[role] || role;
}

// Función para truncar texto
export function truncate(text: string, length: number): string {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}