// API Route para upload de documentos PDF - MODO MISTRAL DOCUMENT UNDERSTANDING
// /app/api/documents/upload/route.ts
// FLUJO CORRECTO: PDF → Supabase Storage → Mistral Document Understanding → Supabase DB

import { NextRequest, NextResponse } from 'next/server';
import { mistralDocumentProcessor } from '@/services/document-processor-mistral-correct';
import { addDocumentToMockDB } from '@/lib/mock-db';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { suppliersCustomersManager } from '@/services/suppliers-customers-manager';

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

// Configurar Supabase (opcional para desarrollo)
let supabase: any = null;
try {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
} catch (error) {
  console.warn('⚠️ [API] Supabase no configurado, usando base temporal');
}

// Configurar el límite de tamaño para archivos grandes
export const maxDuration = 180; // 3 minutos para procesamiento completo
export const dynamic = 'force-dynamic';

// Handler GET - Información del endpoint
export async function GET() {
  return NextResponse.json({
    message: "GestAgent - Upload & Processing API",
    version: "5.0.0 MISTRAL DOCUMENT UNDERSTANDING",
    description: "Procesa documentos PDF usando Mistral Document Understanding API",
    flow: "PDF → Supabase Storage → Mistral Document Understanding → JSON Estructurado → Supabase DB",
    model: "mistral-small-latest",
    provider: "Mistral AI",
    mode: "PRODUCTION_MISTRAL_DOCUMENT_UNDERSTANDING",
    features: [
      "✅ Procesamiento directo de PDF",
      "✅ Document Understanding nativo",
      "✅ Extracción estructurada en JSON",
      "✅ Soporte multilingüe (ES/CAT)",
      "✅ Storage en Supabase",
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
      supabase_configured: !!supabase,
      fallback_storage: "memoria temporal"
    }
  });
}

// Handler POST - Procesar documento
export async function POST(request: NextRequest) {
  console.log('\n🚀 [API] Iniciando procesamiento de documento');
  
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
    
    // Generar job ID único - usando UUID válido para Supabase
    const jobId = uuidv4();
    
    console.log(`🔄 [API] Iniciando procesamiento con Job ID: ${jobId}`);

    // Procesar con Mistral Document Understanding
    const result = await mistralDocumentProcessor.processDocument(
      pdfBuffer,
      documentType,
      jobId
    );

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
        total_amount = result.extracted_data.reduce((sum, invoice) => {
          return sum + (invoice.totals?.total || 0);
        }, 0);
        tax_amount = result.extracted_data.reduce((sum, invoice) => {
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

    // Guardar en base de datos temporal (siempre)
    try {
      addDocumentToMockDB(result.jobId, {
        documentType,
        document_url: result.document_url,
        extracted_data: result.extracted_data,
        processing_metadata: result.processing_metadata,
        user_id: userId,
        uploadTimestamp: new Date().toISOString(),
        // Nuevos campos de relaciones
        supplier_id,
        customer_id,
        relations_operations: relationsOperations
      });
      console.log(`✅ [API] Guardado en base temporal con Job ID: ${result.jobId}`);
    } catch (mockDbError) {
      console.error('❌ [API] Error guardando en base temporal:', mockDbError);
    }

    // Guardar en Supabase (si está configurado)
    if (supabase) {
      try {
        // Verificar/Crear usuario dummy si no existe
        const { data: existingUser } = await supabase
          .from('users')
          .select('user_id')
          .eq('user_id', userId)
          .single();

        if (!existingUser) {
          console.log('🔄 [API] Creando usuario dummy en Supabase...');
          const { error: userError } = await supabase
            .from('users')
            .insert({
              user_id: userId,
              username: 'dev_user',
              email: 'dev@gestagent.local',
              role: 'admin',
              created_at: new Date().toISOString()
            });

          if (userError) {
            console.warn('⚠️ [API] Error creando usuario dummy:', userError);
            // Intentar con rol básico si admin falla
            const { error: userError2 } = await supabase
              .from('users')
              .insert({
                user_id: userId,
                username: 'dev_user',
                email: 'dev@gestagent.local',
                role: 'user',
                created_at: new Date().toISOString()
              });
            
            if (userError2) {
              console.error('❌ [API] Error creando usuario con rol básico:', userError2);
            } else {
              console.log('✅ [API] Usuario creado con rol básico');
            }
          } else {
            console.log('✅ [API] Usuario dummy creado exitosamente');
          }
        }

        // Insertar documento con referencias a proveedores/clientes
        const documentData = {
          job_id: result.jobId,
          document_type: documentType,
          raw_json: {}, // No aplicable para Document Understanding
          processed_json: result.extracted_data,
          upload_timestamp: new Date().toISOString(),
          user_id: userId,
          status: 'completed',
          version: 5,
          
          // Referencias a suppliers y customers
          supplier_id: supplier_id || null,
          customer_id: customer_id || null,
          
          // Campos denormalizados (mantenemos para compatibilidad)
          emitter_name: Array.isArray(result.extracted_data) 
            ? result.extracted_data[0]?.supplier?.name || null
            : result.extracted_data?.supplier?.name || null,
          receiver_name: Array.isArray(result.extracted_data)
            ? result.extracted_data[0]?.customer?.name || null  
            : result.extracted_data?.customer?.name || null,
          document_date: document_date || null,
          total_amount: total_amount || null,
          tax_amount: tax_amount || null,
          
          title: `${documentType}_${result.jobId}`,
          file_path: result.document_url || null,
          processing_metadata: {
            ...result.processing_metadata,
            relations_operations: relationsOperations
          }
        };

        const { data: dbData, error: dbError } = await supabase
          .from('documents')
          .insert(documentData)
          .select()
          .single();

        if (dbError) {
          console.error('❌ [API] Error guardando en Supabase:', dbError);
          // No retornar error, solo log - el procesamiento fue exitoso
        } else {
          console.log(`✅ [API] Guardado en Supabase con ID: ${dbData?.id}`);
          console.log(`🏢 [API] Referencias: Proveedor=${supplier_id}, Cliente=${customer_id}`);
        }
      } catch (dbError) {
        console.error('❌ [API] Error de conexión a Supabase:', dbError);
        // Continuar sin error - el procesamiento fue exitoso
      }
    } else {
      console.log('ℹ️ [API] Supabase no configurado, usando solo base temporal');
    }

    // Respuesta exitosa
    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      document_url: result.document_url,
      extracted_data: result.extracted_data,
      processing_metadata: {
        ...result.processing_metadata,
        api_version: '5.0.0',
        timestamp: new Date().toISOString(),
        user_id: userId,
        storage_method: supabase ? 'supabase_and_temporal' : 'temporal_only',
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
