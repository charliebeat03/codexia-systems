export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.18' }
  public: {
    Tables: {
      activity_log: {
        Row: { id: number; actor_id: string | null; entity_type: string; entity_id: string | null; action: string; summary: string; created_at: string }
        Insert: { id?: never; actor_id?: string | null; entity_type: string; entity_id?: string | null; action: string; summary: string; created_at?: string }
        Update: { id?: never; actor_id?: string | null; entity_type?: string; entity_id?: string | null; action?: string; summary?: string; created_at?: string }
        Relationships: [{ foreignKeyName: 'activity_log_actor_id_fkey'; columns: ['actor_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }]
      }
      leads: {
        Row: { id: string; name: string; email: string; organization: string | null; service: string; budget: string | null; timing: string | null; details: string; features: string | null; status: string; source: string; assigned_to: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; name: string; email: string; organization?: string | null; service: string; budget?: string | null; timing?: string | null; details: string; features?: string | null; status?: string; source?: string; assigned_to?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; name?: string; email?: string; organization?: string | null; service?: string; budget?: string | null; timing?: string | null; details?: string; features?: string | null; status?: string; source?: string; assigned_to?: string | null; created_at?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: 'leads_assigned_to_fkey'; columns: ['assigned_to']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }]
      }
      profiles: {
        Row: { id: string; email: string; display_name: string; role: string; created_at: string; updated_at: string }
        Insert: { id: string; email?: string; display_name?: string; role?: string; created_at?: string; updated_at?: string }
        Update: { id?: string; email?: string; display_name?: string; role?: string; created_at?: string; updated_at?: string }
        Relationships: []
      }
      project_documents: {
        Row: { id: string; project_id: string; uploaded_by: string | null; storage_path: string; file_name: string; content_type: string | null; visibility: string; created_at: string }
        Insert: { id?: string; project_id: string; uploaded_by?: string | null; storage_path: string; file_name: string; content_type?: string | null; visibility?: string; created_at?: string }
        Update: { id?: string; project_id?: string; uploaded_by?: string | null; storage_path?: string; file_name?: string; content_type?: string | null; visibility?: string; created_at?: string }
        Relationships: [
          { foreignKeyName: 'project_documents_project_id_fkey'; columns: ['project_id']; isOneToOne: false; referencedRelation: 'projects'; referencedColumns: ['id'] },
          { foreignKeyName: 'project_documents_uploaded_by_fkey'; columns: ['uploaded_by']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        ]
      }
      project_updates: {
        Row: { id: string; project_id: string; author_id: string | null; title: string; body: string; visibility: string; created_at: string }
        Insert: { id?: string; project_id: string; author_id?: string | null; title: string; body: string; visibility?: string; created_at?: string }
        Update: { id?: string; project_id?: string; author_id?: string | null; title?: string; body?: string; visibility?: string; created_at?: string }
        Relationships: [
          { foreignKeyName: 'project_updates_author_id_fkey'; columns: ['author_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'project_updates_project_id_fkey'; columns: ['project_id']; isOneToOne: false; referencedRelation: 'projects'; referencedColumns: ['id'] },
        ]
      }
      projects: {
        Row: { id: string; client_id: string | null; name: string; summary: string; status: string; progress: number; start_date: string | null; target_date: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; client_id?: string | null; name: string; summary?: string; status?: string; progress?: number; start_date?: string | null; target_date?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; client_id?: string | null; name?: string; summary?: string; status?: string; progress?: number; start_date?: string | null; target_date?: string | null; created_at?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: 'projects_client_id_fkey'; columns: ['client_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }]
      }
    }
    Views: Record<string, never>
    Functions: {
      consume_contact_rate_limit: { Args: { p_ip_hash: string; p_now?: string; p_cooldown_seconds?: number }; Returns: boolean }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type TableRow<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
