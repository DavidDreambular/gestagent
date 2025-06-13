import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import pgClient from '@/lib/postgresql-client'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('portal-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Verificar y decodificar el token
    const decoded = jwt.verify(
      token,
      process.env.NEXTAUTH_SECRET || 'fallback-secret'
    ) as any

    if (!decoded || decoded.role !== 'provider') {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    const userId = decoded.userId

    // Obtener preferencias del usuario (si existen)
    const { data: preferencesData, error: preferencesError } = await pgClient.query(`
      SELECT 
        email_notifications,
        weekly_reports,
        document_upload_notifications,
        document_processed_notifications,
        error_notifications,
        created_at,
        updated_at
      FROM provider_notification_preferences 
      WHERE provider_user_id = $1
    `, [userId])

    let preferences
    if (preferencesError || !preferencesData || preferencesData.length === 0) {
      // Crear preferencias por defecto si no existen
      const { data: defaultPrefs, error: createError } = await pgClient.query(`
        INSERT INTO provider_notification_preferences (
          provider_user_id,
          email_notifications,
          weekly_reports,
          document_upload_notifications,
          document_processed_notifications,
          error_notifications,
          created_at,
          updated_at
        ) VALUES ($1, true, true, true, true, true, NOW(), NOW())
        RETURNING *
      `, [userId])

      if (createError) {
        console.error('❌ [Notification Preferences] Error creating default preferences:', createError)
        
        // Si la tabla no existe, devolver preferencias por defecto
        preferences = {
          email_notifications: true,
          weekly_reports: true,
          document_upload_notifications: true,
          document_processed_notifications: true,
          error_notifications: true
        }
      } else {
        preferences = defaultPrefs[0]
      }
    } else {
      preferences = preferencesData[0]
    }

    return NextResponse.json({
      preferences: {
        emailNotifications: preferences.email_notifications,
        weeklyReports: preferences.weekly_reports,
        documentUploadNotifications: preferences.document_upload_notifications,
        documentProcessedNotifications: preferences.document_processed_notifications,
        errorNotifications: preferences.error_notifications
      }
    })

  } catch (error) {
    console.error('❌ [Notification Preferences] Error getting preferences:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('portal-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Verificar y decodificar el token
    const decoded = jwt.verify(
      token,
      process.env.NEXTAUTH_SECRET || 'fallback-secret'
    ) as any

    if (!decoded || decoded.role !== 'provider') {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    const userId = decoded.userId
    const {
      emailNotifications,
      weeklyReports,
      documentUploadNotifications,
      documentProcessedNotifications,
      errorNotifications
    } = await request.json()

    // Validar datos
    if (typeof emailNotifications !== 'boolean' ||
        typeof weeklyReports !== 'boolean' ||
        typeof documentUploadNotifications !== 'boolean' ||
        typeof documentProcessedNotifications !== 'boolean' ||
        typeof errorNotifications !== 'boolean') {
      return NextResponse.json(
        { error: 'Datos de preferencias inválidos' },
        { status: 400 }
      )
    }

    // Actualizar preferencias (o crear si no existen)
    const { data: updatedPrefs, error: updateError } = await pgClient.query(`
      INSERT INTO provider_notification_preferences (
        provider_user_id,
        email_notifications,
        weekly_reports,
        document_upload_notifications,
        document_processed_notifications,
        error_notifications,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (provider_user_id)
      DO UPDATE SET
        email_notifications = $2,
        weekly_reports = $3,
        document_upload_notifications = $4,
        document_processed_notifications = $5,
        error_notifications = $6,
        updated_at = NOW()
      RETURNING *
    `, [
      userId,
      emailNotifications,
      weeklyReports,
      documentUploadNotifications,
      documentProcessedNotifications,
      errorNotifications
    ])

    if (updateError) {
      console.error('❌ [Notification Preferences] Error updating preferences:', updateError)
      return NextResponse.json(
        { error: 'Error guardando preferencias' },
        { status: 500 }
      )
    }

    // Crear notificación de confirmación
    try {
      await pgClient.query(
        `INSERT INTO provider_notifications (
          provider_user_id, 
          title, 
          message, 
          type,
          created_at
        ) VALUES ($1, $2, $3, $4, NOW())`,
        [
          userId,
          'Preferencias actualizadas',
          'Tus preferencias de notificaciones han sido guardadas correctamente.',
          'success'
        ]
      )
    } catch (notifError) {
      // No fallar la actualización por error de notificación
      console.error('Error creating confirmation notification:', notifError)
    }

    console.log('✅ [Notification Preferences] Preferences updated successfully for user:', userId)

    return NextResponse.json({
      success: true,
      message: 'Preferencias actualizadas correctamente',
      preferences: {
        emailNotifications: updatedPrefs[0].email_notifications,
        weeklyReports: updatedPrefs[0].weekly_reports,
        documentUploadNotifications: updatedPrefs[0].document_upload_notifications,
        documentProcessedNotifications: updatedPrefs[0].document_processed_notifications,
        errorNotifications: updatedPrefs[0].error_notifications
      }
    })

  } catch (error) {
    console.error('❌ [Notification Preferences] Error updating preferences:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}