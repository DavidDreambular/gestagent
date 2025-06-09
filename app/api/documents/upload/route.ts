// API Route para upload de documentos PDF - MIGRADO A POSTGRESQL
// /app/api/documents/upload/route.ts
// FLUJO CORRECTO: PDF → Storage Local → Mistral Document Understanding → PostgreSQL

import { NextRequest, NextResponse } from 'next/server';
import { EnhancedMistralProcessor } from '@/services/document-processor-mistral-enhanced';
import pgClient from '@/lib/postgresql-client';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { suppliersCustomersManager } from '@/services/suppliers-customers-manager';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import AuditService, { AuditAction, AuditEntityType } from '@/services/audit.service';

// Función para convertir fecha DD/MM/YYYY a formato ISO YYYY-MM-DD
function convertToISODate(dateString: string | null | undefined): string | null {
  if (!dateString) return null;
  
  try {
    // Si ya está en formato ISO (YYYY-MM-DD), devolverlo tal como está
    if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
      return dateString.split('T')[0]; // Remover parte de tiempo si existe
    }
    
    // Si está en formato DD/MM/YYYY o DD/MM/YY
    const ddmmyyyy = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      const fullYear = year.length === 2 ? `20${year}` : year;
      return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Si está en formato YYYY/MM/DD
    const yyyymmdd = dateString.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (yyyymmdd) {
      const [, year, month, day] = yyyymmdd;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    console.warn(`⚠️ [API] Formato de fecha no reconocido: ${dateString}`);
    return null;
  } catch (error) {
    console.error(`❌ [API] Error convirtiendo fecha "${dateString}":`, error);
    return null;
  }
}

// Configurar el límite de tamaño para archivos grandes
export const maxDuration = 180; // 3 minutos para procesamiento completo
export const dynamic = 'force-dynamic';

