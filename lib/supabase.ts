// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

// Obtener variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Verificar que las variables estén definidas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Faltan variables de entorno para Supabase. Asegúrate de definir NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en tu archivo .env.local');
}

// Crear cliente de Supabase
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export default supabase;