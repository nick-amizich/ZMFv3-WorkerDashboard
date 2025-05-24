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
      custom_stages: {
        Row: {
          created_at: string | null
          created_by_id: string | null
          default_estimated_hours: number | null
          description: string | null
          id: string
          is_active: boolean | null
          required_skills: string[] | null
          stage_code: string
          stage_name: string
        }
        Insert: {
          created_at?: string | null
          created_by_id?: string | null
          default_estimated_hours?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          required_skills?: string[] | null
          stage_code: string
          stage_name: string
        }
        Update: {
          created_at?: string | null
          created_by_id?: string | null
          default_estimated_hours?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          required_skills?: string[] | null
          stage_code?: string
          stage_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_stages_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          headphone_color: string | null
          headphone_material: string | null
          id: string
          order_id: string | null
          price: number | null
          product_category: string | null
          product_data: Json | null
          product_name: string
          quantity: number
          requires_custom_work: boolean | null
          shopify_line_item_id: number | null
          sku: string | null
          variant_title: string | null
        }
        Insert: {
          created_at?: string | null
          headphone_color?: string | null
          headphone_material?: string | null
          id?: string
          order_id?: string | null
          price?: number | null
          product_category?: string | null
          product_data?: Json | null
          product_name: string
          quantity: number
          requires_custom_work?: boolean | null
          shopify_line_item_id?: number | null
          sku?: string | null
          variant_title?: string | null
        }
        Update: {
          created_at?: string | null
          headphone_color?: string | null
          headphone_material?: string | null
          id?: string
          order_id?: string | null
          price?: number | null
          product_category?: string | null
          product_data?: Json | null
          product_name?: string
          quantity?: number
          requires_custom_work?: boolean | null
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
      production_issues: {
        Row: {
          batch_id: string | null
          created_at: string | null
          description: string
          id: string
          image_urls: string[] | null
          issue_type: string
          order_item_id: string | null
          reported_by_id: string
          resolution_notes: string | null
          resolution_status: string | null
          resolved_at: string | null
          resolved_by_id: string | null
          severity: string
          slack_thread_id: string | null
          stage: string
          task_id: string | null
          title: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          image_urls?: string[] | null
          issue_type: string
          order_item_id?: string | null
          reported_by_id: string
          resolution_notes?: string | null
          resolution_status?: string | null
          resolved_at?: string | null
          resolved_by_id?: string | null
          severity: string
          slack_thread_id?: string | null
          stage: string
          task_id?: string | null
          title: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          image_urls?: string[] | null
          issue_type?: string
          order_item_id?: string | null
          reported_by_id?: string
          resolution_notes?: string | null
          resolution_status?: string | null
          resolved_at?: string | null
          resolved_by_id?: string | null
          severity?: string
          slack_thread_id?: string | null
          stage?: string
          task_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_issues_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "work_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_issues_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "headphone_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_issues_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_issues_reported_by_id_fkey"
            columns: ["reported_by_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_issues_resolved_by_id_fkey"
            columns: ["resolved_by_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_issues_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "work_tasks"
            referencedColumns: ["id"]
          },
        ]
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
      settings: {
        Row: {
          created_at: string | null
          encrypted: boolean | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          encrypted?: boolean | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          encrypted?: boolean | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_transitions: {
        Row: {
          batch_id: string | null
          from_stage: string | null
          id: string
          notes: string | null
          order_item_id: string | null
          to_stage: string
          transition_time: string | null
          transition_type: string | null
          transitioned_by_id: string | null
          workflow_template_id: string | null
        }
        Insert: {
          batch_id?: string | null
          from_stage?: string | null
          id?: string
          notes?: string | null
          order_item_id?: string | null
          to_stage: string
          transition_time?: string | null
          transition_type?: string | null
          transitioned_by_id?: string | null
          workflow_template_id?: string | null
        }
        Update: {
          batch_id?: string | null
          from_stage?: string | null
          id?: string
          notes?: string | null
          order_item_id?: string | null
          to_stage?: string
          transition_time?: string | null
          transition_type?: string | null
          transitioned_by_id?: string | null
          workflow_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stage_transitions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "work_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_transitions_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "headphone_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_transitions_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_transitions_transitioned_by_id_fkey"
            columns: ["transitioned_by_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_transitions_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      time_logs: {
        Row: {
          batch_id: string | null
          created_at: string | null
          duration_minutes: number | null
          end_time: string | null
          id: string
          notes: string | null
          stage: string
          start_time: string
          task_id: string | null
          worker_id: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          notes?: string | null
          stage: string
          start_time: string
          task_id?: string | null
          worker_id: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          notes?: string | null
          stage?: string
          start_time?: string
          task_id?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_logs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "work_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "work_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_logs_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      work_batches: {
        Row: {
          batch_type: string
          created_at: string | null
          criteria: Json
          current_stage: string | null
          id: string
          name: string
          order_item_ids: string[]
          status: string | null
          updated_at: string | null
          workflow_template_id: string | null
        }
        Insert: {
          batch_type: string
          created_at?: string | null
          criteria: Json
          current_stage?: string | null
          id?: string
          name: string
          order_item_ids: string[]
          status?: string | null
          updated_at?: string | null
          workflow_template_id?: string | null
        }
        Update: {
          batch_type?: string
          created_at?: string | null
          criteria?: Json
          current_stage?: string | null
          id?: string
          name?: string
          order_item_ids?: string[]
          status?: string | null
          updated_at?: string | null
          workflow_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_batches_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
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
          auto_generated: boolean | null
          batch_id: string | null
          completed_at: string | null
          created_at: string | null
          depends_on_task_ids: string[] | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          manual_assignment: boolean | null
          notes: string | null
          order_item_id: string | null
          priority: string | null
          stage: string | null
          started_at: string | null
          status: string | null
          task_description: string | null
          task_type: string
          updated_at: string | null
          workflow_template_id: string | null
        }
        Insert: {
          actual_hours?: number | null
          assigned_by_id?: string | null
          assigned_to_id?: string | null
          auto_generated?: boolean | null
          batch_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          depends_on_task_ids?: string[] | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          manual_assignment?: boolean | null
          notes?: string | null
          order_item_id?: string | null
          priority?: string | null
          stage?: string | null
          started_at?: string | null
          status?: string | null
          task_description?: string | null
          task_type: string
          updated_at?: string | null
          workflow_template_id?: string | null
        }
        Update: {
          actual_hours?: number | null
          assigned_by_id?: string | null
          assigned_to_id?: string | null
          auto_generated?: boolean | null
          batch_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          depends_on_task_ids?: string[] | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          manual_assignment?: boolean | null
          notes?: string | null
          order_item_id?: string | null
          priority?: string | null
          stage?: string | null
          started_at?: string | null
          status?: string | null
          task_description?: string | null
          task_type?: string
          updated_at?: string | null
          workflow_template_id?: string | null
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
            foreignKeyName: "work_tasks_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "work_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_tasks_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "headphone_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_tasks_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_tasks_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_stage_assignments: {
        Row: {
          assigned_by_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          skill_level: string | null
          stage: string
          worker_id: string
        }
        Insert: {
          assigned_by_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          skill_level?: string | null
          stage: string
          worker_id: string
        }
        Update: {
          assigned_by_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          skill_level?: string | null
          stage?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_stage_assignments_assigned_by_id_fkey"
            columns: ["assigned_by_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_stage_assignments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
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
      workflow_execution_log: {
        Row: {
          action: string
          action_details: Json | null
          batch_id: string | null
          created_at: string | null
          executed_by_id: string | null
          execution_type: string
          id: string
          order_item_id: string | null
          stage: string
          workflow_template_id: string | null
        }
        Insert: {
          action: string
          action_details?: Json | null
          batch_id?: string | null
          created_at?: string | null
          executed_by_id?: string | null
          execution_type: string
          id?: string
          order_item_id?: string | null
          stage: string
          workflow_template_id?: string | null
        }
        Update: {
          action?: string
          action_details?: Json | null
          batch_id?: string | null
          created_at?: string | null
          executed_by_id?: string | null
          execution_type?: string
          id?: string
          order_item_id?: string | null
          stage?: string
          workflow_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_execution_log_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "work_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_execution_log_executed_by_id_fkey"
            columns: ["executed_by_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_execution_log_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "headphone_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_execution_log_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_execution_log_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          created_at: string | null
          created_by_id: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          stage_transitions: Json
          stages: Json
          trigger_rules: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          stage_transitions: Json
          stages: Json
          trigger_rules?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          stage_transitions?: Json
          stages?: Json
          trigger_rules?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_templates_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      headphone_order_items: {
        Row: {
          bundle_component: boolean | null
          cable_type: string | null
          color: string | null
          created_at: string | null
          custom_engraving: string | null
          customer_name: string | null
          headphone_color: string | null
          headphone_material: string | null
          id: string | null
          impedance: string | null
          material: string | null
          order_date: string | null
          order_id: string | null
          order_number: string | null
          order_status: string | null
          pad_type: string | null
          price: number | null
          product_category: string | null
          product_data: Json | null
          product_name: string | null
          quantity: number | null
          requires_custom_work: boolean | null
          shopify_line_item_id: number | null
          sku: string | null
          variant_title: string | null
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

// Custom type exports for common use cases
export type Worker = Tables<'workers'>
export type Order = Tables<'orders'>
export type OrderItem = Tables<'order_items'>
export type WorkTask = Tables<'work_tasks'>
export type WorkBatch = Tables<'work_batches'>
export type WorkflowTemplate = Tables<'workflow_templates'>
export type TimeLog = Tables<'time_logs'>
export type ProductionIssue = Tables<'production_issues'>
export type StageTransition = Tables<'stage_transitions'>
export type QCResult = Tables<'qc_results'>
export type QCTemplate = Tables<'qc_templates'>
export type WorkerStageAssignment = Tables<'worker_stage_assignments'>
export type CustomStage = Tables<'custom_stages'>
export type WorkflowExecutionLog = Tables<'workflow_execution_log'>
export type Setting = Tables<'settings'>
export type WorkLog = Tables<'work_logs'>

// Insert types
export type WorkerInsert = TablesInsert<'workers'>
export type OrderInsert = TablesInsert<'orders'>
export type OrderItemInsert = TablesInsert<'order_items'>
export type WorkTaskInsert = TablesInsert<'work_tasks'>
export type WorkBatchInsert = TablesInsert<'work_batches'>
export type WorkflowTemplateInsert = TablesInsert<'workflow_templates'>
export type TimeLogInsert = TablesInsert<'time_logs'>
export type ProductionIssueInsert = TablesInsert<'production_issues'>
export type StageTransitionInsert = TablesInsert<'stage_transitions'>

// Update types
export type WorkerUpdate = TablesUpdate<'workers'>
export type OrderUpdate = TablesUpdate<'orders'>
export type OrderItemUpdate = TablesUpdate<'order_items'>
export type WorkTaskUpdate = TablesUpdate<'work_tasks'>
export type WorkBatchUpdate = TablesUpdate<'work_batches'>
export type WorkflowTemplateUpdate = TablesUpdate<'workflow_templates'>
export type TimeLogUpdate = TablesUpdate<'time_logs'>
export type ProductionIssueUpdate = TablesUpdate<'production_issues'>
export type StageTransitionUpdate = TablesUpdate<'stage_transitions'>
