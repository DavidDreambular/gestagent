// Funciones para manejo de base de datos temporal
import fs from 'fs';
import path from 'path';

// Archivo para almacenamiento persistente
const TEMP_DB_FILE = path.join(process.cwd(), 'temp-documents.json');

// Función para leer documentos del archivo
export function readDocumentsFromFile(): Record<string, any> {
  try {
    if (fs.existsSync(TEMP_DB_FILE)) {
      const data = fs.readFileSync(TEMP_DB_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('⚠️ [TEMP-DB] Error leyendo archivo:', error);
  }
  return {};
}

// Función para escribir documentos al archivo
export function writeDocumentsToFile(documents: Record<string, any>) {
  try {
    fs.writeFileSync(TEMP_DB_FILE, JSON.stringify(documents, null, 2));
  } catch (error) {
    console.error('❌ [TEMP-DB] Error escribiendo archivo:', error);
  }
}

// Función auxiliar para agregar documentos a la base temporal
export function addDocumentToMockDB(jobId: string, documentData: any) {
  console.log(`💾 [MOCK-DB] Guardando documento con jobId: ${jobId}`);
  console.log(`💾 [MOCK-DB] Datos:`, { jobId, documentType: documentData.documentType });
  
  const documents = readDocumentsFromFile();
  documents[jobId] = {
    ...documentData,
    jobId,
    status: 'processed',
    uploadTimestamp: new Date().toISOString()
  };
  
  writeDocumentsToFile(documents);
  
  console.log(`✅ [MOCK-DB] Documento guardado. Total documentos: ${Object.keys(readDocumentsFromFile()).length}`);
  console.log(`📋 [MOCK-DB] Documentos existentes:`, Object.keys(readDocumentsFromFile()));
}

// Función auxiliar para obtener todos los documentos (para el dashboard)
export function getAllDocumentsFromMockDB() {
  return Object.values(readDocumentsFromFile());
} 