// Sistema de autenticación basado en PostgreSQL
// /lib/auth-postgresql.ts
// Reemplaza completamente a Supabase Auth

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PostgreSQLClient } from './postgresql-client';

const pgClient = new PostgreSQLClient();

// Tipos para autenticación
export interface User {
  user_id: string;
  username: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'contable' | 'gestor' | 'operador' | 'supervisor';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface AuthSession {
  user_id: string;
  username: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
}

export interface LoginResult {
  success: boolean;
  user?: AuthSession;
  error?: string;
}

export interface RegisterResult {
  success: boolean;
  user_id?: string;
  error?: string;
}

// Servicio de autenticación
export class AuthService {
  private jwtSecret: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'gestagent-secret-key-change-in-production';
  }

  /**
   * Registrar nuevo usuario
   */
  async register(
    email: string, 
    password: string, 
    username: string, 
    role: User['role'] = 'operador'
  ): Promise<RegisterResult> {
    try {
      // Verificar si el email ya existe
      const existingUserQuery = `SELECT user_id FROM users WHERE email = $1`;
      const existingUser = await pgClient.query<{ user_id: string }>(existingUserQuery, [email]);

      if (existingUser.data && existingUser.data.length > 0) {
        return {
          success: false,
          error: 'El email ya está registrado'
        };
      }

      // Hash de la contraseña
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Generar UUID para el usuario
      const userId = crypto.randomUUID();

      // Insertar nuevo usuario
      const insertQuery = `
        INSERT INTO users (user_id, username, email, password_hash, role, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING user_id
      `;

      const result = await pgClient.query<{ user_id: string }>(insertQuery, [
        userId,
        username,
        email,
        passwordHash,
        role,
        true
      ]);

      if (result.error || !result.data || result.data.length === 0) {
        return {
          success: false,
          error: 'Error creando el usuario'
        };
      }

      console.log(`✅ [AUTH] Usuario registrado: ${email} (${role})`);

      return {
        success: true,
        user_id: result.data[0].user_id
      };

    } catch (error) {
      console.error('❌ [AUTH] Error en registro:', error);
      return {
        success: false,
        error: 'Error interno del servidor'
      };
    }
  }

  /**
   * Iniciar sesión
   */
  async login(email: string, password: string): Promise<LoginResult> {
    try {
      // Buscar usuario por email
      const userQuery = `
        SELECT user_id, username, email, password_hash, role, is_active
        FROM users 
        WHERE email = $1
      `;

      const result = await pgClient.query<{
        user_id: string;
        username: string;
        email: string;
        password_hash: string;
        role: string;
        is_active: boolean;
      }>(userQuery, [email]);

      if (result.error || !result.data || result.data.length === 0) {
        return {
          success: false,
          error: 'Credenciales inválidas'
        };
      }

      const user = result.data[0];

      // Verificar si el usuario está activo
      if (!user.is_active) {
        return {
          success: false,
          error: 'Usuario desactivado'
        };
      }

      // Verificar contraseña
      const passwordValid = await bcrypt.compare(password, user.password_hash);
      if (!passwordValid) {
        return {
          success: false,
          error: 'Credenciales inválidas'
        };
      }

      // Actualizar último login
      await this.updateLastLogin(user.user_id);

      // Generar JWT token
      const token = this.generateToken(user);

      console.log(`✅ [AUTH] Login exitoso: ${email}`);

      return {
        success: true,
        user: {
          user_id: user.user_id,
          username: user.username,
          email: user.email,
          role: user.role,
          token,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 horas
        }
      };

    } catch (error) {
      console.error('❌ [AUTH] Error en login:', error);
      return {
        success: false,
        error: 'Error interno del servidor'
      };
    }
  }

