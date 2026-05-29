// Auto-generated Supabase types
// You can regenerate these by running: supabase gen types typescript --local

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
      groups: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
          user_id?: string
        }
      }
      members: {
        Row: {
          id: string
          group_id: string
          name: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          name: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          name?: string
          avatar_url?: string | null
          created_at?: string
        }
      }
      bills: {
        Row: {
          id: string
          group_id: string
          title: string
          amount: number
          paid_by: string
          created_at: string
          settled: boolean
        }
        Insert: {
          id?: string
          group_id: string
          title: string
          amount: number
          paid_by: string
          created_at?: string
          settled?: boolean
        }
        Update: {
          id?: string
          group_id?: string
          title?: string
          amount?: number
          paid_by?: string
          created_at?: string
          settled?: boolean
        }
      }
      bill_splits: {
        Row: {
          id: string
          bill_id: string
          member_id: string
          amount: number
        }
        Insert: {
          id?: string
          bill_id: string
          member_id: string
          amount: number
        }
        Update: {
          id?: string
          bill_id?: string
          member_id?: string
          amount?: number
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
