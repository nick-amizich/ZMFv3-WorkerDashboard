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
      analytics_refresh_log: {
        Row: {
          duration_ms: number | null
          error_message: string | null
          id: string
          refresh_type: string
          refreshed_at: string | null
          status: string | null
        }
        Insert: {
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          refresh_type: string
          refreshed_at?: string | null
          status?: string | null
        }
        Update: {
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          refresh_type?: string
          refreshed_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      application_logs: {
        Row: {
          api_duration: number | null
          api_ip: string | null
          api_method: string | null
          api_status_code: number | null
          api_url: string | null
          api_user_agent: string | null
          context: string
          correlation_id: string | null
          created_at: string | null
          db_duration: number | null
          db_query: string | null
          db_row_count: number | null
          error_code: string | null
          error_message: string | null
          error_name: string | null
          error_stack: string | null
          id: string
          level: number
          memory_usage: number | null
          message: string
          metadata: Json | null
          performance_duration: number | null
          request_id: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          api_duration?: number | null
          api_ip?: string | null
          api_method?: string | null
          api_status_code?: number | null
          api_url?: string | null
          api_user_agent?: string | null
          context?: string
          correlation_id?: string | null
          created_at?: string | null
          db_duration?: number | null
          db_query?: string | null
          db_row_count?: number | null
          error_code?: string | null
          error_message?: string | null
          error_name?: string | null
          error_stack?: string | null
          id?: string
          level: number
          memory_usage?: number | null
          message: string
          metadata?: Json | null
          performance_duration?: number | null
          request_id?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          api_duration?: number | null
          api_ip?: string | null
          api_method?: string | null
          api_status_code?: number | null
          api_url?: string | null
          api_user_agent?: string | null
          context?: string
          correlation_id?: string | null
          created_at?: string | null
          db_duration?: number | null
          db_query?: string | null
          db_row_count?: number | null
          error_code?: string | null
          error_message?: string | null
          error_name?: string | null
          error_stack?: string | null
          id?: string
          level?: number
          memory_usage?: number | null
          message?: string
          metadata?: Json | null
          performance_duration?: number | null
          request_id?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      automation_execution_log: {
        Row: {
          actions_executed: Json | null
          conditions_evaluated: Json | null
          error_message: string | null
          executed_at: string | null
          execution_status: string
          id: string
          rule_id: string | null
          trigger_data: Json | null
          workflow_instance_id: string | null
        }
        Insert: {
          actions_executed?: Json | null
          conditions_evaluated?: Json | null
          error_message?: string | null
          executed_at?: string | null
          execution_status: string
          id?: string
          rule_id?: string | null
          trigger_data?: Json | null
          workflow_instance_id?: string | null
        }
        Update: {
          actions_executed?: Json | null
          conditions_evaluated?: Json | null
          error_message?: string | null
          executed_at?: string | null
          execution_status?: string
          id?: string
          rule_id?: string | null
          trigger_data?: Json | null
          workflow_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_execution_log_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_executions: {
        Row: {
          actions_executed: Json
          automation_rule_id: string | null
          batch_id: string | null
          conditions_evaluated: Json
          conditions_met: Json
          error_message: string | null
          executed_at: string | null
          execution_context: Json | null
          execution_status: string | null
          execution_time_ms: number | null
          id: string
          task_id: string | null
          trigger_data: Json
          workflow_template_id: string | null
        }
        Insert: {
          actions_executed: Json
          automation_rule_id?: string | null
          batch_id?: string | null
          conditions_evaluated: Json
          conditions_met: Json
          error_message?: string | null
          executed_at?: string | null
          execution_context?: Json | null
          execution_status?: string | null
          execution_time_ms?: number | null
          id?: string
          task_id?: string | null
          trigger_data: Json
          workflow_template_id?: string | null
        }
        Update: {
          actions_executed?: Json
          automation_rule_id?: string | null
          batch_id?: string | null
          conditions_evaluated?: Json
          conditions_met?: Json
          error_message?: string | null
          executed_at?: string | null
          execution_context?: Json | null
          execution_status?: string | null
          execution_time_ms?: number | null
          id?: string
          task_id?: string | null
          trigger_data?: Json
          workflow_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_executions_automation_rule_id_fkey"
            columns: ["automation_rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_executions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "current_production_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "automation_executions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "work_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_executions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "work_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_executions_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_bottlenecks"
            referencedColumns: ["workflow_template_id"]
          },
          {
            foreignKeyName: "automation_executions_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_daily_metrics"
            referencedColumns: ["workflow_template_id"]
          },
          {
            foreignKeyName: "automation_executions_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_metrics: {
        Row: {
          automation_rule_id: string | null
          average_execution_time_ms: number | null
          created_at: string | null
          date: string
          executions_count: number | null
          failed_executions: number | null
          id: string
          manual_interventions_saved: number | null
          successful_executions: number | null
          tasks_automated: number | null
          time_saved_hours: number | null
        }
        Insert: {
          automation_rule_id?: string | null
          average_execution_time_ms?: number | null
          created_at?: string | null
          date: string
          executions_count?: number | null
          failed_executions?: number | null
          id?: string
          manual_interventions_saved?: number | null
          successful_executions?: number | null
          tasks_automated?: number | null
          time_saved_hours?: number | null
        }
        Update: {
          automation_rule_id?: string | null
          average_execution_time_ms?: number | null
          created_at?: string | null
          date?: string
          executions_count?: number | null
          failed_executions?: number | null
          id?: string
          manual_interventions_saved?: number | null
          successful_executions?: number | null
          tasks_automated?: number | null
          time_saved_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_metrics_automation_rule_id_fkey"
            columns: ["automation_rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          actions: Json
          average_execution_time_ms: number | null
          conditions: Json | null
          created_at: string | null
          created_by_id: string | null
          description: string | null
          execution_count: number | null
          execution_order: number | null
          id: string
          is_active: boolean | null
          last_executed_at: string | null
          name: string
          priority: number | null
          trigger_config: Json
          updated_at: string | null
          updated_by_id: string | null
          workflow_template_id: string | null
        }
        Insert: {
          actions?: Json
          average_execution_time_ms?: number | null
          conditions?: Json | null
          created_at?: string | null
          created_by_id?: string | null
          description?: string | null
          execution_count?: number | null
          execution_order?: number | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          name: string
          priority?: number | null
          trigger_config?: Json
          updated_at?: string | null
          updated_by_id?: string | null
          workflow_template_id?: string | null
        }
        Update: {
          actions?: Json
          average_execution_time_ms?: number | null
          conditions?: Json | null
          created_at?: string | null
          created_by_id?: string | null
          description?: string | null
          execution_count?: number | null
          execution_order?: number | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          name?: string
          priority?: number | null
          trigger_config?: Json
          updated_at?: string | null
          updated_by_id?: string | null
          workflow_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "worker_productivity_metrics"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "automation_rules_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_updated_by_id_fkey"
            columns: ["updated_by_id"]
            isOneToOne: false
            referencedRelation: "worker_productivity_metrics"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "automation_rules_updated_by_id_fkey"
            columns: ["updated_by_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_bottlenecks"
            referencedColumns: ["workflow_template_id"]
          },
          {
            foreignKeyName: "automation_rules_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_daily_metrics"
            referencedColumns: ["workflow_template_id"]
          },
          {
            foreignKeyName: "automation_rules_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_templates: {
        Row: {
          category: string | null
          created_at: string | null
          created_by_id: string | null
          default_settings: Json | null
          description: string | null
          id: string
          is_built_in: boolean | null
          name: string
          template_config: Json
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by_id?: string | null
          default_settings?: Json | null
          description?: string | null
          id?: string
          is_built_in?: boolean | null
          name: string
          template_config: Json
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by_id?: string | null
          default_settings?: Json | null
          description?: string | null
          id?: string
          is_built_in?: boolean | null
          name?: string
          template_config?: Json
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_templates_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "worker_productivity_metrics"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "automation_templates_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      component_tracking: {
        Row: {
          created_at: string | null
          cup_pair_id: string
          final_metrics: Json | null
          grade: string
          id: string
          journey: Json | null
          left_cup_serial: string
          right_cup_serial: string
          source_tracking: Json | null
          specifications: Json
          updated_at: string | null
          wood_batch_id: string | null
        }
        Insert: {
          created_at?: string | null
          cup_pair_id: string
          final_metrics?: Json | null
          grade: string
          id?: string
          journey?: Json | null
          left_cup_serial: string
          right_cup_serial: string
          source_tracking?: Json | null
          specifications: Json
          updated_at?: string | null
          wood_batch_id?: string | null
        }
        Update: {
          created_at?: string | null
          cup_pair_id?: string
          final_metrics?: Json | null
          grade?: string
          id?: string
          journey?: Json | null
          left_cup_serial?: string
          right_cup_serial?: string
          source_tracking?: Json | null
          specifications?: Json
          updated_at?: string | null
          wood_batch_id?: string | null
        }
        Relationships: []
      }
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
            referencedRelation: "worker_productivity_metrics"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "custom_stages_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_results: {
        Row: {
          checkpoint_id: string | null
          component_tracking_id: string | null
          corrective_action: string | null
          created_at: string | null
          failed_checks: string[] | null
          id: string
          inspected_at: string | null
          measurement_data: Json | null
          notes: string | null
          passed: boolean
          photo_urls: string[] | null
          prevention_suggestion: string | null
          root_cause: string | null
          task_id: string | null
          time_to_resolve: number | null
          worker_id: string
        }
        Insert: {
          checkpoint_id?: string | null
          component_tracking_id?: string | null
          corrective_action?: string | null
          created_at?: string | null
          failed_checks?: string[] | null
          id?: string
          inspected_at?: string | null
          measurement_data?: Json | null
          notes?: string | null
          passed: boolean
          photo_urls?: string[] | null
          prevention_suggestion?: string | null
          root_cause?: string | null
          task_id?: string | null
          time_to_resolve?: number | null
          worker_id: string
        }
        Update: {
          checkpoint_id?: string | null
          component_tracking_id?: string | null
          corrective_action?: string | null
          created_at?: string | null
          failed_checks?: string[] | null
          id?: string
          inspected_at?: string | null
          measurement_data?: Json | null
          notes?: string | null
          passed?: boolean
          photo_urls?: string[] | null
          prevention_suggestion?: string | null
          root_cause?: string | null
          task_id?: string | null
          time_to_resolve?: number | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_results_checkpoint_id_fkey"
            columns: ["checkpoint_id"]
            isOneToOne: false
            referencedRelation: "quality_checkpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_results_component_tracking_id_fkey"
            columns: ["component_tracking_id"]
            isOneToOne: false
            referencedRelation: "component_tracking"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_results_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "work_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_results_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_productivity_metrics"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "inspection_results_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          bottleneck_alerts: boolean | null
          daily_summary: boolean | null
          email_enabled: boolean | null
          id: string
          issue_notifications: boolean | null
          mention_on_urgent: boolean | null
          slack_enabled: boolean | null
          slack_username: string | null
          updated_at: string | null
          worker_id: string | null
          workflow_notifications: boolean | null
        }
        Insert: {
          bottleneck_alerts?: boolean | null
          daily_summary?: boolean | null
          email_enabled?: boolean | null
          id?: string
          issue_notifications?: boolean | null
          mention_on_urgent?: boolean | null
          slack_enabled?: boolean | null
          slack_username?: string | null
          updated_at?: string | null
          worker_id?: string | null
          workflow_notifications?: boolean | null
        }
        Update: {
          bottleneck_alerts?: boolean | null
          daily_summary?: boolean | null
          email_enabled?: boolean | null
          id?: string
          issue_notifications?: boolean | null
          mention_on_urgent?: boolean | null
          slack_enabled?: boolean | null
          slack_username?: string | null
          updated_at?: string | null
          worker_id?: string | null
          workflow_notifications?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: true
            referencedRelation: "worker_productivity_metrics"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "notification_preferences_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: true
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          max_retries: number | null
          message: string
          notification_type: string
          priority: number | null
          recipient_id: string
          recipient_type: string
          retry_count: number | null
          scheduled_for: string | null
          sent_at: string | null
          status: string | null
          subject: string | null
          template_data: Json | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          message: string
          notification_type: string
          priority?: number | null
          recipient_id: string
          recipient_type: string
          retry_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          template_data?: Json | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          message?: string
          notification_type?: string
          priority?: number | null
          recipient_id?: string
          recipient_type?: string
          retry_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          template_data?: Json | null
        }
        Relationships: []
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
            referencedRelation: "current_production_status"
            referencedColumns: ["batch_id"]
          },
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
            referencedRelation: "worker_productivity_metrics"
            referencedColumns: ["worker_id"]
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
            referencedRelation: "worker_productivity_metrics"
            referencedColumns: ["worker_id"]
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
            referencedRelation: "worker_productivity_metrics"
            referencedColumns: ["worker_id"]
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
      quality_checkpoint_templates: {
        Row: {
          checkpoint_type: string
          checks: Json
          created_at: string | null
          id: string
          is_default: boolean | null
          stage_name: string
          template_name: string
        }
        Insert: {
          checkpoint_type: string
          checks: Json
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          stage_name: string
          template_name: string
        }
        Update: {
          checkpoint_type?: string
          checks?: Json
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          stage_name?: string
          template_name?: string
        }
        Relationships: []
      }
      quality_checkpoints: {
        Row: {
          checkpoint_type: string
          checks: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          on_failure: string
          severity: string
          stage: string
          updated_at: string | null
          workflow_template_id: string | null
        }
        Insert: {
          checkpoint_type: string
          checks: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          on_failure?: string
          severity?: string
          stage: string
          updated_at?: string | null
          workflow_template_id?: string | null
        }
        Update: {
          checkpoint_type?: string
          checks?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          on_failure?: string
          severity?: string
          stage?: string
          updated_at?: string | null
          workflow_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_checkpoints_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_bottlenecks"
            referencedColumns: ["workflow_template_id"]
          },
          {
            foreignKeyName: "quality_checkpoints_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_daily_metrics"
            referencedColumns: ["workflow_template_id"]
          },
          {
            foreignKeyName: "quality_checkpoints_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_holds: {
        Row: {
          assigned_to: string | null
          batch_id: string | null
          component_tracking_id: string | null
          created_at: string | null
          escalated_at: string | null
          hold_reason: string
          id: string
          reported_by: string
          resolution_notes: string | null
          resolved_at: string | null
          severity: string
          status: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          batch_id?: string | null
          component_tracking_id?: string | null
          created_at?: string | null
          escalated_at?: string | null
          hold_reason: string
          id?: string
          reported_by: string
          resolution_notes?: string | null
          resolved_at?: string | null
          severity: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          batch_id?: string | null
          component_tracking_id?: string | null
          created_at?: string | null
          escalated_at?: string | null
          hold_reason?: string
          id?: string
          reported_by?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_holds_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "worker_productivity_metrics"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "quality_holds_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_holds_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "current_production_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "quality_holds_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "work_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_holds_component_tracking_id_fkey"
            columns: ["component_tracking_id"]
            isOneToOne: false
            referencedRelation: "component_tracking"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_holds_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "worker_productivity_metrics"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "quality_holds_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_patterns: {
        Row: {
          affected_materials: string[] | null
          affected_models: string[] | null
          common_causes: string[] | null
          created_at: string | null
          effective_solutions: string[] | null
          id: string
          issue_type: string
          last_seen: string | null
          occurrence_count: number | null
          prevention_tips: string[] | null
          severity_trend: string | null
          stage: string
          updated_at: string | null
        }
        Insert: {
          affected_materials?: string[] | null
          affected_models?: string[] | null
          common_causes?: string[] | null
          created_at?: string | null
          effective_solutions?: string[] | null
          id?: string
          issue_type: string
          last_seen?: string | null
          occurrence_count?: number | null
          prevention_tips?: string[] | null
          severity_trend?: string | null
          stage: string
          updated_at?: string | null
        }
        Update: {
          affected_materials?: string[] | null
          affected_models?: string[] | null
          common_causes?: string[] | null
          created_at?: string | null
          effective_solutions?: string[] | null
          id?: string
          issue_type?: string
          last_seen?: string | null
          occurrence_count?: number | null
          prevention_tips?: string[] | null
          severity_trend?: string | null
          stage?: string
          updated_at?: string | null
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
            referencedRelation: "worker_productivity_metrics"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      slack_configurations: {
        Row: {
          created_at: string | null
          created_by_id: string | null
          default_channel: string | null
          id: string
          is_active: boolean | null
          notification_channels: Json | null
          updated_at: string | null
          webhook_url: string
          workspace_name: string
        }
        Insert: {
          created_at?: string | null
          created_by_id?: string | null
          default_channel?: string | null
          id?: string
          is_active?: boolean | null
          notification_channels?: Json | null
          updated_at?: string | null
          webhook_url: string
          workspace_name: string
        }
        Update: {
          created_at?: string | null
          created_by_id?: string | null
          default_channel?: string | null
          id?: string
          is_active?: boolean | null
          notification_channels?: Json | null
          updated_at?: string | null
          webhook_url?: string
          workspace_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "slack_configurations_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "worker_productivity_metrics"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "slack_configurations_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      slack_messages: {
        Row: {
          channel: string
          created_at: string | null
          error_message: string | null
          id: string
          message_content: string | null
          message_ts: string
          message_type: string
          related_entity_id: string | null
          related_entity_type: string | null
          sent_successfully: boolean | null
          thread_ts: string | null
        }
        Insert: {
          channel: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          message_content?: string | null
          message_ts: string
          message_type: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          sent_successfully?: boolean | null
          thread_ts?: string | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          message_content?: string | null
          message_ts?: string
          message_type?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          sent_successfully?: boolean | null
          thread_ts?: string | null
        }
        Relationships: []
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
            referencedRelation: "current_production_status"
            referencedColumns: ["batch_id"]
          },
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
            referencedRelation: "worker_productivity_metrics"
            referencedColumns: ["worker_id"]
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
            referencedRelation: "workflow_bottlenecks"
            referencedColumns: ["workflow_template_id"]
          },
          {
            foreignKeyName: "stage_transitions_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_daily_metrics"
            referencedColumns: ["workflow_template_id"]
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
            referencedRelation: "current_production_status"
            referencedColumns: ["batch_id"]
          },
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
            referencedRelation: "worker_productivity_metrics"
            referencedColumns: ["worker_id"]
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
      user_management_audit_log: {
        Row: {
          action_type: string
          actor_id: string
          created_at: string | null
          id: string
          new_value: Json | null
          previous_value: Json | null
          reason: string | null
          target_email: string | null
          target_worker_id: string | null
        }
        Insert: {
          action_type: string
          actor_id: string
          created_at?: string | null
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          reason?: string | null
          target_email?: string | null
          target_worker_id?: string | null
        }
        Update: {
          action_type?: string
          actor_id?: string
          created_at?: string | null
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          reason?: string | null
          target_email?: string | null
          target_worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_management_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "worker_productivity_metrics"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "user_management_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_management_audit_log_target_worker_id_fkey"
            columns: ["target_worker_id"]
            isOneToOne: false
            referencedRelation: "worker_productivity_metrics"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "user_management_audit_log_target_worker_id_fkey"
            columns: ["target_worker_id"]
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
          first_pass_yield: number | null
          id: string
          name: string
          order_item_ids: string[]
          quality_hold_id: string | null
          status: string | null
          updated_at: string | null
          workflow_template_id: string | null
        }
        Insert: {
          batch_type: string
          created_at?: string | null
          criteria: Json
          current_stage?: string | null
          first_pass_yield?: number | null
          id?: string
          name: string
          order_item_ids: string[]
          quality_hold_id?: string | null
          status?: string | null
          updated_at?: string | null
          workflow_template_id?: string | null
        }
        Update: {
          batch_type?: string
          created_at?: string | null
          criteria?: Json
          current_stage?: string | null
          first_pass_yield?: number | null
          id?: string
          name?: string
          order_item_ids?: string[]
          quality_hold_id?: string | null
          status?: string | null
          updated_at?: string | null
          workflow_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_batches_quality_hold_id_fkey"
            columns: ["quality_hold_id"]
            isOneToOne: false
            referencedRelation: "quality_holds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_batches_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_bottlenecks"
            referencedColumns: ["workflow_template_id"]
          },
          {
            foreignKeyName: "work_batches_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_daily_metrics"
            referencedColumns: ["workflow_template_id"]
          },
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
            referencedRelation: "worker_productivity_metrics"
            referencedColumns: ["worker_id"]
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
          component_tracking_id: string | null
          created_at: string | null
          depends_on_task_ids: string[] | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          manual_assignment: boolean | null
          notes: string | null
          order_item_id: string | null
          priority: string | null
          quality_score: number | null
          rework_count: number | null
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
          component_tracking_id?: string | null
          created_at?: string | null
          depends_on_task_ids?: string[] | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          manual_assignment?: boolean | null
          notes?: string | null
          order_item_id?: string | null
          priority?: string | null
          quality_score?: number | null
          rework_count?: number | null
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
          component_tracking_id?: string | null
          created_at?: string | null
          depends_on_task_ids?: string[] | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          manual_assignment?: boolean | null
          notes?: string | null
          order_item_id?: string | null
          priority?: string | null
          quality_score?: number | null
          rework_count?: number | null
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
            referencedRelation: "worker_productivity_metrics"
            referencedColumns: ["worker_id"]
          },
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
            referencedRelation: "worker_productivity_metrics"
            referencedColumns: ["worker_id"]
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
            referencedRelation: "current_production_status"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "work_tasks_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "work_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_tasks_component_tracking_id_fkey"
            columns: ["component_tracking_id"]
            isOneToOne: false
            referencedRelation: "component_tracking"
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
            referencedRelation: "workflow_bottlenecks"
            referencedColumns: ["workflow_template_id"]
          },
          {
            foreignKeyName: "work_tasks_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_daily_metrics"
            referencedColumns: ["workflow_template_id"]
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
      worker_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invitation_token: string
          invited_by: string
          role: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by: string
          role: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "worker_productivity_metrics"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "worker_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "workers"
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
            referencedRelation: "worker_productivity_metrics"
            referencedColumns: ["worker_id"]
          },
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
            referencedRelation: "worker_productivity_metrics"
            referencedColumns: ["worker_id"]
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
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          auth_user_id: string | null
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          last_active_at: string | null
          name: string
          rejection_reason: string | null
          role: string | null
          skills: string[] | null
          suspended_at: string | null
          suspension_reason: string | null
          updated_at: string | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          auth_user_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          last_active_at?: string | null
          name: string
          rejection_reason?: string | null
          role?: string | null
          skills?: string[] | null
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          auth_user_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          last_active_at?: string | null
          name?: string
          rejection_reason?: string | null
          role?: string | null
          skills?: string[] | null
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workers_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "worker_productivity_metrics"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "workers_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "current_production_status"
            referencedColumns: ["batch_id"]
          },
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
            referencedRelation: "worker_productivity_metrics"
            referencedColumns: ["worker_id"]
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
            referencedRelation: "workflow_bottlenecks"
            referencedColumns: ["workflow_template_id"]
          },
          {
            foreignKeyName: "workflow_execution_log_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_daily_metrics"
            referencedColumns: ["workflow_template_id"]
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
      workflow_performance_metrics: {
        Row: {
          automation_success_rate: number | null
          avg_completion_time_minutes: number | null
          bottleneck_incidents: number | null
          calculated_at: string | null
          id: string
          manual_intervention_count: number | null
          metric_date: string
          stage: string
          total_tasks_completed: number | null
          workflow_template_id: string | null
        }
        Insert: {
          automation_success_rate?: number | null
          avg_completion_time_minutes?: number | null
          bottleneck_incidents?: number | null
          calculated_at?: string | null
          id?: string
          manual_intervention_count?: number | null
          metric_date: string
          stage: string
          total_tasks_completed?: number | null
          workflow_template_id?: string | null
        }
        Update: {
          automation_success_rate?: number | null
          avg_completion_time_minutes?: number | null
          bottleneck_incidents?: number | null
          calculated_at?: string | null
          id?: string
          manual_intervention_count?: number | null
          metric_date?: string
          stage?: string
          total_tasks_completed?: number | null
          workflow_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_performance_metrics_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_bottlenecks"
            referencedColumns: ["workflow_template_id"]
          },
          {
            foreignKeyName: "workflow_performance_metrics_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_daily_metrics"
            referencedColumns: ["workflow_template_id"]
          },
          {
            foreignKeyName: "workflow_performance_metrics_workflow_template_id_fkey"
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
            referencedRelation: "worker_productivity_metrics"
            referencedColumns: ["worker_id"]
          },
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
      current_production_status: {
        Row: {
          active_tasks: number | null
          assigned_workers: string | null
          batch_id: string | null
          batch_name: string | null
          batch_status: string | null
          completed_tasks: number | null
          created_at: string | null
          current_stage: string | null
          hours_in_current_stage: number | null
          open_issues: number | null
          pending_tasks: number | null
          severity_score: number | null
          total_tasks: number | null
          updated_at: string | null
          worker_count: number | null
          workflow_name: string | null
        }
        Relationships: []
      }
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
      log_analytics: {
        Row: {
          avg_api_duration: number | null
          avg_db_duration: number | null
          context: string | null
          debug_count: number | null
          error_count: number | null
          info_count: number | null
          level: number | null
          log_date: string | null
          max_api_duration: number | null
          max_db_duration: number | null
          total_logs: number | null
          warn_count: number | null
        }
        Relationships: []
      }
      stage_durations: {
        Row: {
          batch_id: string | null
          entity_id: string | null
          from_stage: string | null
          hours_in_previous_stage: number | null
          id: string | null
          order_item_id: string | null
          to_stage: string | null
          transition_time: string | null
          transition_type: string | null
          workflow_template_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stage_transitions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "current_production_status"
            referencedColumns: ["batch_id"]
          },
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
            foreignKeyName: "stage_transitions_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_bottlenecks"
            referencedColumns: ["workflow_template_id"]
          },
          {
            foreignKeyName: "stage_transitions_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_daily_metrics"
            referencedColumns: ["workflow_template_id"]
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
      worker_productivity_metrics: {
        Row: {
          avg_session_minutes: number | null
          batches_worked: number | null
          date: string | null
          issues_reported: number | null
          role: string | null
          sessions_count: number | null
          stages_worked: string | null
          tasks_completed: number | null
          tasks_worked: number | null
          total_minutes_worked: number | null
          unique_stages_count: number | null
          worker_id: string | null
          worker_name: string | null
        }
        Relationships: []
      }
      workflow_bottlenecks: {
        Row: {
          avg_automation_rate: number | null
          avg_daily_issues: number | null
          avg_hours_in_stage: number | null
          data_points: number | null
          max_hours_in_stage: number | null
          overall_bottleneck_rank: number | null
          performance_trend: string | null
          stage: string | null
          stage_bottleneck_rank: number | null
          workflow_name: string | null
          workflow_template_id: string | null
        }
        Relationships: []
      }
      workflow_daily_metrics: {
        Row: {
          auto_transitions: number | null
          automation_percentage: number | null
          avg_hours_in_stage: number | null
          batches_processed: number | null
          date: string | null
          issues_reported: number | null
          items_processed: number | null
          manual_transitions: number | null
          max_hours_in_stage: number | null
          min_hours_in_stage: number | null
          stage: string | null
          total_transitions: number | null
          workflow_name: string | null
          workflow_template_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      approve_worker: {
        Args: { p_worker_id: string; p_approved_by_id: string }
        Returns: boolean
      }
      cleanup_old_logs: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      detect_workflow_bottlenecks: {
        Args: Record<PropertyKey, never>
        Returns: {
          workflow_name: string
          stage: string
          avg_hours: number
          severity: string
          recommendation: string
        }[]
      }
      generate_serial_number: {
        Args: { model: string; year?: number }
        Returns: string
      }
      get_error_patterns: {
        Args: { days?: number }
        Returns: {
          error_pattern: string
          occurrences: number
          first_seen: string
          last_seen: string
          contexts: string[]
          sample_correlation_id: string
        }[]
      }
      is_manager: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      reactivate_worker: {
        Args: { p_worker_id: string; p_reactivated_by_id: string }
        Returns: boolean
      }
      refresh_analytics_views: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      reject_worker: {
        Args: {
          p_worker_id: string
          p_rejected_by_id: string
          p_reason: string
        }
        Returns: boolean
      }
      suspend_worker: {
        Args: {
          p_worker_id: string
          p_suspended_by_id: string
          p_reason: string
        }
        Returns: boolean
      }
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
