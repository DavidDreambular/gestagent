/**
 * Servicio de notificaciones para proveedores
 * Gestiona el envío de notificaciones por email y en el portal
 */

import { postgresqlClient } from '@/lib/postgresql-client';

export interface NotificationEvent {
  type: 'document_received' | 'document_validated' | 'document_error' | 'information_required';
  supplierId: string;
  documentId: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface NotificationTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
}

/**
 * Plantillas de email personalizables
 */
const EMAIL_TEMPLATES: Record<string, NotificationTemplate> = {
  document_received: {
    subject: 'Documento recibido correctamente - GestAgent',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Documento Recibido</h2>
        <p>Estimado/a proveedor,</p>
        <p>Hemos recibido correctamente su documento <strong>{{documentName}}</strong>.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Número de documento:</strong> {{documentNumber}}</p>
          <p><strong>Fecha de recepción:</strong> {{receivedDate}}</p>
          <p><strong>Estado:</strong> En procesamiento</p>
        </div>
        <p>El documento está siendo procesado y validado. Le notificaremos cuando esté completado.</p>
        <p>Puede consultar el estado en cualquier momento desde el portal de proveedores.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px;">
          Este es un mensaje automático de GestAgent. No responda a este email.
        </p>
      </div>
    `,
    textContent: `
Documento Recibido - GestAgent

Estimado/a proveedor,

Hemos recibido correctamente su documento {{documentName}}.

Número de documento: {{documentNumber}}
Fecha de recepción: {{receivedDate}}
Estado: En procesamiento

El documento está siendo procesado y validado. Le notificaremos cuando esté completado.

Puede consultar el estado en cualquier momento desde el portal de proveedores.

---
Este es un mensaje automático de GestAgent.
    `
  },
  
  document_validated: {
    subject: 'Documento validado correctamente - GestAgent',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Documento Validado</h2>
        <p>Estimado/a proveedor,</p>
        <p>Su documento <strong>{{documentName}}</strong> ha sido validado correctamente.</p>
        <div style="background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #16a34a;">
          <p><strong>Número de documento:</strong> {{documentNumber}}</p>
          <p><strong>Fecha de validación:</strong> {{validatedDate}}</p>
          <p><strong>Estado:</strong> ✅ Completado</p>
        </div>
        <p>El documento ha sido incorporado exitosamente a nuestro sistema contable.</p>
        <p>Gracias por utilizar nuestro portal de proveedores.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px;">
          Este es un mensaje automático de GestAgent. No responda a este email.
        </p>
      </div>
    `,
    textContent: `
Documento Validado - GestAgent

Estimado/a proveedor,

Su documento {{documentName}} ha sido validado correctamente.

Número de documento: {{documentNumber}}
Fecha de validación: {{validatedDate}}
Estado: ✅ Completado

El documento ha sido incorporado exitosamente a nuestro sistema contable.

Gracias por utilizar nuestro portal de proveedores.

---
Este es un mensaje automático de GestAgent.
    `
  },

  information_required: {
    subject: 'Información adicional requerida - GestAgent',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d97706;">Información Adicional Requerida</h2>
        <p>Estimado/a proveedor,</p>
        <p>Necesitamos información adicional para procesar su documento <strong>{{documentName}}</strong>.</p>
        <div style="background-color: #fffbeb; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #d97706;">
          <p><strong>Número de documento:</strong> {{documentNumber}}</p>
          <p><strong>Motivo:</strong> {{reason}}</p>
          <p><strong>Información requerida:</strong> {{details}}</p>
        </div>
        <p>Por favor, acceda al portal de proveedores para proporcionar la información solicitada.</p>
        <p>Una vez recibida la información, procederemos inmediatamente con la validación.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px;">
          Este es un mensaje automático de GestAgent. No responda a este email.
        </p>
      </div>
    `,
    textContent: `
Información Adicional Requerida - GestAgent

Estimado/a proveedor,

Necesitamos información adicional para procesar su documento {{documentName}}.

Número de documento: {{documentNumber}}
Motivo: {{reason}}
Información requerida: {{details}}

Por favor, acceda al portal de proveedores para proporcionar la información solicitada.

Una vez recibida la información, procederemos inmediatamente con la validación.

---
Este es un mensaje automático de GestAgent.
    `
  },

  document_error: {
    subject: 'Error en procesamiento de documento - GestAgent',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Error en Procesamiento</h2>
        <p>Estimado/a proveedor,</p>
        <p>Ha ocurrido un error al procesar su documento <strong>{{documentName}}</strong>.</p>
        <div style="background-color: #fef2f2; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <p><strong>Número de documento:</strong> {{documentNumber}}</p>
          <p><strong>Error:</strong> {{errorMessage}}</p>
          <p><strong>Fecha del error:</strong> {{errorDate}}</p>
        </div>
        <p>Nuestro equipo técnico ha sido notificado y está trabajando para resolver el problema.</p>
        <p>Puede intentar subir el documento nuevamente o contactar con soporte técnico.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px;">
          Este es un mensaje automático de GestAgent. No responda a este email.
        </p>
      </div>
    `,
    textContent: `
Error en Procesamiento - GestAgent

Estimado/a proveedor,

Ha ocurrido un error al procesar su documento {{documentName}}.

Número de documento: {{documentNumber}}
Error: {{errorMessage}}
Fecha del error: {{errorDate}}

Nuestro equipo técnico ha sido notificado y está trabajando para resolver el problema.

Puede intentar subir el documento nuevamente o contactar con soporte técnico.

---
Este es un mensaje automático de GestAgent.
    `
  }
};

/**
 * Reemplaza variables en plantillas de email
 */
