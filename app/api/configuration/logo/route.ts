// API Route para gestión de logo de empresa
// /app/api/configuration/logo/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { memoryDB } from '@/lib/memory-db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

// POST - Upload company logo
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo administradores pueden subir logos
    const userRole = session.user?.role || 'viewer';
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores pueden subir logos' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('logo') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Formato de archivo no válido. Solo se permiten PNG y JPG.' },
        { status: 400 }
      );
    }

    // Validar tamaño (máx 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'El archivo es demasiado grande. Máximo 2MB.' },
        { status: 400 }
      );
    }

    // Crear directorio si no existe
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'logos');
    await mkdir(uploadDir, { recursive: true });

    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const extension = path.extname(file.name);
    const fileName = `company-logo-${timestamp}${extension}`;
    const filePath = path.join(uploadDir, fileName);

    // Guardar archivo
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // URL pública del logo
    const logoUrl = `/uploads/logos/${fileName}`;

    // Actualizar configuración con la URL del logo
    const currentConfig = await memoryDB.getSystemConfiguration();
    await memoryDB.updateSystemConfiguration('company', {
      ...currentConfig.company,
      logo_url: logoUrl
    });

    // Registrar en auditoría
    await memoryDB.createAuditLog({
      entity_type: 'system_configuration',
      entity_id: 'company_logo',
      action: 'uploaded',
      user_id: session.user?.id || 'unknown',
      changes: {
        logo_url: logoUrl,
        file_name: fileName,
        file_size: file.size,
        file_type: file.type
      },
      notes: 'Logo de empresa actualizado'
    });

    console.log(`✅ [CONFIG] Logo subido exitosamente: ${logoUrl}`);

    return NextResponse.json({
      success: true,
      message: 'Logo subido correctamente',
      logo_url: logoUrl
    });

  } catch (error) {
    console.error('Error en POST /api/configuration/logo:', error);
    return NextResponse.json(
      { error: 'Error al subir el logo' },
      { status: 500 }
    );
  }
}

// DELETE - Remove company logo
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo administradores pueden eliminar logos
    const userRole = session.user?.role || 'viewer';
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores pueden eliminar logos' }, { status: 403 });
    }

    // Actualizar configuración removiendo el logo
    const currentConfig = await memoryDB.getSystemConfiguration();
    await memoryDB.updateSystemConfiguration('company', {
      ...currentConfig.company,
      logo_url: ''
    });

    // Registrar en auditoría
    await memoryDB.createAuditLog({
      entity_type: 'system_configuration',
      entity_id: 'company_logo',
      action: 'removed',
      user_id: session.user?.id || 'unknown',
      changes: {
        logo_url: null
      },
      notes: 'Logo de empresa eliminado'
    });

    return NextResponse.json({
      success: true,
      message: 'Logo eliminado correctamente'
    });

  } catch (error) {
    console.error('Error en DELETE /api/configuration/logo:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el logo' },
      { status: 500 }
    );
  }
}