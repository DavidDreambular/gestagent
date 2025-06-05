// Inyección de dependencias simplificada para la arquitectura DDD
import { SupabaseDocumentRepository } from "../infrastructure/repositories/supabase-document.repository"
import { SupabaseAuditLogRepository } from "../infrastructure/repositories/supabase-audit-log.repository"

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Verificar configuración crítica
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase configuration is missing. Please check your environment variables.')
}

// Instanciar repositorios
export const documentRepository = new SupabaseDocumentRepository(supabaseUrl, supabaseKey)
export const auditLogRepository = new SupabaseAuditLogRepository(supabaseUrl, supabaseKey)

console.log('[Dependencies] Dependencias básicas configuradas')
console.log('[Dependencies] Base de datos: Supabase') 