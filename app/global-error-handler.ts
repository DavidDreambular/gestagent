// Global error handler para Next.js
// Maneja errores no capturados en el cliente

export function initializeGlobalErrorHandler() {
  if (typeof window === 'undefined') {
    return; // Solo ejecutar en el cliente
  }

  // Manejar errores de JavaScript no capturados
  window.addEventListener('error', (event) => {
    console.warn('⚠️ [Global Error Handler] Error no capturado:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });

    // Filtrar errores conocidos que no son críticos
    const knownNonCriticalErrors = [
      'share-modal.js',
      'addEventListener',
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured'
    ];

    const isNonCritical = knownNonCriticalErrors.some(pattern => 
      event.message?.includes(pattern) || 
      event.filename?.includes(pattern)
    );

    if (isNonCritical) {
      console.log('ℹ️ [Global Error Handler] Error no crítico ignorado');
      event.preventDefault();
      return;
    }

    // Para errores críticos, mostrar notificación al usuario
    if (event.message && !event.message.includes('Script error')) {
      // Solo mostrar errores con información útil
      console.error('🚨 [Global Error Handler] Error crítico detectado');
    }
  });

  // Manejar rechazos de promesas no capturados
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('⚠️ [Global Error Handler] Promise rechazada no capturada:', event.reason);

    // Filtrar promesas rechazadas conocidas
    const knownNonCriticalPromises = [
      'fetch',
      'Request failed',
      'Network error'
    ];

    const isNonCritical = knownNonCriticalPromises.some(pattern => 
      String(event.reason)?.includes(pattern)
    );

    if (isNonCritical) {
      console.log('ℹ️ [Global Error Handler] Promise rechazada no crítica ignorada');
      event.preventDefault();
      return;
    }
  });

  console.log('✅ [Global Error Handler] Inicializado correctamente');
}

// Auto-inicializar si se importa
if (typeof window !== 'undefined') {
  initializeGlobalErrorHandler();
}