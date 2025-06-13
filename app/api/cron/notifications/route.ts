import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@/lib/services/notification-service'

export async function POST(request: NextRequest) {
  try {
    // Verificar que el request viene de un cron job autorizado
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'dev-secret'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    console.log('🔄 [Cron Notifications] Starting cron job:', action)

    switch (action) {
      case 'weekly-reports':
        await notificationService.sendWeeklyReports()
        return NextResponse.json({
          success: true,
          message: 'Weekly reports sent successfully'
        })

      case 'cleanup':
        await notificationService.cleanupOldNotifications()
        return NextResponse.json({
          success: true,
          message: 'Old notifications cleaned up successfully'
        })

      case 'test-email':
        // Test endpoint para verificar configuración de email
        const { emailService } = await import('@/lib/services/email-service')
        
        const testTemplate = {
          subject: '🧪 Test Email - Portal de Proveedores',
          html: `
            <h2>Test Email</h2>
            <p>Este es un email de prueba del sistema de notificaciones.</p>
            <p>Fecha: ${new Date().toLocaleString('es-ES')}</p>
          `,
          text: `Test Email\n\nEste es un email de prueba del sistema de notificaciones.\nFecha: ${new Date().toLocaleString('es-ES')}`
        }

        const testEmail = process.env.TEST_EMAIL || 'test@example.com'
        const result = await emailService.sendEmail(
          { email: testEmail, name: 'Test User' },
          testTemplate
        )

        return NextResponse.json({
          success: result,
          message: result ? 'Test email sent successfully' : 'Failed to send test email',
          recipient: testEmail
        })

      default:
        return NextResponse.json(
          { error: 'Acción no válida. Use: weekly-reports, cleanup, o test-email' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('❌ [Cron Notifications] Error:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Health check para el cron job
    const { searchParams } = new URL(request.url)
    const check = searchParams.get('check')

    if (check === 'email-config') {
      const smtpConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS)
      const cronConfigured = !!process.env.CRON_SECRET
      
      return NextResponse.json({
        emailConfigured: smtpConfigured,
        cronConfigured: cronConfigured,
        status: smtpConfigured && cronConfigured ? 'ready' : 'incomplete',
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({
      service: 'Notifications Cron Service',
      status: 'running',
      availableActions: ['weekly-reports', 'cleanup', 'test-email'],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ [Cron Notifications] Health check error:', error)
    return NextResponse.json(
      { error: 'Service health check failed' },
      { status: 500 }
    )
  }
}