  /**
   * Verificar token JWT
   */
  async verifyToken(token: string): Promise<{ valid: boolean; user?: any; error?: string }> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      
      // Verificar que el usuario sigue activo
      const userQuery = `
        SELECT user_id, username, email, role, is_active
        FROM users 
        WHERE user_id = $1 AND is_active = true
      `;

      const result = await pgClient.query<{
        user_id: string;
        username: string;
        email: string;
        role: string;
        is_active: boolean;
      }>(userQuery, [decoded.user_id]);

      if (result.error || !result.data || result.data.length === 0) {
        return {
          valid: false,
          error: 'Usuario no encontrado o inactivo'
        };
      }

      return {
        valid: true,
        user: result.data[0]
      };

    } catch (error) {
      console.error('❌ [AUTH] Error verificando token:', error);
      return {
        valid: false,
        error: 'Token inválido'
      };
    }
  }

  /**
   * Cambiar contraseña
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Obtener hash actual
      const userQuery = `SELECT password_hash FROM users WHERE user_id = $1`;
      const result = await pgClient.query<{ password_hash: string }>(userQuery, [userId]);

      if (result.error || !result.data || result.data.length === 0) {
        return {
          success: false,
          error: 'Usuario no encontrado'
        };
      }

      // Verificar contraseña actual
      const passwordValid = await bcrypt.compare(currentPassword, result.data[0].password_hash);
      if (!passwordValid) {
        return {
          success: false,
          error: 'Contraseña actual incorrecta'
        };
      }

      // Hash de la nueva contraseña
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Actualizar contraseña
      const updateQuery = `
        UPDATE users 
        SET password_hash = $1, updated_at = NOW()
        WHERE user_id = $2
      `;

      await pgClient.query(updateQuery, [newPasswordHash, userId]);

      console.log(`✅ [AUTH] Contraseña cambiada para usuario: ${userId}`);

      return { success: true };

    } catch (error) {
      console.error('❌ [AUTH] Error cambiando contraseña:', error);
      return {
        success: false,
        error: 'Error interno del servidor'
      };
    }
  }

  /**
   * Obtener información del usuario
   */
  async getUserById(userId: string): Promise<{ user?: User; error?: string }> {
    try {
      const userQuery = `
        SELECT user_id, username, email, role, is_active, created_at, updated_at, last_login
        FROM users 
        WHERE user_id = $1
      `;

      const result = await pgClient.query<User>(userQuery, [userId]);

      if (result.error || !result.data || result.data.length === 0) {
        return { error: 'Usuario no encontrado' };
      }

      return { user: result.data[0] };

    } catch (error) {
      console.error('❌ [AUTH] Error obteniendo usuario:', error);
      return { error: 'Error interno del servidor' };
    }
  }

  /**
   * Activar/Desactivar usuario
   */
  async toggleUserStatus(userId: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      const updateQuery = `
        UPDATE users 
        SET is_active = $1, updated_at = NOW()
        WHERE user_id = $2
      `;

      await pgClient.query(updateQuery, [isActive, userId]);

      console.log(`✅ [AUTH] Usuario ${isActive ? 'activado' : 'desactivado'}: ${userId}`);

      return { success: true };

    } catch (error) {
      console.error('❌ [AUTH] Error cambiando estado de usuario:', error);
      return {
        success: false,
        error: 'Error interno del servidor'
      };
    }
  }

  /**
   * Generar token JWT
   */
  private generateToken(user: any): string {
    const payload = {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 horas
    };

    return jwt.sign(payload, this.jwtSecret);
  }

  /**
   * Actualizar último login
   */
  private async updateLastLogin(userId: string): Promise<void> {
    try {
      const updateQuery = `
        UPDATE users 
        SET last_login = NOW(), updated_at = NOW()
        WHERE user_id = $1
      `;

      await pgClient.query(updateQuery, [userId]);
    } catch (error) {
      console.error('❌ [AUTH] Error actualizando último login:', error);
    }
  }
}

// Instancia singleton del servicio de autenticación
export const authService = new AuthService();