// Función para guardar archivo localmente
function saveFileLocally(buffer: Buffer, fileName: string): string {
  try {
    // Crear directorio de uploads si no existe
    const uploadsDir = join(process.cwd(), 'uploads');
    mkdirSync(uploadsDir, { recursive: true });
    
    // Generar nombre único
    const timestamp = Date.now();
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${timestamp}_${safeFileName}`;
    const filePath = join(uploadsDir, uniqueFileName);
    
    // Guardar archivo
    writeFileSync(filePath, buffer);
    console.log(`💾 [API] Archivo guardado localmente: ${filePath}`);
    
    return `/uploads/${uniqueFileName}`;
  } catch (error) {
    console.error('❌ [API] Error guardando archivo localmente:', error);
    throw error;
  }
}

// Handler GET - Información del endpoint
export async function GET() {
  return NextResponse.json({
    message: "GestAgent - Upload & Processing API",
    version: "6.0.0 POSTGRESQL MIGRATION",
    description: "Procesa documentos PDF usando Mistral Document Understanding API con PostgreSQL",
    flow: "PDF → Storage Local → Mistral Document Understanding → JSON Estructurado → PostgreSQL",
    model: "mistral-small-latest",
    provider: "Mistral AI",
    mode: "PRODUCTION_POSTGRESQL",
    features: [
      "✅ Procesamiento directo de PDF",
      "✅ Document Understanding nativo",
      "✅ Extracción estructurada en JSON",
      "✅ Soporte multilingüe (ES/CAT)",
      "✅ Storage local",
      "✅ PostgreSQL como base de datos",
      "✅ Logs de auditoría completos"
    ],
    endpoints: {
      info: "GET /api/documents/upload",
      upload: "POST /api/documents/upload"
    },
    limits: {
      max_file_size: "50MB",
      max_pages: 64,
      timeout: "180 segundos"
    },
    storage: {
      database: "PostgreSQL",
      files: "Local Storage"
    }
  });
}

// Handler POST - Procesar documento
export async function POST(request: NextRequest) {
  console.log('\n🚀 [API] Iniciando procesamiento de documento con PostgreSQL');
  
  try {
    // Verificar autenticación (opcional para desarrollo)
    let userId = '00000000-0000-0000-0000-000000000000'; // UUID válido para desarrollo
    try {
      const session = await getServerSession(authOptions);
      userId = session?.user?.id || '00000000-0000-0000-0000-000000000000';
    } catch (authError) {
      console.warn('⚠️ [API] Sin autenticación, usando usuario de desarrollo con UUID válido');
    }

    // Parsear FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('documentType') as string || 'factura';
    
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No se proporcionó archivo',
        error_code: 'MISSING_FILE'
      }, { status: 400 });
    }

    console.log(`📄 [API] Archivo recibido: ${file.name} (${file.size} bytes)`);
    console.log(`📋 [API] Tipo documento: ${documentType}`);
    console.log(`👤 [API] Usuario: ${userId}`);

    // Validar tipo de archivo
    if (file.type !== 'application/pdf') {
      return NextResponse.json({
        success: false,
        error: 'Solo se permiten archivos PDF',
        error_code: 'INVALID_FILE_TYPE',
        received_type: file.type
      }, { status: 400 });
    }

    // Validar tamaño (50MB máximo según Mistral)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: 'Archivo demasiado grande. Máximo 50MB',
        error_code: 'FILE_TOO_LARGE',
        size: file.size,
        max_size: maxSize
      }, { status: 400 });
    }

    // Convertir archivo a buffer
    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);
    
    // Generar job ID único - usando UUID válido para PostgreSQL
    const jobId = uuidv4();
    
    console.log(`🔄 [API] Iniciando procesamiento con Job ID: ${jobId}`);

    // Guardar archivo localmente
    const filePath = saveFileLocally(pdfBuffer, file.name);

    // Procesar con Enhanced Mistral Processor (optimizado para múltiples facturas)
    const enhancedProcessor = new EnhancedMistralProcessor();
    const result = await enhancedProcessor.processDocument(pdfBuffer, jobId);

    if (!result.success) {
      console.error('❌ [API] Error en procesamiento:', result.extracted_data);
      return NextResponse.json({
        success: false,
        jobId: result.jobId,
        error: 'Error procesando documento',
        error_code: 'PROCESSING_ERROR',
        details: result.extracted_data
      }, { status: 500 });
    }

    console.log(`✅ [API] Procesamiento exitoso en ${result.processing_metadata.total_time_ms}ms`);

    // AUDITORÍA: Registrar inicio de procesamiento
    await AuditService.logFromRequest(request, {
      userId,
      action: AuditAction.UPLOAD,
      entityType: AuditEntityType.DOCUMENTS,
      entityId: jobId,
      newValues: {
        fileName: file.name,
        fileSize: file.size,
        documentType: documentType
      },
      metadata: {
        processingTimeMs: result.processing_metadata.total_time_ms,
        source: 'upload_api'
      }
    });

    // NUEVO: Procesar relaciones comerciales (proveedores/clientes)
    let supplier_id: string | undefined;
    let customer_id: string | undefined;
    let relationsOperations: string[] = [];

    try {
      console.log('🏢 [API] Procesando relaciones comerciales...');
      const relations = await suppliersCustomersManager.processInvoiceRelations(
        result.extracted_data,
        jobId
      );
      supplier_id = relations.supplier_id;
      customer_id = relations.customer_id;
      relationsOperations = relations.operations;
      
      console.log(`✅ [API] Relaciones procesadas: Proveedor=${supplier_id}, Cliente=${customer_id}`);
    } catch (relationsError) {
      console.error('❌ [API] Error procesando relaciones comerciales:', relationsError);
      relationsOperations.push(`Error procesando relaciones: ${relationsError}`);
    }

    // Extraer totales para campos denormalizados
    let total_amount: number | undefined;
    let tax_amount: number | undefined;
    let document_date: string | undefined;

    try {
      // Si es un array de facturas, sumar totales
      if (Array.isArray(result.extracted_data)) {
        total_amount = result.extracted_data.reduce((sum: number, invoice: any) => {
          return sum + (invoice.totals?.total || 0);
        }, 0);
        tax_amount = result.extracted_data.reduce((sum: number, invoice: any) => {
          return sum + (invoice.totals?.total_tax_amount || 0);
        }, 0);
        document_date = convertToISODate(result.extracted_data[0]?.issue_date || result.extracted_data[0]?.invoice_date) || undefined;
      } else {
        // Si es una factura única
        total_amount = result.extracted_data?.totals?.total || 0;
        tax_amount = result.extracted_data?.totals?.total_tax_amount || 0;
        document_date = convertToISODate(result.extracted_data?.issue_date) || undefined;
      }
    } catch (totalsError) {
      console.warn('⚠️ [API] Error extrayendo totales:', totalsError);
    }

    // Verificar/Crear usuario en PostgreSQL si no existe
    try {
      const { data: existingUser } = await pgClient.query(
        'SELECT user_id FROM users WHERE user_id = $1',
        [userId]
      );

      if (!existingUser || existingUser.length === 0) {
        console.log('🔄 [API] Creando usuario en PostgreSQL...');
        const { error: userError } = await pgClient.query(
          'INSERT INTO users (user_id, username, email, role, created_at) VALUES ($1, $2, $3, $4, $5)',
          [userId, 'dev_user', 'dev@gestagent.local', 'admin', new Date().toISOString()]
        );

        if (userError) {
          console.warn('⚠️ [API] Error creando usuario:', userError);
        } else {
          console.log('✅ [API] Usuario creado exitosamente');
        }
      }
    } catch (userCheckError) {
      console.warn('⚠️ [API] Error verificando usuario:', userCheckError);
    }

    // Insertar documento en PostgreSQL
    try {
             const documentData = {
         job_id: result.jobId,
         document_type: documentType,
         raw_json: {}, // No aplicable para Document Understanding
         processed_json: result.extracted_data,
         upload_timestamp: new Date().toISOString(),
         user_id: userId,
         status: 'completed',
         version: 6,
         
         // Campos denormalizados
         emitter_name: Array.isArray(result.extracted_data) 
           ? result.extracted_data[0]?.supplier?.name || undefined
           : result.extracted_data?.supplier?.name || undefined,
         receiver_name: Array.isArray(result.extracted_data)
           ? result.extracted_data[0]?.customer?.name || undefined  
           : result.extracted_data?.customer?.name || undefined,
         document_date: document_date || undefined,
         
         title: `${documentType}_${result.jobId}`,
         file_path: filePath
       };

      const { data: dbData, error: dbError } = await pgClient.insertDocument(documentData);

      if (dbError) {
        console.error('❌ [API] Error guardando en PostgreSQL:', dbError);
        return NextResponse.json({
          success: false,
          error: 'Error guardando en base de datos',
          error_code: 'DATABASE_ERROR',
          details: dbError.message
        }, { status: 500 });
      } else {
        console.log(`✅ [API] Guardado en PostgreSQL exitosamente`);
        
        // AUDITORÍA: Registrar creación exitosa del documento
        await AuditService.logDocumentCreate(
          userId,
          result.jobId,
          {
            document_type: documentType,
            title: `${documentType}_${result.jobId}`,
            file_path: filePath,
            emitter_name: Array.isArray(result.extracted_data) 
              ? result.extracted_data[0]?.supplier?.name || undefined
              : result.extracted_data?.supplier?.name || undefined,
            receiver_name: Array.isArray(result.extracted_data)
              ? result.extracted_data[0]?.customer?.name || undefined  
              : result.extracted_data?.customer?.name || undefined,
            total_amount,
            tax_amount
          },
          {
            req: request,
            requestId: request.headers.get('x-request-id') || undefined
          }
        );
      }
    } catch (dbError) {
      console.error('❌ [API] Error de conexión a PostgreSQL:', dbError);
      return NextResponse.json({
        success: false,
        error: 'Error de conexión a base de datos',
        error_code: 'DATABASE_CONNECTION_ERROR'
      }, { status: 500 });
    }

    // Respuesta exitosa
    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      document_url: filePath,
      extracted_data: result.extracted_data,
      processing_metadata: {
        ...result.processing_metadata,
        api_version: '6.0.0',
        timestamp: new Date().toISOString(),
        user_id: userId,
        storage_method: 'postgresql_local',
        // Información de relaciones comerciales
        relations: {
          supplier_id,
          customer_id,
          operations: relationsOperations,
          total_amount,
          tax_amount
        }
      }
    });

  } catch (error: any) {
    console.error('❌ [API] Error general:', error);

    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      error_code: 'INTERNAL_ERROR',
      message: error?.message || 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
