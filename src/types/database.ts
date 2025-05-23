/**
 * Generated Supabase types will go here
 * Run: npx supabase gen types typescript --project-id "$PROJECT_ID" > types/database.types.ts
 * 
 * This file serves as a placeholder until the database schema is set up
 */

export interface Database {
  public: {
    Tables: {
      employees: {
        Row: {
          id: string
          auth_user_id: string
          email: string
          first_name: string
          last_name: string
          role: 'worker' | 'supervisor' | 'manager'
          active: boolean
          skills: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_user_id: string
          email: string
          first_name: string
          last_name: string
          role: 'worker' | 'supervisor' | 'manager'
          active?: boolean
          skills?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auth_user_id?: string
          email?: string
          first_name?: string
          last_name?: string
          role?: 'worker' | 'supervisor' | 'manager'
          active?: boolean
          skills?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          shopify_order_id: number
          order_number: string
          customer_email: string
          customer_name: string
          total_price: number
          status: string
          raw_data: any
          synced_at: string
          created_at: string
        }
        Insert: {
          id?: string
          shopify_order_id: number
          order_number: string
          customer_email: string
          customer_name: string
          total_price: number
          status: string
          raw_data: any
          synced_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          shopify_order_id?: number
          order_number?: string
          customer_email?: string
          customer_name?: string
          total_price?: number
          status?: string
          raw_data?: any
          synced_at?: string
          created_at?: string
        }
      }
      work_tasks: {
        Row: {
          id: string
          order_item_id: string
          assigned_to_id: string
          status: 'pending' | 'in_progress' | 'completed' | 'on_hold'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          estimated_hours: number
          actual_hours: number
          started_at: string | null
          completed_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_item_id: string
          assigned_to_id: string
          status?: 'pending' | 'in_progress' | 'completed' | 'on_hold'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          estimated_hours: number
          actual_hours?: number
          started_at?: string | null
          completed_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_item_id?: string
          assigned_to_id?: string
          status?: 'pending' | 'in_progress' | 'completed' | 'on_hold'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          estimated_hours?: number
          actual_hours?: number
          started_at?: string | null
          completed_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}