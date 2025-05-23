export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string | null
          price: number | null
          product_data: Json | null
          product_name: string
          quantity: number
          shopify_line_item_id: number | null
          sku: string | null
          variant_title: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          price?: number | null
          product_data?: Json | null
          product_name: string
          quantity: number
          shopify_line_item_id?: number | null
          sku?: string | null
          variant_title?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          price?: number | null
          product_data?: Json | null
          product_name?: string
          quantity?: number
          shopify_line_item_id?: number | null
          sku?: string | null
          variant_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          id: string
          order_date: string | null
          order_number: string
          raw_data: Json
          shopify_order_id: number
          status: string | null
          synced_at: string | null
          total_price: number | null
        }
        Insert: {
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          order_date?: string | null
          order_number: string
          raw_data: Json
          shopify_order_id: number
          status?: string | null
          synced_at?: string | null
          total_price?: number | null
        }
        Update: {
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          order_date?: string | null
          order_number?: string
          raw_data?: Json
          shopify_order_id?: number
          status?: string | null
          synced_at?: string | null
          total_price?: number | null
        }
        Relationships: []
      }
      qc_results: {
        Row: {
          created_at: string | null
          id: string
          inspector_notes: string | null
          overall_status: string
          results: Json
          task_id: string | null
          template_id: string | null
          worker_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          inspector_notes?: string | null
          overall_status: string
          results: Json
          task_id?: string | null
          template_id?: string | null
          worker_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          inspector_notes?: string | null
          overall_status?: string
          results?: Json
          task_id?: string | null
          template_id?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qc_results_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "work_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qc_results_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "qc_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qc_results_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      qc_templates: {
        Row: {
          checklist_items: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          task_type: string
        }
        Insert: {
          checklist_items: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          task_type: string
        }
        Update: {
          checklist_items?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          task_type?: string
        }
        Relationships: []
      }
      work_logs: {
        Row: {
          created_at: string | null
          id: string
          log_type: string
          notes: string | null
          task_id: string | null
          time_spent_minutes: number | null
          worker_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          log_type: string
          notes?: string | null
          task_id?: string | null
          time_spent_minutes?: number | null
          worker_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          log_type?: string
          notes?: string | null
          task_id?: string | null
          time_spent_minutes?: number | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "work_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_logs_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      work_tasks: {
        Row: {
          actual_hours: number | null
          assigned_by_id: string | null
          assigned_to_id: string | null
          completed_at: string | null
          created_at: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          notes: string | null
          order_item_id: string | null
          priority: string | null
          started_at: string | null
          status: string | null
          task_description: string | null
          task_type: string
          updated_at: string | null
        }
        Insert: {
          actual_hours?: number | null
          assigned_by_id?: string | null
          assigned_to_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          notes?: string | null
          order_item_id?: string | null
          priority?: string | null
          started_at?: string | null
          status?: string | null
          task_description?: string | null
          task_type: string
          updated_at?: string | null
        }
        Update: {
          actual_hours?: number | null
          assigned_by_id?: string | null
          assigned_to_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          notes?: string | null
          order_item_id?: string | null
          priority?: string | null
          started_at?: string | null
          status?: string | null
          task_description?: string | null
          task_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_tasks_assigned_by_id_fkey"
            columns: ["assigned_by_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_tasks_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_tasks_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          name: string
          role: string | null
          skills: string[] | null
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          name: string
          role?: string | null
          skills?: string[] | null
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string
          role?: string | null
          skills?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: string
          key: string
          value: Json
          encrypted: boolean | null
          created_at: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          key: string
          value: Json
          encrypted?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          encrypted?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          }
        ]
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
