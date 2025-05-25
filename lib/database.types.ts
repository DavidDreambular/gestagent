// lib/database.types.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string | null
          email: string
          role: 'admin' | 'contable' | 'gestor' | 'operador' | 'supervisor'
          created_at: string
        }
        Insert: {
          id: string
          username?: string | null
          email: string
          role: 'admin' | 'contable' | 'gestor' | 'operador' | 'supervisor'
          created_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          email?: string
          role?: 'admin' | 'contable' | 'gestor' | 'operador' | 'supervisor'
          created_at?: string
        }
      }
      documents: {
        Row: {
          job_id: string
          document_type: 'factura' | 'nomina' | 'recibo' | 'extracto' | 'balance'
          raw_text: string | null
          raw_json: Json | null
          processed_json: Json | null
          upload_timestamp: string
          user_id: string
          status: 'processing' | 'validated' | 'error' | 'pending_review'
          version: string
          emitter_name: string | null
          receiver_name: string | null
          document_date: string | null
          title: string | null
          file_path: string | null
        }
        Insert: {
          job_id?: string
          document_type: 'factura' | 'nomina' | 'recibo' | 'extracto' | 'balance'
          raw_text?: string | null
          raw_json?: Json | null
          processed_json?: Json | null
          upload_timestamp?: string
          user_id: string
          status: 'processing' | 'validated' | 'error' | 'pending_review'
          version: string
          emitter_name?: string | null
          receiver_name?: string | null
          document_date?: string | null
          title?: string | null
          file_path?: string | null
        }
        Update: {
          job_id?: string
          document_type?: 'factura' | 'nomina' | 'recibo' | 'extracto' | 'balance'
          raw_text?: string | null
          raw_json?: Json | null
          processed_json?: Json | null
          upload_timestamp?: string
          user_id?: string
          status?: 'processing' | 'validated' | 'error' | 'pending_review'
          version?: string
          emitter_name?: string | null
          receiver_name?: string | null
          document_date?: string | null
          title?: string | null
          file_path?: string | null
        }
      }
      audit_logs: {
        Row: {
          log_id: string
          document_id: string | null
          user_id: string | null
          action: string
          timestamp: string
          details: Json | null
        }
        Insert: {
          log_id?: string
          document_id?: string | null
          user_id?: string | null
          action: string
          timestamp?: string
          details?: Json | null
        }
        Update: {
          log_id?: string
          document_id?: string | null
          user_id?: string | null
          action?: string
          timestamp?: string
          details?: Json | null
        }
      }
      migrations: {
        Row: {
          migration_id: number
          name: string
          applied_at: string
        }
        Insert: {
          migration_id?: number
          name: string
          applied_at?: string
        }
        Update: {
          migration_id?: number
          name?: string
          applied_at?: string
        }
      }
    }
  }
}