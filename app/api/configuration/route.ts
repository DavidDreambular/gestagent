// API Route para configuración del sistema
// /app/api/configuration/route.ts
// Gestión de configuración de empresa, APIs y preferencias

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { memoryDB } from '@/lib/memory-db';


export const dynamic = 'force-dynamic';

// GET - Obtener configuración actual
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo usuarios con permisos específicos pueden ver configuración
    const userRole = session.user?.role || 'viewer';
    if (!['admin', 'supervisor'].includes(userRole)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    // Obtener configuración del memory database
    const config = await memoryDB.getSafeSystemConfiguration(userRole === 'admin');

    return NextResponse.json({
      success: true,
      data: config,
      source: 'memory_db'
    });

  } catch (error) {
    console.error('Error en GET /api/configuration:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Actualizar configuración
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo administradores pueden actualizar configuración
    const userRole = session.user?.role || 'viewer';
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores pueden actualizar configuración' }, { status: 403 });
    }

    const { section, data } = await request.json();

    if (!section || !data) {
      return NextResponse.json(
        { error: 'Sección y datos son requeridos' },
        { status: 400 }
      );
    }

    // Validar secciones permitidas
    const allowedSections = ['company', 'apis', 'notifications', 'backup', 'advanced'];
    if (!allowedSections.includes(section)) {
      return NextResponse.json(
        { error: 'Sección no válida' },
        { status: 400 }
      );
    }

    // Actualizar configuración en memory database
    const updatedConfig = await memoryDB.updateSystemConfiguration(section, data);

    // Registrar en auditoría
    await memoryDB.createAuditLog({
      entity_type: 'system_configuration',
      entity_id: section,
      action: 'updated',
      user_id: session.user?.id || 'unknown',
      changes: {
        section,
        data
      },
      notes: `Configuración de ${section} actualizada`
    });

    console.log(`✅ [CONFIG] Sección ${section} actualizada correctamente`);

    return NextResponse.json({
      success: true,
      message: `Configuración de ${section} actualizada correctamente`,
      updated_section: section,
      source: 'memory_db'
    });

  } catch (error) {
    console.error('Error en POST /api/configuration:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Restablecer configuración por defecto
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = session.user?.role || 'viewer';
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores pueden restablecer configuración' }, { status: 403 });
    }

    // Restablecer configuración en memory database
    const resetConfig = await memoryDB.resetSystemConfiguration();

    // Registrar en auditoría
    await memoryDB.createAuditLog({
      entity_type: 'system_configuration',
      entity_id: 'all',
      action: 'reset',
      user_id: session.user?.id || 'unknown',
      changes: resetConfig,
      notes: 'Configuración restablecida a valores por defecto'
    });

    return NextResponse.json({
      success: true,
      message: 'Configuración restablecida a valores por defecto',
      data: resetConfig,
      source: 'memory_db'
    });

  } catch (error) {
    console.error('Error en PUT /api/configuration:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 