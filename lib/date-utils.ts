import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Formats a date string safely, handling invalid dates gracefully
 * @param dateString - The date string to format
 * @param formatPattern - The format pattern (default: "dd/MM/yyyy HH:mm:ss")
 * @param fallback - Fallback text for invalid dates (default: "Fecha inválida")
 * @returns Formatted date string or fallback text
 */
export const formatSafeDate = (
  dateString: string | null | undefined,
  formatPattern: string = "dd/MM/yyyy HH:mm:ss",
  fallback: string = "Fecha inválida"
): string => {
  if (!dateString) return 'Sin fecha';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return fallback;
    }
    return format(date, formatPattern, { locale: es });
  } catch (error) {
    return fallback;
  }
};

/**
 * Formats a date for display in lists (shorter format)
 * @param dateString - The date string to format
 * @returns Formatted date string or fallback text
 */
export const formatShortDate = (dateString: string | null | undefined): string => {
  return formatSafeDate(dateString, "dd/MM/yyyy");
};

/**
 * Formats a date with time for detailed views
 * @param dateString - The date string to format
 * @returns Formatted date string with time or fallback text
 */
export const formatDateTime = (dateString: string | null | undefined): string => {
  return formatSafeDate(dateString, "dd/MM/yyyy HH:mm:ss");
};

/**
 * Formats a date for relative display (e.g., "hace 2 horas")
 * @param dateString - The date string to format
 * @returns Relative time string or fallback text
 */
export const formatRelativeDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Sin fecha';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Fecha inválida';
    }
    
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInMinutes < 1) return 'Ahora mismo';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} minuto${diffInMinutes > 1 ? 's' : ''}`;
    if (diffInHours < 24) return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    if (diffInDays < 7) return `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
    
    // For older dates, show the actual date
    return formatShortDate(dateString);
  } catch (error) {
    return 'Fecha inválida';
  }
};

/**
 * Checks if a date string is valid
 * @param dateString - The date string to validate
 * @returns True if the date is valid, false otherwise
 */
export const isValidDate = (dateString: string | null | undefined): boolean => {
  if (!dateString) return false;
  
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  } catch (error) {
    return false;
  }
};