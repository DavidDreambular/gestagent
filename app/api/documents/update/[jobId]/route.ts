// API Route para actualizar datos de un documento específico
// /app/api/documents/update/[jobId]/route.ts
// PUT: Actualiza los datos extraídos de un documento

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// Archivo para almacenamiento persistente
const TEMP_DB_FILE = path.join(process.cwd(), 'temp-documents.json');

// Configurar Supabase
let supabase: any = null;
try {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
} catch (error) {
  console.warn('⚠️ [UPDATE] Supabase no configurado');
}

// Función para leer documentos del archivo
function readDocumentsFromFile(): Record<string, any> {
  try {
    if (fs.existsSync(TEMP_DB_FILE)) {
      const data = fs.readFileSync(TEMP_DB_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('⚠️ [UPDATE] Error leyendo archivo:', error);
  }
  return {};
}

// Función para escribir documentos al archivo
function writeDocumentsToFile(documents: Record<string, any>) {
  try {
    fs.writeFileSync(TEMP_DB_FILE, JSON.stringify(documents, null, 2));
  } catch (error) {
    console.error('❌ [UPDATE] Error escribiendo archivo:', error);
  }
}

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
    
    return null;
  } catch (error) {
    console.warn('⚠️ [UPDATE] Error convirtiendo fecha:', dateString, error);
    return null;
  }
}

// Handler PUT - Actualizar datos de un documento
export async function PUT(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const body = await request.json();
    const { extractedData, updateType = 'complete' } = body;

    console.log(`🔄 [UPDATE] Actualizando documento ${jobId} - Tipo: ${updateType}`);

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID es requerido' },
        { status: 400 }
      );
    }

    if (!extractedData) {
      return NextResponse.json(
        { error: 'Datos extraídos son requeridos' },
        { status: 400 }
      );
    }

    // 1. Actualizar en base temporal
    const tempDocuments = readDocumentsFromFile();
    
    if (!tempDocuments[jobId]) {
      return NextResponse.json(
        { error: 'Documento no encontrado en base temporal' },
        { status: 404 }
      );
    }

    // Actualizar datos extraídos
    tempDocuments[jobId].extracted_data = extractedData;
    tempDocuments[jobId].last_updated = new Date().toISOString();
    tempDocuments[jobId].updated_by = 'user_edit'; // Marcar como editado por usuario

    // Guardar en archivo temporal
    writeDocumentsToFile(tempDocuments);

    console.log(`✅ [UPDATE] Documento actualizado en base temporal`);

    // 2. Actualizar en Supabase (si está configurado)
    if (supabase) {
      try {
        // Extraer campos para actualización denormalizada
        let documentDate = null;
        if (Array.isArray(extractedData)) {
          documentDate = convertToISODate(extractedData[0]?.issue_date) || null;
        } else {
          documentDate = convertToISODate(extractedData?.issue_date) || null;
        }

        // Actualizar registro en Supabase
        const { error: updateError } = await supabase
          .from('documents')
          .update({
            processed_json: extractedData,
            document_date: documentDate,
            updated_at: new Date().toISOString(),
            version: tempDocuments[jobId].version ? tempDocuments[jobId].version + 1 : 6
          })
          .eq('job_id', jobId);

        if (updateError) {
          console.error('❌ [UPDATE] Error actualizando Supabase:', updateError);
          // No fallar si Supabase falla, al menos tenemos la base temporal actualizada
        } else {
          console.log(`✅ [UPDATE] Documento actualizado en Supabase`);
        }
      } catch (supabaseError) {
        console.error('❌ [UPDATE] Error conectando a Supabase:', supabaseError);
      }
    }

    // 3. Crear audit log si es necesario
    const auditLog = {
      action: 'document_updated',
      job_id: jobId,
      update_type: updateType,
      timestamp: new Date().toISOString(),
      changes_summary: updateType === 'field' ? 'Campo individual actualizado' : 'Documento completo actualizado'
    };

    console.log(`📝 [UPDATE] Audit log:`, auditLog);

    return NextResponse.json({
      success: true,
      message: 'Documento actualizado correctamente',
      jobId: jobId,
      updateType: updateType,
      timestamp: new Date().toISOString(),
      auditLog: auditLog
    }, { status: 200 });

  } catch (error) {
    console.error('❌ [UPDATE] Error en PUT /api/documents/update/[jobId]:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// Handler PATCH - Actualización parcial de campos específicos
export async function PATCH(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const body = await request.json();
    const { field, value, invoiceIndex = 0 } = body;

    console.log(`🔄 [PATCH] Actualizando campo ${field} del documento ${jobId} - Invoice ${invoiceIndex}`);

    if (!jobId || !field) {
      return NextResponse.json(
        { error: 'Job ID y campo son requeridos' },
        { status: 400 }
      );
    }

    // Leer documento actual
    const tempDocuments = readDocumentsFromFile();
    
    if (!tempDocuments[jobId]) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    let extractedData = tempDocuments[jobId].extracted_data;

    // Actualizar campo específico
    if (Array.isArray(extractedData)) {
      // Múltiples facturas
      if (extractedData[invoiceIndex]) {
        // Usar notación de punto para campos anidados (ej: "supplier.name")
        if (field.includes('.')) {
          const fieldParts = field.split('.');
          let current = extractedData[invoiceIndex];
          for (let i = 0; i < fieldParts.length - 1; i++) {
            if (!current[fieldParts[i]]) current[fieldParts[i]] = {};
            current = current[fieldParts[i]];
          }
          current[fieldParts[fieldParts.length - 1]] = value;
        } else {
          extractedData[invoiceIndex][field] = value;
        }
      }
    } else {
      // Factura única
      if (field.includes('.')) {
        const fieldParts = field.split('.');
        let current = extractedData;
        for (let i = 0; i < fieldParts.length - 1; i++) {
          if (!current[fieldParts[i]]) current[fieldParts[i]] = {};
          current = current[fieldParts[i]];
        }
        current[fieldParts[fieldParts.length - 1]] = value;
      } else {
        extractedData[field] = value;
      }
    }

    // Actualizar documento
    tempDocuments[jobId].extracted_data = extractedData;
    tempDocuments[jobId].last_updated = new Date().toISOString();
    tempDocuments[jobId].updated_by = 'user_edit';

    writeDocumentsToFile(tempDocuments);

    // Actualizar en Supabase si está disponible
    if (supabase) {
      try {
        const { error: updateError } = await supabase
          .from('documents')
          .update({
            processed_json: extractedData,
            updated_at: new Date().toISOString()
          })
          .eq('job_id', jobId);

        if (updateError) {
          console.warn('⚠️ [PATCH] Error actualizando Supabase:', updateError);
        }
      } catch (supabaseError) {
        console.warn('⚠️ [PATCH] Error conectando a Supabase:', supabaseError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Campo ${field} actualizado correctamente`,
      field: field,
      value: value,
      invoiceIndex: invoiceIndex,
      timestamp: new Date().toISOString()
    }, { status: 200 });

  } catch (error) {
    console.error('❌ [PATCH] Error en PATCH /api/documents/update/[jobId]:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 