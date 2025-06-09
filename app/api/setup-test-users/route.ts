// app/api/setup-test-users/route.ts
// Versión 2.0.0 - Migrado a PostgreSQL
// Endpoint para crear usuarios de prueba en la base de datos

import { NextRequest, NextResponse } from 'next/server';
import { PostgreSQLClient } from '@/lib/postgresql-client';

// Inicializar cliente PostgreSQL
const pgClient = new PostgreSQLClient();

const testUsers = [
  {
    email: 'admin@test.com',
    username: 'Admin Principal',
    role: 'admin'
  },
  {
    email: 'supervisor@test.com', 
    username: 'Supervisor Gestoría',
    role: 'supervisor'
  },
  {
    email: 'contable@test.com',
    username: 'Contable Principal',
    role: 'contable'
  },
  {
    email: 'gestor@test.com',
    username: 'Gestor Clientes',
    role: 'gestor'
  },
  {
    email: 'operador@test.com',
    username: 'Operador Sistema',
    role: 'user' // Cambio operador por user ya que no existe el rol
  }
];

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 [Setup Users] Iniciando creación de usuarios de prueba...');
    
    const results = [];
    
    for (const user of testUsers) {
      console.log(`📝 [Setup Users] Creando usuario: ${user.email}`);
      
      try {
        // Insertar en tabla users (PostgreSQL maneja automáticamente el UUID)
        const result = await pgClient.query(`
          INSERT INTO users (username, email, role)
          VALUES ($1, $2, $3)
          ON CONFLICT (email) DO UPDATE SET
            username = EXCLUDED.username,
            role = EXCLUDED.role,
            updated_at = NOW()
          RETURNING user_id, username, email, role, created_at
        `, [user.username, user.email, user.role]);
        
        if (result.error) {
          console.error(`❌ [Setup Users] Error insertando usuario ${user.email}:`, result.error.message);
          results.push({
            email: user.email,
            success: false,
            error: result.error.message
          });
        } else {
          console.log(`✅ [Setup Users] Usuario creado exitosamente: ${user.email}`);
          results.push({
            email: user.email,
            success: true,
            data: result.data?.[0]
          });
        }
      } catch (err: any) {
        console.error(`❌ [Setup Users] Error inesperado con ${user.email}:`, err);
        results.push({
          email: user.email,
          success: false,
          error: err.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;
    
    console.log(`🏁 [Setup Users] Proceso completado: ${successCount} éxitos, ${errorCount} errores`);
    
    return NextResponse.json({
      success: successCount > 0,
      message: `Usuarios de prueba creados: ${successCount}/${testUsers.length}`,
      summary: {
        total: testUsers.length,
        success: successCount,
        errors: errorCount
      },
      results
    });
    
  } catch (error: any) {
    console.error('❌ [Setup Users] Error inesperado:', error);
    return NextResponse.json({
      success: false,
      error: 'Error inesperado al crear usuarios de prueba',
      details: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    console.log('🔍 [Setup Users] Obteniendo lista de usuarios...');
    
    const result = await pgClient.query(`
      SELECT user_id, username, email, role, created_at, updated_at
      FROM users
      ORDER BY created_at
    `);
    
    if (result.error) {
      return NextResponse.json({
        success: false,
        error: 'Error obteniendo usuarios',
        details: result.error.message
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      users: result.data || [],
      total: result.data?.length || 0
    });
    
  } catch (error: any) {
    console.error('❌ [Setup Users] Error obteniendo usuarios:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 });
  }
} 