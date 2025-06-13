import { NextRequest, NextResponse } from 'next/server';
import pgClient from '@/lib/postgresql-client';

export async function GET(request: NextRequest) {
  try {
    console.log('📋 Configurando tabla de notificaciones...');

    // Verificar si la tabla existe
    const { data: checkTable, error: checkError } = await pgClient.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
      );
    `);

    if (checkError) {
      console.error('❌ Error verificando tabla:', checkError);
      return NextResponse.json({ error: 'Error verificando tabla', details: checkError }, { status: 500 });
    }

    const tableExists = checkTable?.[0]?.exists;

    if (!tableExists) {
      console.log('📋 Creando tabla notifications...');

      // Crear tabla de notificaciones
      const { error: createError } = await pgClient.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT,
          read BOOLEAN DEFAULT FALSE,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          read_at TIMESTAMP WITH TIME ZONE
        );
      `);

      if (createError) {
        console.error('❌ Error creando tabla:', createError);
        return NextResponse.json({ error: 'Error creando tabla', details: createError }, { status: 500 });
      }

      // Crear índices
      await pgClient.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);`);
      await pgClient.query(`CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);`);
      await pgClient.query(`CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);`);
      await pgClient.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = FALSE;`);

      console.log('✅ Tabla notifications creada exitosamente');
    }

    // Verificar la estructura de la tabla
    const { data: columns } = await pgClient.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'notifications' 
      ORDER BY ordinal_position;
    `);

    // Contar notificaciones existentes
    const { data: countData } = await pgClient.query('SELECT COUNT(*) as total FROM notifications');
    const total = parseInt(countData?.[0]?.total || '0');

    // Obtener estadísticas por tipo
    const { data: statsData } = await pgClient.query(`
      SELECT type, COUNT(*) as count 
      FROM notifications 
      GROUP BY type 
      ORDER BY count DESC
    `);

    return NextResponse.json({
      success: true,
      table_exists: true,
      columns: columns || [],
      total_notifications: total,
      stats_by_type: statsData || [],
      message: tableExists ? 'Tabla ya existía' : 'Tabla creada exitosamente'
    });

  } catch (error: any) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { 
        error: 'Error en setup de notificaciones',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}