function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, 'g'), value);
  });
  return result;
}

/**
 * Envía notificación por email (simulado - integrar con servicio real)
 */
async function sendEmail(to: string, subject: string, htmlContent: string, textContent: string): Promise<boolean> {
  try {
    // TODO: Integrar con servicio real de email (SendGrid, AWS SES, etc.)
    console.log('📧 [Email] Enviando notificación:', { to, subject });
    console.log('📧 [Email] Contenido HTML:', htmlContent.substring(0, 100) + '...');
    
    // Simular envío exitoso
    return true;
  } catch (error) {
    console.error('❌ [Email] Error enviando notificación:', error);
    return false;
  }
}

/**
 * Registra notificación en el sistema para mostrar en el portal
 */
async function saveNotificationToDatabase(notification: NotificationEvent): Promise<boolean> {
  try {
    const result = await postgresqlClient.query(
      `INSERT INTO provider_notifications 
       (supplier_id, document_id, type, title, message, metadata, created_at, read_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NULL)`,
      [
        notification.supplierId,
        notification.documentId,
        notification.type,
        notification.title,
        notification.message,
        JSON.stringify(notification.metadata || {})
      ]
    );

    return !result.error;
  } catch (error) {
    console.error('❌ [Notifications] Error guardando notificación:', error);
    return false;
  }
}

/**
 * Obtiene email del proveedor
 */
async function getSupplierEmail(supplierId: string): Promise<string | null> {
  try {
    const result = await postgresqlClient.query(
      'SELECT email FROM suppliers WHERE supplier_id = $1',
      [supplierId]
    );

    return result.data?.[0]?.email || null;
  } catch (error) {
    console.error('❌ [Notifications] Error obteniendo email del proveedor:', error);
    return null;
  }
}

/**
 * Función principal para enviar notificaciones
 */
export async function sendProviderNotification(
  event: NotificationEvent,
  shouldSendEmail: boolean = true
): Promise<{ emailSent: boolean; notificationSaved: boolean }> {
  console.log('📢 [Notifications] Enviando notificación:', event.type, 'para proveedor:', event.supplierId);

  let emailSent = false;
  let notificationSaved = false;

  // Guardar notificación en base de datos
  notificationSaved = await saveNotificationToDatabase(event);

  // Enviar email si está habilitado
  if (shouldSendEmail) {
    const supplierEmail = await getSupplierEmail(event.supplierId);
    
    if (supplierEmail && EMAIL_TEMPLATES[event.type]) {
      const template = EMAIL_TEMPLATES[event.type];
      const variables = {
        documentName: event.metadata?.documentName || 'Sin nombre',
        documentNumber: event.metadata?.documentNumber || 'N/A',
        receivedDate: new Date().toLocaleDateString('es-ES'),
        validatedDate: new Date().toLocaleDateString('es-ES'),
        errorDate: new Date().toLocaleDateString('es-ES'),
        reason: event.metadata?.reason || 'No especificado',
        details: event.metadata?.details || 'No especificado',
        errorMessage: event.metadata?.errorMessage || 'Error desconocido'
      };

      const htmlContent = replaceVariables(template.htmlContent, variables);
      const textContent = replaceVariables(template.textContent, variables);
      const subject = replaceVariables(template.subject, variables);

      emailSent = await sendEmail(supplierEmail, subject, htmlContent, textContent);
    }
  }

  console.log('✅ [Notifications] Resultado:', { emailSent, notificationSaved });
  
  return { emailSent, notificationSaved };
}

/**
 * Obtiene notificaciones del proveedor
 */
export async function getProviderNotifications(
  supplierId: string,
  limit: number = 10,
  offset: number = 0
): Promise<any[]> {
  try {
    const result = await postgresqlClient.query(
      `SELECT * FROM provider_notifications 
       WHERE supplier_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [supplierId, limit, offset]
    );

    return result.data || [];
  } catch (error) {
    console.error('❌ [Notifications] Error obteniendo notificaciones:', error);
    return [];
  }
}

/**
 * Marca notificación como leída
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const result = await postgresqlClient.query(
      'UPDATE provider_notifications SET read_at = NOW() WHERE id = $1',
      [notificationId]
    );

    return !result.error;
  } catch (error) {
    console.error('❌ [Notifications] Error marcando notificación como leída:', error);
    return false;
  }
}

/**
 * Funciones de conveniencia para eventos específicos
 */
export const ProviderNotifications = {
  documentReceived: (supplierId: string, documentId: string, metadata: any) =>
    sendProviderNotification({
      type: 'document_received',
      supplierId,
      documentId,
      title: 'Documento recibido',
      message: `Su documento ${metadata.documentName} ha sido recibido correctamente.`,
      metadata
    }),

  documentValidated: (supplierId: string, documentId: string, metadata: any) =>
    sendProviderNotification({
      type: 'document_validated',
      supplierId,
      documentId,
      title: 'Documento validado',
      message: `Su documento ${metadata.documentName} ha sido validado correctamente.`,
      metadata
    }),

  informationRequired: (supplierId: string, documentId: string, metadata: any) =>
    sendProviderNotification({
      type: 'information_required',
      supplierId,
      documentId,
      title: 'Información adicional requerida',
      message: `Se requiere información adicional para procesar su documento ${metadata.documentName}.`,
      metadata
    }),

  documentError: (supplierId: string, documentId: string, metadata: any) =>
    sendProviderNotification({
      type: 'document_error',
      supplierId,
      documentId,
      title: 'Error en procesamiento',
      message: `Ha ocurrido un error al procesar su documento ${metadata.documentName}.`,
      metadata
    })
}; 