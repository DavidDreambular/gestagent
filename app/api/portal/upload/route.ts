import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { pool } from '@/lib/postgresql-client';
import { v4 as uuidv4 } from 'uuid';
import { ProviderNotifications } from '@/lib/services/provider-notifications';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autorización requerido' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded;
    
    try {
      decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'fallback-secret') as any;
    } catch (error) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    if (decoded.role !== 'provider') {
      return NextResponse.json(
        { error: 'Acceso no autorizado' },
        { status: 403 }
      );
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
    if (supplierId !== decoded.supplier_id) {
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

    // Insertar documento en la base de datos
    const insertQuery = `
      INSERT INTO documents (
        job_id,
        document_type,
        raw_text,
        processed_json,
        upload_timestamp,
        user_id,
        status,
        emitter_name,
        receiver_name,
        document_date,
        title,
        file_path,
        version,
        source
      ) VALUES (
        $1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9, $10, $11, $12, $13
      ) RETURNING *
    `;

    const documentData = {
      document_number: documentNumber,
      document_type: documentType,
      description: description || '',
      supplier_id: supplierId,
      supplier_name: supplierName,
      uploaded_by: 'portal_provider',
      file_size: file.size,
      file_name: file.name
    };

    const result = await pool.query(insertQuery, [
      jobId,
      documentType,
      '', // raw_text - se llenará después del procesamiento
      JSON.stringify(documentData), // processed_json con metadata
      decoded.id, // user_id del proveedor
      'pending', // status inicial
      supplierName, // emitter_name
      'Gestoría', // receiver_name
      new Date().toISOString().split('T')[0], // document_date
      `${documentType} - ${documentNumber}`, // title
      `portal_uploads/${jobId}.pdf`, // file_path
      1, // version
      'portal_provider' // source
    ]);

    const document = result.rows[0];

    // Aquí se podría integrar con el procesamiento OCR
    // Por ahora, marcamos como recibido
    await pool.query(
      'UPDATE documents SET status = $1 WHERE job_id = $2',
      ['received', jobId]
    );

    // Registrar en audit_logs si existe la tabla
    try {
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          decoded.id,
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

    // Enviar notificación al proveedor
    try {
      await ProviderNotifications.documentReceived(supplierId, jobId, {
        documentName: `${documentType} - ${documentNumber}`,
        documentNumber: documentNumber,
        documentType: documentType,
        supplierName: supplierName
      });
    } catch (notificationError) {
      console.error('Error enviando notificación:', notificationError);
      // No fallar la subida por error de notificación
    }

    return NextResponse.json({
      success: true,
      document: {
        job_id: jobId,
        document_type: documentType,
        document_number: documentNumber,
        status: 'received',
        upload_timestamp: document.upload_timestamp,
        title: document.title
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