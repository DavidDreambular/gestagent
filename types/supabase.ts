// Tipos de base de datos de Supabase
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
          user_id: string
          username: string
          email: string
          role: string
          created_at: string
        }
        Insert: {
          user_id: string
          username: string
          email: string
          role?: string
          created_at?: string
        }
        Update: {
          user_id?: string
          username?: string
          email?: string
          role?: string
          created_at?: string
        }
      }
      documents: {
        Row: {
          job_id: string
          document_type: string
          raw_text: string | null
          processed_json: Json | null
          upload_timestamp: string
          user_id: string
          status: string
          version: number
          emitter_name: string | null
          receiver_name: string | null
          document_date: string | null
          title: string | null
          file_name: string | null
          metadata: Json | null
        }
        Insert: {
          job_id: string
          document_type: string
          raw_text?: string | null
          processed_json?: Json | null
          upload_timestamp?: string
          user_id: string
          status?: string
          version?: number
          emitter_name?: string | null
          receiver_name?: string | null
          document_date?: string | null
          title?: string | null
          file_name?: string | null
          metadata?: Json | null
        }
        Update: {
          job_id?: string
          document_type?: string
          raw_text?: string | null
          processed_json?: Json | null
          upload_timestamp?: string
          user_id?: string
          status?: string
          version?: number
          emitter_name?: string | null
          receiver_name?: string | null
          document_date?: string | null
          title?: string | null
          file_name?: string | null
          metadata?: Json | null
        }
      }
      audit_logs: {
        Row: {
          log_id: string
          document_id: string | null
          user_id: string
          action: string
          timestamp: string
          details: Json | null
        }
        Insert: {
          log_id: string
          document_id?: string | null
          user_id: string
          action: string
          timestamp?: string
          details?: Json | null
        }
        Update: {
          log_id?: string
          document_id?: string | null
          user_id?: string
          action?: string
          timestamp?: string
          details?: Json | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
