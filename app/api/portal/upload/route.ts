import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pgClient from '@/lib/postgresql-client';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
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

    // Obtener datos del formulario
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('document_type') as string;
    const documentNumber = formData.get('document_number') as string;
    const description = formData.get('description') as string;
    const supplierId = formData.get('supplier_id') as string;
    const supplierName = formData.get('supplier_name') as string;

    if (!file || !documentType || !documentNumber) {
      return NextResponse.json(
        { error: 'Archivo, tipo de documento y número son requeridos' },
        { status: 400 }
      );
    }

    // Validar que el supplier_id coincida con el token
    if (supplierId !== decoded.providerId) {
      return NextResponse.json(
        { error: 'No autorizado para este proveedor' },
        { status: 403 }
      );
    }

    // Validar archivo PDF
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Solo se permiten archivos PDF' },
        { status: 400 }
      );
    }

    // Validar tamaño (10MB máximo)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'El archivo no puede superar los 10MB' },
        { status: 400 }
      );
    }

    // Generar ID único para el documento
    const jobId = uuidv4();
    
    // Convertir archivo a buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Crear directorio de uploads si no existe
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Guardar archivo
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, buffer);

    // Preparar datos para inserción
    const documentData = {
      document_number: documentNumber,
      document_type: documentType,
      description: description || '',
      supplier: {
        id: supplierId,
        name: supplierName
      },
      uploaded_by: 'portal_provider',
      file_size: file.size,
      file_name: file.name,
      uploaded_at: new Date().toISOString()
    };

    // Insertar documento en la tabla document_processing
    const insertQuery = `
      INSERT INTO document_processing (
        job_id,
        document_type,
        file_path,
        processed_json,
        upload_timestamp,
        status
      ) VALUES (
        $1, $2, $3, $4, NOW(), $5
      ) RETURNING *
    `;

    const { data: result, error: insertError } = await pgClient.query(insertQuery, [
      jobId,
      documentType,
      filePath,
      JSON.stringify(documentData),
      'pending'
    ]);

    if (insertError) {
      console.error('❌ [Portal Upload] Error insertando documento:', insertError);
      return NextResponse.json(
        { error: 'Error guardando documento' },
        { status: 500 }
      );
    }

    const document = result[0];

    // Registrar en audit_logs si existe la tabla
    try {
      await pgClient.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          decoded.userId,
          'CREATE',
          'document',
          jobId,
          JSON.stringify({
            document_type: documentType,
            document_number: documentNumber,
            supplier_name: supplierName,
            source: 'portal_provider'
          })
        ]
      );
    } catch (auditError) {
      // Si no existe la tabla de auditoría, continuar sin error
      console.log('Audit log not available:', auditError);
    }

    // Enviar notificación (base de datos + email)
    try {
      const { notificationService } = await import('@/lib/services/notification-service')
      
      await notificationService.notifyDocumentUploaded({
        userId: decoded.userId,
        documentId: jobId,
        documentType: documentType,
        documentNumber: documentNumber,
        uploadTimestamp: new Date().toISOString()
      })
    } catch (notificationError) {
      console.error('Error enviando notificación:', notificationError);
      // No fallar la subida por error de notificación
    }

    console.log('✅ [Portal Upload] Documento subido exitosamente:', jobId);

    return NextResponse.json({
      success: true,
      document: {
        job_id: jobId,
        document_type: documentType,
        document_number: documentNumber,
        status: 'pending',
        upload_timestamp: document.upload_timestamp,
        title: `${documentType} - ${documentNumber}`
      },
      message: 'Documento subido exitosamente y en cola de procesamiento'
    });

  } catch (error) {
    console.error('Error en upload del portal:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 