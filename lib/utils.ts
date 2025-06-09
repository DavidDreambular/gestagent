import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Traduce los roles de usuario al español
 */
export function translateRole(role: string): string {
  const roleTranslations: Record<string, string> = {
    admin: "Administrador",
    manager: "Gestor", 
    accountant: "Contable",
    operator: "Operador",
    supervisor: "Supervisor",
    user: "Usuario"
  };
  
  return roleTranslations[role] || role;
}
