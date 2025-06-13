import nodemailer from 'nodemailer'
import { Transporter } from 'nodemailer'

interface EmailConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
}

interface EmailTemplate {
  subject: string
  html: string
  text: string
}

interface EmailRecipient {
  email: string
  name?: string
}

export class EmailService {
  private transporter: Transporter
  private isConfigured: boolean = false

  constructor() {
    this.initializeTransporter()
  }

  private initializeTransporter() {
    try {
      // Configuración desde variables de entorno
      const config: EmailConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || ''
        }
      }

      if (!config.auth.user || !config.auth.pass) {
        console.warn('⚠️ [EmailService] SMTP credentials not configured. Email notifications disabled.')
        return
      }

      this.transporter = nodemailer.createTransporter(config)
      this.isConfigured = true
      
      // Verificar configuración
      this.verifyConnection()
      
    } catch (error) {
      console.error('❌ [EmailService] Error initializing email service:', error)
    }
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify()
      console.log('✅ [EmailService] Email service configured successfully')
    } catch (error) {
      console.error('❌ [EmailService] Email service verification failed:', error)
      this.isConfigured = false
    }
  }

  async sendEmail(
    to: EmailRecipient | EmailRecipient[],
    template: EmailTemplate,
    attachments?: any[]
  ): Promise<boolean> {
    if (!this.isConfigured) {
      console.warn('⚠️ [EmailService] Email service not configured, skipping email')
      return false
    }

    try {
      const recipients = Array.isArray(to) ? to : [to]
      const emailAddresses = recipients.map(r => r.email).join(', ')

      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'GestAgent Portal',
          address: process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER || ''
        },
        to: emailAddresses,
        subject: template.subject,
        text: template.text,
        html: template.html,
        attachments: attachments || []
      }

      const result = await this.transporter.sendMail(mailOptions)
      console.log('✅ [EmailService] Email sent successfully:', result.messageId)
      return true

    } catch (error) {
      console.error('❌ [EmailService] Error sending email:', error)
      return false
    }
  }

  // Templates predefinidos para notificaciones del portal
  getDocumentUploadedTemplate(data: {
    providerName: string
    documentType: string
    documentNumber: string
    uploadTimestamp: string
  }): EmailTemplate {
    const subject = `✅ Documento recibido: ${data.documentType} - ${data.documentNumber}`
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .success-icon { font-size: 48px; text-align: center; margin-bottom: 20px; }
          .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
          .detail-label { font-weight: bold; color: #6b7280; }
          .detail-value { color: #111827; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Portal de Proveedores - GestAgent</h1>
          </div>
          <div class="content">
            <div class="success-icon">✅</div>
            <h2 style="text-align: center; color: #16a34a;">¡Documento recibido exitosamente!</h2>
            
            <p>Estimado/a proveedor <strong>${data.providerName}</strong>,</p>
            
            <p>Hemos recibido correctamente tu documento y está siendo procesado por nuestro sistema.</p>
            
            <div class="details">
              <h3>Detalles del documento:</h3>
              <div class="detail-row">
                <span class="detail-label">Tipo de documento:</span>
                <span class="detail-value">${data.documentType}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Número de documento:</span>
                <span class="detail-value">${data.documentNumber}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Fecha de subida:</span>
                <span class="detail-value">${new Date(data.uploadTimestamp).toLocaleString('es-ES')}</span>
              </div>
            </div>
            
            <p>El documento será procesado automáticamente y recibirás una notificación cuando esté completado.</p>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/portal/dashboard" class="button">
                Acceder al Portal
              </a>
            </div>
            
            <div class="footer">
              <p>Este es un email automático, por favor no respondas a esta dirección.</p>
              <p>Si tienes alguna consulta, contacta con nuestro equipo de soporte.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `

    const text = `
¡Documento recibido exitosamente!

Estimado/a proveedor ${data.providerName},

Hemos recibido correctamente tu documento y está siendo procesado por nuestro sistema.

Detalles del documento:
- Tipo: ${data.documentType}
- Número: ${data.documentNumber}
- Fecha: ${new Date(data.uploadTimestamp).toLocaleString('es-ES')}

El documento será procesado automáticamente y recibirás una notificación cuando esté completado.

Accede al portal: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/portal/dashboard

Este es un email automático, por favor no respondas a esta dirección.
    `

    return { subject, html, text }
  }

  getDocumentProcessedTemplate(data: {
    providerName: string
    documentType: string
    documentNumber: string
    status: string
    processedTimestamp: string
    documentId: string
  }): EmailTemplate {
    const isSuccess = data.status === 'completed' || data.status === 'processed'
    const subject = isSuccess 
      ? `✅ Documento procesado: ${data.documentType} - ${data.documentNumber}`
      : `❌ Error procesando documento: ${data.documentType} - ${data.documentNumber}`
    
    const statusIcon = isSuccess ? '✅' : '❌'
    const statusColor = isSuccess ? '#16a34a' : '#dc2626'
    const statusText = isSuccess ? 'Procesado exitosamente' : 'Error en procesamiento'

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .status-icon { font-size: 48px; text-align: center; margin-bottom: 20px; }
          .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
          .detail-label { font-weight: bold; color: #6b7280; }
          .detail-value { color: #111827; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Portal de Proveedores - GestAgent</h1>
          </div>
          <div class="content">
            <div class="status-icon">${statusIcon}</div>
            <h2 style="text-align: center; color: ${statusColor};">${statusText}</h2>
            
            <p>Estimado/a proveedor <strong>${data.providerName}</strong>,</p>
            
            <p>${isSuccess 
              ? 'Tu documento ha sido procesado exitosamente y está disponible en el sistema.'
              : 'Ha ocurrido un error durante el procesamiento de tu documento. Por favor, revisa los detalles y contacta con soporte si es necesario.'
            }</p>
            
            <div class="details">
              <h3>Detalles del documento:</h3>
              <div class="detail-row">
                <span class="detail-label">Tipo de documento:</span>
                <span class="detail-value">${data.documentType}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Número de documento:</span>
                <span class="detail-value">${data.documentNumber}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Estado:</span>
                <span class="detail-value" style="color: ${statusColor};">${statusText}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Fecha de procesamiento:</span>
                <span class="detail-value">${new Date(data.processedTimestamp).toLocaleString('es-ES')}</span>
              </div>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/portal/documents/${data.documentId}" class="button">
                Ver Documento
              </a>
            </div>
            
            <div class="footer">
              <p>Este es un email automático, por favor no respondas a esta dirección.</p>
              <p>Si tienes alguna consulta, contacta con nuestro equipo de soporte.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `

    const text = `
${statusText}

Estimado/a proveedor ${data.providerName},

${isSuccess 
  ? 'Tu documento ha sido procesado exitosamente y está disponible en el sistema.'
  : 'Ha ocurrido un error durante el procesamiento de tu documento.'
}

Detalles del documento:
- Tipo: ${data.documentType}
- Número: ${data.documentNumber}
- Estado: ${statusText}
- Fecha: ${new Date(data.processedTimestamp).toLocaleString('es-ES')}

Ver documento: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/portal/documents/${data.documentId}

Este es un email automático, por favor no respondas a esta dirección.
    `

    return { subject, html, text }
  }

  getWeeklyReportTemplate(data: {
    providerName: string
    weekStart: string
    weekEnd: string
    totalDocuments: number
    processedDocuments: number
    pendingDocuments: number
    errorDocuments: number
    documents: Array<{
      id: string
      type: string
      number: string
      status: string
      uploadDate: string
    }>
  }): EmailTemplate {
    const subject = `📊 Resumen semanal de documentos - ${data.weekStart} al ${data.weekEnd}`
    
    const documentsHtml = data.documents.map(doc => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${doc.type}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${doc.number}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
          <span style="color: ${
            doc.status === 'completed' ? '#16a34a' : 
            doc.status === 'pending' ? '#eab308' : '#dc2626'
          };">
            ${doc.status === 'completed' ? 'Procesado' : 
              doc.status === 'pending' ? 'Pendiente' : 'Error'}
          </span>
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${new Date(doc.uploadDate).toLocaleDateString('es-ES')}</td>
      </tr>
    `).join('')

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
          .stat-card { background: white; padding: 20px; border-radius: 8px; text-align: center; }
          .stat-number { font-size: 32px; font-weight: bold; color: #2563eb; }
          .stat-label { color: #6b7280; font-size: 14px; }
          .documents-table { background: white; border-radius: 8px; overflow: hidden; margin: 20px 0; }
          .table { width: 100%; border-collapse: collapse; }
          .table th { background: #f3f4f6; padding: 12px 8px; text-align: left; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Resumen Semanal</h1>
            <p>${data.weekStart} - ${data.weekEnd}</p>
          </div>
          <div class="content">
            <p>Hola <strong>${data.providerName}</strong>,</p>
            
            <p>Te enviamos el resumen de actividad de tus documentos durante esta semana:</p>
            
            <div class="stats">
              <div class="stat-card">
                <div class="stat-number">${data.totalDocuments}</div>
                <div class="stat-label">Total documentos</div>
              </div>
              <div class="stat-card">
                <div class="stat-number" style="color: #16a34a;">${data.processedDocuments}</div>
                <div class="stat-label">Procesados</div>
              </div>
              <div class="stat-card">
                <div class="stat-number" style="color: #eab308;">${data.pendingDocuments}</div>
                <div class="stat-label">Pendientes</div>
              </div>
              <div class="stat-card">
                <div class="stat-number" style="color: #dc2626;">${data.errorDocuments}</div>
                <div class="stat-label">Con errores</div>
              </div>
            </div>
            
            ${data.documents.length > 0 ? `
            <div class="documents-table">
              <table class="table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Número</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  ${documentsHtml}
                </tbody>
              </table>
            </div>
            ` : '<p>No hubo actividad de documentos esta semana.</p>'}
            
            <div style="text-align: center;">
              <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/portal/dashboard" class="button">
                Acceder al Portal
              </a>
            </div>
            
            <div class="footer">
              <p>Este es un email automático, por favor no respondas a esta dirección.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `

    const text = `
Resumen Semanal de Documentos
${data.weekStart} - ${data.weekEnd}

Hola ${data.providerName},

Resumen de actividad de tus documentos durante esta semana:

📊 Estadísticas:
- Total documentos: ${data.totalDocuments}
- Procesados: ${data.processedDocuments}
- Pendientes: ${data.pendingDocuments}
- Con errores: ${data.errorDocuments}

Accede al portal: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/portal/dashboard

Este es un email automático, por favor no respondas a esta dirección.
    `

    return { subject, html, text }
  }
}

// Instancia singleton del servicio de email
export const emailService = new EmailService()