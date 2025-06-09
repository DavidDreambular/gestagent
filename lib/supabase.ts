// lib/supabase.ts - MIGRADO A POSTGRESQL
// Este archivo ahora exporta el cliente PostgreSQL en lugar de Supabase

import pgClient from './postgresql-client';

// Exportar cliente PostgreSQL con compatibilidad de interfaz Supabase
const supabase = pgClient;

export default supabase;