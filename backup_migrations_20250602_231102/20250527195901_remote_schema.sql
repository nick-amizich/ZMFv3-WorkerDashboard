create table "public"."analytics_refresh_log" (
    "id" uuid not null default gen_random_uuid(),
    "refresh_type" text not null,
    "status" text default 'success'::text,
    "duration_ms" integer,
    "error_message" text,
    "refreshed_at" timestamp with time zone default now()
);


alter table "public"."analytics_refresh_log" enable row level security;

create table "public"."application_logs" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone default now(),
    "level" integer not null,
    "message" text not null,
    "context" text not null default 'APP'::text,
    "correlation_id" uuid,
    "request_id" uuid,
    "user_id" uuid,
    "session_id" text,
    "api_method" text,
    "api_url" text,
    "api_status_code" integer,
    "api_duration" integer,
    "api_user_agent" text,
    "api_ip" text,
    "db_query" text,
    "db_duration" integer,
    "db_row_count" integer,
    "error_name" text,
    "error_message" text,
    "error_stack" text,
    "error_code" text,
    "performance_duration" integer,
    "memory_usage" numeric,
    "metadata" jsonb default '{}'::jsonb
);


alter table "public"."application_logs" enable row level security;

create table "public"."automation_execution_log" (
    "id" uuid not null default gen_random_uuid(),
    "rule_id" uuid,
    "workflow_instance_id" uuid,
    "trigger_data" jsonb,
    "conditions_evaluated" jsonb,
    "actions_executed" jsonb,
    "execution_status" text not null,
    "error_message" text,
    "executed_at" timestamp with time zone default now()
);


alter table "public"."automation_execution_log" enable row level security;

create table "public"."automation_executions" (
    "id" uuid not null default gen_random_uuid(),
    "automation_rule_id" uuid,
    "workflow_template_id" uuid,
    "batch_id" uuid,
    "task_id" uuid,
    "trigger_data" jsonb not null,
    "conditions_evaluated" jsonb not null,
    "conditions_met" jsonb not null,
    "actions_executed" jsonb not null,
    "execution_status" text default 'success'::text,
    "error_message" text,
    "execution_time_ms" integer,
    "execution_context" jsonb default '{}'::jsonb,
    "executed_at" timestamp with time zone default now()
);


alter table "public"."automation_executions" enable row level security;

create table "public"."automation_metrics" (
    "id" uuid not null default gen_random_uuid(),
    "automation_rule_id" uuid,
    "date" date not null,
    "executions_count" integer default 0,
    "successful_executions" integer default 0,
    "failed_executions" integer default 0,
    "average_execution_time_ms" numeric(10,2),
    "tasks_automated" integer default 0,
    "manual_interventions_saved" integer default 0,
    "time_saved_hours" numeric(8,2) default 0,
    "created_at" timestamp with time zone default now()
);


alter table "public"."automation_metrics" enable row level security;

create table "public"."automation_rules" (
    "id" uuid not null default gen_random_uuid(),
    "workflow_template_id" uuid,
    "name" text not null,
    "description" text,
    "trigger_config" jsonb not null default '{"type": "stage_complete", "stage": null, "schedule": null, "conditions": [], "elapsed_hours": null}'::jsonb,
    "conditions" jsonb default '[]'::jsonb,
    "actions" jsonb not null default '[]'::jsonb,
    "is_active" boolean default true,
    "priority" integer default 0,
    "execution_order" integer default 0,
    "execution_count" integer default 0,
    "last_executed_at" timestamp with time zone,
    "average_execution_time_ms" integer,
    "created_by_id" uuid,
    "updated_by_id" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."automation_rules" enable row level security;

create table "public"."automation_templates" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "category" text,
    "template_config" jsonb not null,
    "default_settings" jsonb default '{}'::jsonb,
    "usage_count" integer default 0,
    "is_built_in" boolean default false,
    "created_by_id" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."automation_templates" enable row level security;

create table "public"."component_tracking" (
    "id" uuid not null default gen_random_uuid(),
    "cup_pair_id" uuid not null,
    "left_cup_serial" text not null,
    "right_cup_serial" text not null,
    "wood_batch_id" uuid,
    "grade" text not null,
    "source_tracking" jsonb default '{}'::jsonb,
    "specifications" jsonb not null,
    "journey" jsonb default '[]'::jsonb,
    "final_metrics" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."component_tracking" enable row level security;

create table "public"."custom_stages" (
    "id" uuid not null default gen_random_uuid(),
    "stage_code" text not null,
    "stage_name" text not null,
    "description" text,
    "default_estimated_hours" numeric(5,2),
    "required_skills" text[],
    "created_by_id" uuid,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now()
);


alter table "public"."custom_stages" enable row level security;

create table "public"."inspection_results" (
    "id" uuid not null default gen_random_uuid(),
    "task_id" uuid,
    "checkpoint_id" uuid,
    "component_tracking_id" uuid,
    "worker_id" uuid not null,
    "passed" boolean not null,
    "failed_checks" text[],
    "root_cause" text,
    "corrective_action" text,
    "prevention_suggestion" text,
    "time_to_resolve" integer,
    "notes" text,
    "photo_urls" text[],
    "measurement_data" jsonb,
    "inspected_at" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now()
);


alter table "public"."inspection_results" enable row level security;

create table "public"."notification_preferences" (
    "id" uuid not null default gen_random_uuid(),
    "worker_id" uuid,
    "slack_enabled" boolean default true,
    "slack_username" text,
    "email_enabled" boolean default false,
    "issue_notifications" boolean default true,
    "workflow_notifications" boolean default true,
    "daily_summary" boolean default false,
    "bottleneck_alerts" boolean default true,
    "mention_on_urgent" boolean default true,
    "updated_at" timestamp with time zone default now()
);


alter table "public"."notification_preferences" enable row level security;

create table "public"."notification_queue" (
    "id" uuid not null default gen_random_uuid(),
    "notification_type" text not null,
    "recipient_type" text not null,
    "recipient_id" text not null,
    "subject" text,
    "message" text not null,
    "template_data" jsonb default '{}'::jsonb,
    "priority" integer default 0,
    "status" text default 'pending'::text,
    "retry_count" integer default 0,
    "max_retries" integer default 3,
    "scheduled_for" timestamp with time zone default now(),
    "sent_at" timestamp with time zone,
    "error_message" text,
    "created_at" timestamp with time zone default now()
);


alter table "public"."notification_queue" enable row level security;

create table "public"."order_items" (
    "id" uuid not null default gen_random_uuid(),
    "order_id" uuid,
    "shopify_line_item_id" bigint,
    "product_name" text not null,
    "variant_title" text,
    "quantity" integer not null,
    "price" numeric(10,2),
    "sku" text,
    "product_data" jsonb,
    "created_at" timestamp with time zone default now(),
    "headphone_material" text generated always as (
CASE
    WHEN ((product_data ->> 'headphone_specs'::text) IS NOT NULL) THEN ((product_data -> 'headphone_specs'::text) ->> 'material'::text)
    ELSE NULL::text
END) stored,
    "headphone_color" text generated always as (
CASE
    WHEN ((product_data ->> 'headphone_specs'::text) IS NOT NULL) THEN ((product_data -> 'headphone_specs'::text) ->> 'color'::text)
    ELSE NULL::text
END) stored,
    "product_category" text generated always as (
CASE
    WHEN ((product_data ->> 'headphone_specs'::text) IS NOT NULL) THEN ((product_data -> 'headphone_specs'::text) ->> 'product_category'::text)
    ELSE 'other'::text
END) stored,
    "requires_custom_work" boolean generated always as (
CASE
    WHEN ((product_data ->> 'headphone_specs'::text) IS NOT NULL) THEN (((product_data -> 'headphone_specs'::text) ->> 'requires_custom_work'::text))::boolean
    ELSE false
END) stored
);


alter table "public"."order_items" enable row level security;

create table "public"."orders" (
    "id" uuid not null default gen_random_uuid(),
    "shopify_order_id" bigint not null,
    "order_number" text not null,
    "customer_name" text,
    "customer_email" text,
    "total_price" numeric(10,2),
    "order_date" timestamp with time zone,
    "status" text default 'pending'::text,
    "raw_data" jsonb not null,
    "synced_at" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now()
);


alter table "public"."orders" enable row level security;

create table "public"."production_issues" (
    "id" uuid not null default gen_random_uuid(),
    "reported_by_id" uuid not null,
    "task_id" uuid,
    "batch_id" uuid,
    "order_item_id" uuid,
    "stage" text not null,
    "issue_type" text not null,
    "severity" text not null,
    "title" text not null,
    "description" text not null,
    "image_urls" text[],
    "slack_thread_id" text,
    "resolution_status" text default 'open'::text,
    "resolved_by_id" uuid,
    "resolution_notes" text,
    "created_at" timestamp with time zone default now(),
    "resolved_at" timestamp with time zone
);


alter table "public"."production_issues" enable row level security;

create table "public"."qc_checklist_items" (
    "id" uuid not null default gen_random_uuid(),
    "production_step_value" text not null,
    "item_text" text not null,
    "sort_order" integer not null default 0,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."qc_checklist_items" enable row level security;

create table "public"."qc_production_steps" (
    "id" uuid not null default gen_random_uuid(),
    "value" text not null,
    "label" text not null,
    "sort_order" integer not null default 0,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."qc_production_steps" enable row level security;

create table "public"."qc_results" (
    "id" uuid not null default gen_random_uuid(),
    "task_id" uuid,
    "template_id" uuid,
    "worker_id" uuid,
    "results" jsonb not null,
    "overall_status" text not null,
    "inspector_notes" text,
    "created_at" timestamp with time zone default now()
);


alter table "public"."qc_results" enable row level security;

create table "public"."qc_submissions" (
    "id" uuid not null default gen_random_uuid(),
    "worker_id" uuid not null,
    "worker_name" text not null,
    "production_step" text not null,
    "checklist_items" jsonb not null,
    "overall_notes" text,
    "product_info" jsonb default '{}'::jsonb,
    "submitted_at" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now()
);


alter table "public"."qc_submissions" enable row level security;

create table "public"."qc_templates" (
    "id" uuid not null default gen_random_uuid(),
    "task_type" text not null,
    "name" text not null,
    "checklist_items" jsonb not null,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now()
);


alter table "public"."qc_templates" enable row level security;

create table "public"."quality_checkpoint_templates" (
    "id" uuid not null default gen_random_uuid(),
    "stage_name" text not null,
    "checkpoint_type" text not null,
    "template_name" text not null,
    "checks" jsonb not null,
    "is_default" boolean default false,
    "created_at" timestamp with time zone default now()
);


alter table "public"."quality_checkpoint_templates" enable row level security;

create table "public"."quality_checkpoints" (
    "id" uuid not null default gen_random_uuid(),
    "workflow_template_id" uuid,
    "stage" text not null,
    "checkpoint_type" text not null,
    "severity" text not null default 'major'::text,
    "checks" jsonb not null,
    "on_failure" text not null default 'block_progress'::text,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."quality_checkpoints" enable row level security;

create table "public"."quality_holds" (
    "id" uuid not null default gen_random_uuid(),
    "batch_id" uuid,
    "component_tracking_id" uuid,
    "hold_reason" text not null,
    "severity" text not null,
    "reported_by" uuid not null,
    "assigned_to" uuid,
    "status" text not null default 'active'::text,
    "resolution_notes" text,
    "resolved_at" timestamp with time zone,
    "escalated_at" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."quality_holds" enable row level security;

create table "public"."quality_patterns" (
    "id" uuid not null default gen_random_uuid(),
    "stage" text not null,
    "issue_type" text not null,
    "occurrence_count" integer default 1,
    "common_causes" text[],
    "effective_solutions" text[],
    "prevention_tips" text[],
    "affected_models" text[],
    "affected_materials" text[],
    "severity_trend" text,
    "last_seen" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."quality_patterns" enable row level security;

create table "public"."settings" (
    "id" uuid not null default gen_random_uuid(),
    "key" text not null,
    "value" jsonb not null,
    "encrypted" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "updated_by" uuid
);


alter table "public"."settings" enable row level security;

create table "public"."slack_configurations" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_name" text not null,
    "webhook_url" text not null,
    "default_channel" text default '#production'::text,
    "notification_channels" jsonb default '{"issues": "#production-issues", "workflows": "#production-flow", "daily_summary": "#production-summary"}'::jsonb,
    "created_by_id" uuid,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."slack_configurations" enable row level security;

create table "public"."slack_messages" (
    "id" uuid not null default gen_random_uuid(),
    "message_ts" text not null,
    "channel" text not null,
    "thread_ts" text,
    "message_type" text not null,
    "related_entity_type" text,
    "related_entity_id" uuid,
    "message_content" text,
    "sent_successfully" boolean default true,
    "error_message" text,
    "created_at" timestamp with time zone default now()
);


alter table "public"."slack_messages" enable row level security;

create table "public"."stage_transitions" (
    "id" uuid not null default gen_random_uuid(),
    "batch_id" uuid,
    "order_item_id" uuid,
    "workflow_template_id" uuid,
    "from_stage" text,
    "to_stage" text not null,
    "transition_type" text default 'manual'::text,
    "transitioned_by_id" uuid,
    "notes" text,
    "transition_time" timestamp with time zone default now()
);


alter table "public"."stage_transitions" enable row level security;

create table "public"."time_logs" (
    "id" uuid not null default gen_random_uuid(),
    "worker_id" uuid not null,
    "task_id" uuid,
    "batch_id" uuid,
    "stage" text not null,
    "start_time" timestamp with time zone not null,
    "end_time" timestamp with time zone,
    "duration_minutes" integer generated always as (
CASE
    WHEN (end_time IS NOT NULL) THEN (EXTRACT(epoch FROM (end_time - start_time)) / (60)::numeric)
    ELSE NULL::numeric
END) stored,
    "notes" text,
    "created_at" timestamp with time zone default now()
);


alter table "public"."time_logs" enable row level security;

create table "public"."user_management_audit_log" (
    "id" uuid not null default gen_random_uuid(),
    "action_type" text not null,
    "actor_id" uuid not null,
    "target_worker_id" uuid,
    "target_email" text,
    "previous_value" jsonb,
    "new_value" jsonb,
    "reason" text,
    "created_at" timestamp with time zone default now()
);


alter table "public"."user_management_audit_log" enable row level security;

create table "public"."work_batches" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "batch_type" text not null,
    "criteria" jsonb not null,
    "order_item_ids" uuid[] not null,
    "workflow_template_id" uuid,
    "current_stage" text,
    "status" text default 'pending'::text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "quality_hold_id" uuid,
    "first_pass_yield" numeric(5,2)
);


alter table "public"."work_batches" enable row level security;

create table "public"."work_logs" (
    "id" uuid not null default gen_random_uuid(),
    "task_id" uuid,
    "worker_id" uuid,
    "log_type" text not null,
    "time_spent_minutes" integer,
    "notes" text,
    "created_at" timestamp with time zone default now()
);


alter table "public"."work_logs" enable row level security;

create table "public"."work_tasks" (
    "id" uuid not null default gen_random_uuid(),
    "order_item_id" uuid,
    "task_type" text not null,
    "task_description" text,
    "assigned_to_id" uuid,
    "assigned_by_id" uuid,
    "status" text default 'pending'::text,
    "priority" text default 'normal'::text,
    "estimated_hours" numeric(5,2),
    "actual_hours" numeric(5,2),
    "due_date" date,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "notes" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "batch_id" uuid,
    "stage" text,
    "auto_generated" boolean default false,
    "depends_on_task_ids" uuid[],
    "manual_assignment" boolean default false,
    "workflow_template_id" uuid,
    "component_tracking_id" uuid,
    "quality_score" numeric(5,2),
    "rework_count" integer default 0
);


alter table "public"."work_tasks" enable row level security;

create table "public"."worker_invitations" (
    "id" uuid not null default gen_random_uuid(),
    "email" text not null,
    "role" text not null,
    "invited_by" uuid not null,
    "invitation_token" text not null default encode(gen_random_bytes(32), 'hex'::text),
    "expires_at" timestamp with time zone not null default (now() + '7 days'::interval),
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone default now()
);


alter table "public"."worker_invitations" enable row level security;

create table "public"."worker_stage_assignments" (
    "id" uuid not null default gen_random_uuid(),
    "worker_id" uuid not null,
    "stage" text not null,
    "skill_level" text default 'competent'::text,
    "is_active" boolean default true,
    "assigned_by_id" uuid,
    "created_at" timestamp with time zone default now()
);


alter table "public"."worker_stage_assignments" enable row level security;

create table "public"."workers" (
    "id" uuid not null default gen_random_uuid(),
    "auth_user_id" uuid,
    "name" text not null,
    "email" text not null,
    "role" text default 'worker'::text,
    "skills" text[] default '{}'::text[],
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "approval_status" text default 'pending'::text,
    "approved_by" uuid,
    "approved_at" timestamp with time zone,
    "rejection_reason" text,
    "suspension_reason" text,
    "suspended_at" timestamp with time zone,
    "last_active_at" timestamp with time zone
);


alter table "public"."workers" enable row level security;

create table "public"."workflow_execution_log" (
    "id" uuid not null default gen_random_uuid(),
    "workflow_template_id" uuid,
    "batch_id" uuid,
    "order_item_id" uuid,
    "stage" text not null,
    "action" text not null,
    "action_details" jsonb,
    "executed_by_id" uuid,
    "execution_type" text not null,
    "created_at" timestamp with time zone default now()
);


alter table "public"."workflow_execution_log" enable row level security;

create table "public"."workflow_performance_metrics" (
    "id" uuid not null default gen_random_uuid(),
    "workflow_template_id" uuid,
    "stage" text not null,
    "metric_date" date not null,
    "avg_completion_time_minutes" numeric(10,2),
    "total_tasks_completed" integer default 0,
    "automation_success_rate" numeric(5,2),
    "manual_intervention_count" integer default 0,
    "bottleneck_incidents" integer default 0,
    "calculated_at" timestamp with time zone default now()
);


alter table "public"."workflow_performance_metrics" enable row level security;

create table "public"."workflow_templates" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "trigger_rules" jsonb not null default '{"manual_only": true}'::jsonb,
    "stages" jsonb not null,
    "stage_transitions" jsonb not null,
    "is_active" boolean default true,
    "is_default" boolean default false,
    "created_by_id" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."workflow_templates" enable row level security;

CREATE UNIQUE INDEX analytics_refresh_log_pkey ON public.analytics_refresh_log USING btree (id);

CREATE UNIQUE INDEX application_logs_pkey ON public.application_logs USING btree (id);

CREATE UNIQUE INDEX automation_execution_log_pkey ON public.automation_execution_log USING btree (id);

CREATE UNIQUE INDEX automation_executions_pkey ON public.automation_executions USING btree (id);

CREATE UNIQUE INDEX automation_metrics_automation_rule_id_date_key ON public.automation_metrics USING btree (automation_rule_id, date);

CREATE UNIQUE INDEX automation_metrics_pkey ON public.automation_metrics USING btree (id);

CREATE UNIQUE INDEX automation_rules_pkey ON public.automation_rules USING btree (id);

CREATE UNIQUE INDEX automation_templates_pkey ON public.automation_templates USING btree (id);

CREATE UNIQUE INDEX component_tracking_cup_pair_id_key ON public.component_tracking USING btree (cup_pair_id);

CREATE UNIQUE INDEX component_tracking_left_cup_serial_key ON public.component_tracking USING btree (left_cup_serial);

CREATE UNIQUE INDEX component_tracking_pkey ON public.component_tracking USING btree (id);

CREATE UNIQUE INDEX component_tracking_right_cup_serial_key ON public.component_tracking USING btree (right_cup_serial);

CREATE UNIQUE INDEX custom_stages_pkey ON public.custom_stages USING btree (id);

CREATE UNIQUE INDEX custom_stages_stage_code_key ON public.custom_stages USING btree (stage_code);

CREATE INDEX idx_analytics_refresh_log_date ON public.analytics_refresh_log USING btree (refreshed_at);

CREATE INDEX idx_application_logs_api_url ON public.application_logs USING btree (api_url);

CREATE INDEX idx_application_logs_context ON public.application_logs USING btree (context);

CREATE INDEX idx_application_logs_correlation_id ON public.application_logs USING btree (correlation_id);

CREATE INDEX idx_application_logs_created_at ON public.application_logs USING btree (created_at DESC);

CREATE INDEX idx_application_logs_error_name ON public.application_logs USING btree (error_name);

CREATE INDEX idx_application_logs_level ON public.application_logs USING btree (level);

CREATE INDEX idx_application_logs_metadata ON public.application_logs USING gin (metadata);

CREATE INDEX idx_application_logs_user_id ON public.application_logs USING btree (user_id);

CREATE INDEX idx_audit_log_actor ON public.user_management_audit_log USING btree (actor_id);

CREATE INDEX idx_audit_log_created ON public.user_management_audit_log USING btree (created_at DESC);

CREATE INDEX idx_audit_log_target ON public.user_management_audit_log USING btree (target_worker_id);

CREATE INDEX idx_automation_execution_log_executed ON public.automation_execution_log USING btree (executed_at DESC);

CREATE INDEX idx_automation_execution_log_rule ON public.automation_execution_log USING btree (rule_id);

CREATE INDEX idx_automation_executions_batch ON public.automation_executions USING btree (batch_id);

CREATE INDEX idx_automation_executions_rule ON public.automation_executions USING btree (automation_rule_id);

CREATE INDEX idx_automation_executions_status_date ON public.automation_executions USING btree (execution_status, executed_at);

CREATE INDEX idx_automation_executions_workflow ON public.automation_executions USING btree (workflow_template_id);

CREATE INDEX idx_automation_metrics_rule_date ON public.automation_metrics USING btree (automation_rule_id, date);

CREATE INDEX idx_automation_rules_active ON public.automation_rules USING btree (is_active);

CREATE INDEX idx_automation_rules_active_priority ON public.automation_rules USING btree (is_active, priority DESC, execution_order);

CREATE INDEX idx_automation_rules_trigger_type ON public.automation_rules USING btree (((trigger_config ->> 'type'::text)));

CREATE INDEX idx_automation_rules_workflow ON public.automation_rules USING btree (workflow_template_id);

CREATE INDEX idx_automation_templates_category ON public.automation_templates USING btree (category, is_built_in);

CREATE INDEX idx_component_tracking_cup_pair ON public.component_tracking USING btree (cup_pair_id);

CREATE INDEX idx_component_tracking_grade ON public.component_tracking USING btree (grade);

CREATE INDEX idx_component_tracking_wood_batch ON public.component_tracking USING btree (wood_batch_id);

CREATE INDEX idx_inspection_results_component ON public.inspection_results USING btree (component_tracking_id);

CREATE INDEX idx_inspection_results_passed ON public.inspection_results USING btree (passed);

CREATE INDEX idx_inspection_results_task ON public.inspection_results USING btree (task_id);

CREATE INDEX idx_invitations_email ON public.worker_invitations USING btree (email);

CREATE INDEX idx_invitations_expires ON public.worker_invitations USING btree (expires_at);

CREATE INDEX idx_invitations_token ON public.worker_invitations USING btree (invitation_token);

CREATE INDEX idx_notification_preferences_worker ON public.notification_preferences USING btree (worker_id);

CREATE INDEX idx_notification_queue_status_priority ON public.notification_queue USING btree (status, priority, scheduled_for);

CREATE INDEX idx_notification_queue_type_recipient ON public.notification_queue USING btree (notification_type, recipient_type, recipient_id);

CREATE INDEX idx_order_items_headphone_color ON public.order_items USING btree (headphone_color);

CREATE INDEX idx_order_items_headphone_material ON public.order_items USING btree (headphone_material);

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);

CREATE INDEX idx_order_items_product_category ON public.order_items USING btree (product_category);

CREATE INDEX idx_order_items_product_data_specs ON public.order_items USING gin (((product_data -> 'headphone_specs'::text)));

CREATE INDEX idx_order_items_requires_custom_work ON public.order_items USING btree (requires_custom_work);

CREATE INDEX idx_orders_shopify_id ON public.orders USING btree (shopify_order_id);

CREATE INDEX idx_orders_status ON public.orders USING btree (status);

CREATE INDEX idx_production_issues_status ON public.production_issues USING btree (resolution_status);

CREATE INDEX idx_qc_checklist_items_active ON public.qc_checklist_items USING btree (is_active);

CREATE INDEX idx_qc_checklist_items_production_step ON public.qc_checklist_items USING btree (production_step_value);

CREATE INDEX idx_qc_checklist_items_sort_order ON public.qc_checklist_items USING btree (sort_order);

CREATE INDEX idx_qc_production_steps_active ON public.qc_production_steps USING btree (is_active);

CREATE INDEX idx_qc_production_steps_sort_order ON public.qc_production_steps USING btree (sort_order);

CREATE INDEX idx_qc_production_steps_value ON public.qc_production_steps USING btree (value);

CREATE INDEX idx_qc_submissions_production_step ON public.qc_submissions USING btree (production_step);

CREATE INDEX idx_qc_submissions_submitted_at ON public.qc_submissions USING btree (submitted_at);

CREATE INDEX idx_qc_submissions_worker_id ON public.qc_submissions USING btree (worker_id);

CREATE INDEX idx_quality_checkpoints_stage ON public.quality_checkpoints USING btree (stage);

CREATE INDEX idx_quality_checkpoints_workflow ON public.quality_checkpoints USING btree (workflow_template_id);

CREATE INDEX idx_quality_holds_batch ON public.quality_holds USING btree (batch_id);

CREATE INDEX idx_quality_holds_status ON public.quality_holds USING btree (status);

CREATE INDEX idx_quality_patterns_issue ON public.quality_patterns USING btree (issue_type);

CREATE INDEX idx_quality_patterns_stage ON public.quality_patterns USING btree (stage);

CREATE INDEX idx_slack_configurations_active ON public.slack_configurations USING btree (is_active);

CREATE INDEX idx_slack_messages_channel_ts ON public.slack_messages USING btree (channel, message_ts);

CREATE INDEX idx_slack_messages_type_entity ON public.slack_messages USING btree (message_type, related_entity_type, related_entity_id);

CREATE INDEX idx_stage_transitions_batch ON public.stage_transitions USING btree (batch_id);

CREATE INDEX idx_stage_transitions_time ON public.stage_transitions USING btree (transition_time);

CREATE INDEX idx_time_logs_worker_date ON public.time_logs USING btree (worker_id, start_time);

CREATE INDEX idx_work_batches_stage ON public.work_batches USING btree (current_stage);

CREATE INDEX idx_work_batches_status ON public.work_batches USING btree (status);

CREATE INDEX idx_work_batches_workflow ON public.work_batches USING btree (workflow_template_id);

CREATE INDEX idx_work_tasks_assigned_to ON public.work_tasks USING btree (assigned_to_id);

CREATE INDEX idx_work_tasks_batch ON public.work_tasks USING btree (batch_id);

CREATE INDEX idx_work_tasks_stage ON public.work_tasks USING btree (stage);

CREATE INDEX idx_work_tasks_status ON public.work_tasks USING btree (status);

CREATE INDEX idx_worker_stage_assignments ON public.worker_stage_assignments USING btree (worker_id, stage) WHERE (is_active = true);

CREATE INDEX idx_workers_approval_status ON public.workers USING btree (approval_status);

CREATE INDEX idx_workers_approved_by ON public.workers USING btree (approved_by);

CREATE INDEX idx_workers_auth_user_id ON public.workers USING btree (auth_user_id);

CREATE INDEX idx_workers_auth_user_id_role ON public.workers USING btree (auth_user_id, role) WHERE (is_active = true);

CREATE INDEX idx_workers_role ON public.workers USING btree (role);

CREATE INDEX idx_workflow_execution_log_batch ON public.workflow_execution_log USING btree (batch_id);

CREATE INDEX idx_workflow_execution_log_time ON public.workflow_execution_log USING btree (created_at);

CREATE INDEX idx_workflow_performance_metrics_workflow ON public.workflow_performance_metrics USING btree (workflow_template_id, metric_date);

CREATE UNIQUE INDEX inspection_results_pkey ON public.inspection_results USING btree (id);

CREATE UNIQUE INDEX notification_preferences_pkey ON public.notification_preferences USING btree (id);

CREATE UNIQUE INDEX notification_preferences_worker_id_key ON public.notification_preferences USING btree (worker_id);

CREATE UNIQUE INDEX notification_queue_pkey ON public.notification_queue USING btree (id);

CREATE UNIQUE INDEX order_items_pkey ON public.order_items USING btree (id);

CREATE UNIQUE INDEX order_items_shopify_line_item_id_unique ON public.order_items USING btree (shopify_line_item_id);

CREATE UNIQUE INDEX orders_pkey ON public.orders USING btree (id);

CREATE UNIQUE INDEX orders_shopify_order_id_key ON public.orders USING btree (shopify_order_id);

CREATE UNIQUE INDEX production_issues_pkey ON public.production_issues USING btree (id);

CREATE UNIQUE INDEX qc_checklist_items_pkey ON public.qc_checklist_items USING btree (id);

CREATE UNIQUE INDEX qc_production_steps_pkey ON public.qc_production_steps USING btree (id);

CREATE UNIQUE INDEX qc_production_steps_value_key ON public.qc_production_steps USING btree (value);

CREATE UNIQUE INDEX qc_results_pkey ON public.qc_results USING btree (id);

CREATE UNIQUE INDEX qc_submissions_pkey ON public.qc_submissions USING btree (id);

CREATE UNIQUE INDEX qc_templates_pkey ON public.qc_templates USING btree (id);

CREATE UNIQUE INDEX quality_checkpoint_templates_pkey ON public.quality_checkpoint_templates USING btree (id);

CREATE UNIQUE INDEX quality_checkpoint_templates_stage_name_checkpoint_type_tem_key ON public.quality_checkpoint_templates USING btree (stage_name, checkpoint_type, template_name);

CREATE UNIQUE INDEX quality_checkpoints_pkey ON public.quality_checkpoints USING btree (id);

CREATE UNIQUE INDEX quality_checkpoints_workflow_template_id_stage_checkpoint_t_key ON public.quality_checkpoints USING btree (workflow_template_id, stage, checkpoint_type);

CREATE UNIQUE INDEX quality_holds_pkey ON public.quality_holds USING btree (id);

CREATE UNIQUE INDEX quality_patterns_pkey ON public.quality_patterns USING btree (id);

CREATE UNIQUE INDEX quality_patterns_stage_issue_type_key ON public.quality_patterns USING btree (stage, issue_type);

CREATE UNIQUE INDEX settings_key_key ON public.settings USING btree (key);

CREATE UNIQUE INDEX settings_pkey ON public.settings USING btree (id);

CREATE UNIQUE INDEX slack_configurations_pkey ON public.slack_configurations USING btree (id);

CREATE UNIQUE INDEX slack_messages_pkey ON public.slack_messages USING btree (id);

CREATE UNIQUE INDEX stage_transitions_pkey ON public.stage_transitions USING btree (id);

CREATE UNIQUE INDEX time_logs_pkey ON public.time_logs USING btree (id);

CREATE UNIQUE INDEX user_management_audit_log_pkey ON public.user_management_audit_log USING btree (id);

CREATE UNIQUE INDEX work_batches_pkey ON public.work_batches USING btree (id);

CREATE UNIQUE INDEX work_logs_pkey ON public.work_logs USING btree (id);

CREATE UNIQUE INDEX work_tasks_pkey ON public.work_tasks USING btree (id);

CREATE UNIQUE INDEX worker_invitations_email_key ON public.worker_invitations USING btree (email);

CREATE UNIQUE INDEX worker_invitations_invitation_token_key ON public.worker_invitations USING btree (invitation_token);

CREATE UNIQUE INDEX worker_invitations_pkey ON public.worker_invitations USING btree (id);

CREATE UNIQUE INDEX worker_stage_assignments_pkey ON public.worker_stage_assignments USING btree (id);

CREATE UNIQUE INDEX worker_stage_assignments_worker_id_stage_key ON public.worker_stage_assignments USING btree (worker_id, stage);

CREATE UNIQUE INDEX workers_auth_user_id_key ON public.workers USING btree (auth_user_id);

CREATE UNIQUE INDEX workers_email_key ON public.workers USING btree (email);

CREATE UNIQUE INDEX workers_pkey ON public.workers USING btree (id);

CREATE UNIQUE INDEX workflow_execution_log_pkey ON public.workflow_execution_log USING btree (id);

CREATE UNIQUE INDEX workflow_performance_metrics_pkey ON public.workflow_performance_metrics USING btree (id);

CREATE UNIQUE INDEX workflow_performance_metrics_workflow_template_id_stage_met_key ON public.workflow_performance_metrics USING btree (workflow_template_id, stage, metric_date);

CREATE UNIQUE INDEX workflow_templates_pkey ON public.workflow_templates USING btree (id);

alter table "public"."analytics_refresh_log" add constraint "analytics_refresh_log_pkey" PRIMARY KEY using index "analytics_refresh_log_pkey";

alter table "public"."application_logs" add constraint "application_logs_pkey" PRIMARY KEY using index "application_logs_pkey";

alter table "public"."automation_execution_log" add constraint "automation_execution_log_pkey" PRIMARY KEY using index "automation_execution_log_pkey";

alter table "public"."automation_executions" add constraint "automation_executions_pkey" PRIMARY KEY using index "automation_executions_pkey";

alter table "public"."automation_metrics" add constraint "automation_metrics_pkey" PRIMARY KEY using index "automation_metrics_pkey";

alter table "public"."automation_rules" add constraint "automation_rules_pkey" PRIMARY KEY using index "automation_rules_pkey";

alter table "public"."automation_templates" add constraint "automation_templates_pkey" PRIMARY KEY using index "automation_templates_pkey";

alter table "public"."component_tracking" add constraint "component_tracking_pkey" PRIMARY KEY using index "component_tracking_pkey";

alter table "public"."custom_stages" add constraint "custom_stages_pkey" PRIMARY KEY using index "custom_stages_pkey";

alter table "public"."inspection_results" add constraint "inspection_results_pkey" PRIMARY KEY using index "inspection_results_pkey";

alter table "public"."notification_preferences" add constraint "notification_preferences_pkey" PRIMARY KEY using index "notification_preferences_pkey";

alter table "public"."notification_queue" add constraint "notification_queue_pkey" PRIMARY KEY using index "notification_queue_pkey";

alter table "public"."order_items" add constraint "order_items_pkey" PRIMARY KEY using index "order_items_pkey";

alter table "public"."orders" add constraint "orders_pkey" PRIMARY KEY using index "orders_pkey";

alter table "public"."production_issues" add constraint "production_issues_pkey" PRIMARY KEY using index "production_issues_pkey";

alter table "public"."qc_checklist_items" add constraint "qc_checklist_items_pkey" PRIMARY KEY using index "qc_checklist_items_pkey";

alter table "public"."qc_production_steps" add constraint "qc_production_steps_pkey" PRIMARY KEY using index "qc_production_steps_pkey";

alter table "public"."qc_results" add constraint "qc_results_pkey" PRIMARY KEY using index "qc_results_pkey";

alter table "public"."qc_submissions" add constraint "qc_submissions_pkey" PRIMARY KEY using index "qc_submissions_pkey";

alter table "public"."qc_templates" add constraint "qc_templates_pkey" PRIMARY KEY using index "qc_templates_pkey";

alter table "public"."quality_checkpoint_templates" add constraint "quality_checkpoint_templates_pkey" PRIMARY KEY using index "quality_checkpoint_templates_pkey";

alter table "public"."quality_checkpoints" add constraint "quality_checkpoints_pkey" PRIMARY KEY using index "quality_checkpoints_pkey";

alter table "public"."quality_holds" add constraint "quality_holds_pkey" PRIMARY KEY using index "quality_holds_pkey";

alter table "public"."quality_patterns" add constraint "quality_patterns_pkey" PRIMARY KEY using index "quality_patterns_pkey";

alter table "public"."settings" add constraint "settings_pkey" PRIMARY KEY using index "settings_pkey";

alter table "public"."slack_configurations" add constraint "slack_configurations_pkey" PRIMARY KEY using index "slack_configurations_pkey";

alter table "public"."slack_messages" add constraint "slack_messages_pkey" PRIMARY KEY using index "slack_messages_pkey";

alter table "public"."stage_transitions" add constraint "stage_transitions_pkey" PRIMARY KEY using index "stage_transitions_pkey";

alter table "public"."time_logs" add constraint "time_logs_pkey" PRIMARY KEY using index "time_logs_pkey";

alter table "public"."user_management_audit_log" add constraint "user_management_audit_log_pkey" PRIMARY KEY using index "user_management_audit_log_pkey";

alter table "public"."work_batches" add constraint "work_batches_pkey" PRIMARY KEY using index "work_batches_pkey";

alter table "public"."work_logs" add constraint "work_logs_pkey" PRIMARY KEY using index "work_logs_pkey";

alter table "public"."work_tasks" add constraint "work_tasks_pkey" PRIMARY KEY using index "work_tasks_pkey";

alter table "public"."worker_invitations" add constraint "worker_invitations_pkey" PRIMARY KEY using index "worker_invitations_pkey";

alter table "public"."worker_stage_assignments" add constraint "worker_stage_assignments_pkey" PRIMARY KEY using index "worker_stage_assignments_pkey";

alter table "public"."workers" add constraint "workers_pkey" PRIMARY KEY using index "workers_pkey";

alter table "public"."workflow_execution_log" add constraint "workflow_execution_log_pkey" PRIMARY KEY using index "workflow_execution_log_pkey";

alter table "public"."workflow_performance_metrics" add constraint "workflow_performance_metrics_pkey" PRIMARY KEY using index "workflow_performance_metrics_pkey";

alter table "public"."workflow_templates" add constraint "workflow_templates_pkey" PRIMARY KEY using index "workflow_templates_pkey";

alter table "public"."analytics_refresh_log" add constraint "analytics_refresh_log_status_check" CHECK ((status = ANY (ARRAY['success'::text, 'failed'::text]))) not valid;

alter table "public"."analytics_refresh_log" validate constraint "analytics_refresh_log_status_check";

alter table "public"."application_logs" add constraint "chk_log_level" CHECK ((level = ANY (ARRAY[0, 1, 2, 3]))) not valid;

alter table "public"."application_logs" validate constraint "chk_log_level";

alter table "public"."automation_execution_log" add constraint "automation_execution_log_execution_status_check" CHECK ((execution_status = ANY (ARRAY['success'::text, 'failed'::text, 'partial'::text]))) not valid;

alter table "public"."automation_execution_log" validate constraint "automation_execution_log_execution_status_check";

alter table "public"."automation_execution_log" add constraint "automation_execution_log_rule_id_fkey" FOREIGN KEY (rule_id) REFERENCES automation_rules(id) ON DELETE CASCADE not valid;

alter table "public"."automation_execution_log" validate constraint "automation_execution_log_rule_id_fkey";

alter table "public"."automation_executions" add constraint "automation_executions_automation_rule_id_fkey" FOREIGN KEY (automation_rule_id) REFERENCES automation_rules(id) not valid;

alter table "public"."automation_executions" validate constraint "automation_executions_automation_rule_id_fkey";

alter table "public"."automation_executions" add constraint "automation_executions_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES work_batches(id) not valid;

alter table "public"."automation_executions" validate constraint "automation_executions_batch_id_fkey";

alter table "public"."automation_executions" add constraint "automation_executions_execution_status_check" CHECK ((execution_status = ANY (ARRAY['success'::text, 'failed'::text, 'partial'::text, 'skipped'::text]))) not valid;

alter table "public"."automation_executions" validate constraint "automation_executions_execution_status_check";

alter table "public"."automation_executions" add constraint "automation_executions_task_id_fkey" FOREIGN KEY (task_id) REFERENCES work_tasks(id) not valid;

alter table "public"."automation_executions" validate constraint "automation_executions_task_id_fkey";

alter table "public"."automation_executions" add constraint "automation_executions_workflow_template_id_fkey" FOREIGN KEY (workflow_template_id) REFERENCES workflow_templates(id) not valid;

alter table "public"."automation_executions" validate constraint "automation_executions_workflow_template_id_fkey";

alter table "public"."automation_metrics" add constraint "automation_metrics_automation_rule_id_date_key" UNIQUE using index "automation_metrics_automation_rule_id_date_key";

alter table "public"."automation_metrics" add constraint "automation_metrics_automation_rule_id_fkey" FOREIGN KEY (automation_rule_id) REFERENCES automation_rules(id) not valid;

alter table "public"."automation_metrics" validate constraint "automation_metrics_automation_rule_id_fkey";

alter table "public"."automation_rules" add constraint "automation_rules_created_by_id_fkey" FOREIGN KEY (created_by_id) REFERENCES workers(id) not valid;

alter table "public"."automation_rules" validate constraint "automation_rules_created_by_id_fkey";

alter table "public"."automation_rules" add constraint "automation_rules_updated_by_id_fkey" FOREIGN KEY (updated_by_id) REFERENCES workers(id) not valid;

alter table "public"."automation_rules" validate constraint "automation_rules_updated_by_id_fkey";

alter table "public"."automation_rules" add constraint "automation_rules_workflow_template_id_fkey" FOREIGN KEY (workflow_template_id) REFERENCES workflow_templates(id) not valid;

alter table "public"."automation_rules" validate constraint "automation_rules_workflow_template_id_fkey";

alter table "public"."automation_rules" add constraint "valid_trigger_type" CHECK (((trigger_config ->> 'type'::text) = ANY (ARRAY['stage_complete'::text, 'time_elapsed'::text, 'manual'::text, 'schedule'::text, 'batch_size'::text, 'bottleneck_detected'::text]))) not valid;

alter table "public"."automation_rules" validate constraint "valid_trigger_type";

alter table "public"."automation_templates" add constraint "automation_templates_category_check" CHECK ((category = ANY (ARRAY['productivity'::text, 'quality'::text, 'notifications'::text, 'assignment'::text, 'custom'::text]))) not valid;

alter table "public"."automation_templates" validate constraint "automation_templates_category_check";

alter table "public"."automation_templates" add constraint "automation_templates_created_by_id_fkey" FOREIGN KEY (created_by_id) REFERENCES workers(id) not valid;

alter table "public"."automation_templates" validate constraint "automation_templates_created_by_id_fkey";

alter table "public"."component_tracking" add constraint "component_tracking_cup_pair_id_key" UNIQUE using index "component_tracking_cup_pair_id_key";

alter table "public"."component_tracking" add constraint "component_tracking_grade_check" CHECK ((grade = ANY (ARRAY['A'::text, 'B'::text]))) not valid;

alter table "public"."component_tracking" validate constraint "component_tracking_grade_check";

alter table "public"."component_tracking" add constraint "component_tracking_left_cup_serial_key" UNIQUE using index "component_tracking_left_cup_serial_key";

alter table "public"."component_tracking" add constraint "component_tracking_right_cup_serial_key" UNIQUE using index "component_tracking_right_cup_serial_key";

alter table "public"."custom_stages" add constraint "custom_stages_created_by_id_fkey" FOREIGN KEY (created_by_id) REFERENCES workers(id) not valid;

alter table "public"."custom_stages" validate constraint "custom_stages_created_by_id_fkey";

alter table "public"."custom_stages" add constraint "custom_stages_stage_code_key" UNIQUE using index "custom_stages_stage_code_key";

alter table "public"."inspection_results" add constraint "inspection_results_checkpoint_id_fkey" FOREIGN KEY (checkpoint_id) REFERENCES quality_checkpoints(id) not valid;

alter table "public"."inspection_results" validate constraint "inspection_results_checkpoint_id_fkey";

alter table "public"."inspection_results" add constraint "inspection_results_component_tracking_id_fkey" FOREIGN KEY (component_tracking_id) REFERENCES component_tracking(id) not valid;

alter table "public"."inspection_results" validate constraint "inspection_results_component_tracking_id_fkey";

alter table "public"."inspection_results" add constraint "inspection_results_task_id_fkey" FOREIGN KEY (task_id) REFERENCES work_tasks(id) ON DELETE CASCADE not valid;

alter table "public"."inspection_results" validate constraint "inspection_results_task_id_fkey";

alter table "public"."inspection_results" add constraint "inspection_results_worker_id_fkey" FOREIGN KEY (worker_id) REFERENCES workers(id) not valid;

alter table "public"."inspection_results" validate constraint "inspection_results_worker_id_fkey";

alter table "public"."notification_preferences" add constraint "notification_preferences_worker_id_fkey" FOREIGN KEY (worker_id) REFERENCES workers(id) not valid;

alter table "public"."notification_preferences" validate constraint "notification_preferences_worker_id_fkey";

alter table "public"."notification_preferences" add constraint "notification_preferences_worker_id_key" UNIQUE using index "notification_preferences_worker_id_key";

alter table "public"."notification_queue" add constraint "notification_queue_notification_type_check" CHECK ((notification_type = ANY (ARRAY['slack'::text, 'email'::text, 'in_app'::text]))) not valid;

alter table "public"."notification_queue" validate constraint "notification_queue_notification_type_check";

alter table "public"."notification_queue" add constraint "notification_queue_recipient_type_check" CHECK ((recipient_type = ANY (ARRAY['worker'::text, 'manager'::text, 'channel'::text, 'all_managers'::text]))) not valid;

alter table "public"."notification_queue" validate constraint "notification_queue_recipient_type_check";

alter table "public"."notification_queue" add constraint "notification_queue_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text]))) not valid;

alter table "public"."notification_queue" validate constraint "notification_queue_status_check";

alter table "public"."order_items" add constraint "order_items_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE not valid;

alter table "public"."order_items" validate constraint "order_items_order_id_fkey";

alter table "public"."order_items" add constraint "order_items_quantity_check" CHECK ((quantity > 0)) not valid;

alter table "public"."order_items" validate constraint "order_items_quantity_check";

alter table "public"."order_items" add constraint "order_items_shopify_line_item_id_unique" UNIQUE using index "order_items_shopify_line_item_id_unique";

alter table "public"."orders" add constraint "orders_shopify_order_id_key" UNIQUE using index "orders_shopify_order_id_key";

alter table "public"."orders" add constraint "orders_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'assigned'::text, 'in_progress'::text, 'completed'::text, 'shipped'::text]))) not valid;

alter table "public"."orders" validate constraint "orders_status_check";

alter table "public"."production_issues" add constraint "production_issues_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES work_batches(id) not valid;

alter table "public"."production_issues" validate constraint "production_issues_batch_id_fkey";

alter table "public"."production_issues" add constraint "production_issues_issue_type_check" CHECK ((issue_type = ANY (ARRAY['defect'::text, 'material'::text, 'tooling'::text, 'process'::text, 'other'::text]))) not valid;

alter table "public"."production_issues" validate constraint "production_issues_issue_type_check";

alter table "public"."production_issues" add constraint "production_issues_order_item_id_fkey" FOREIGN KEY (order_item_id) REFERENCES order_items(id) not valid;

alter table "public"."production_issues" validate constraint "production_issues_order_item_id_fkey";

alter table "public"."production_issues" add constraint "production_issues_reported_by_id_fkey" FOREIGN KEY (reported_by_id) REFERENCES workers(id) not valid;

alter table "public"."production_issues" validate constraint "production_issues_reported_by_id_fkey";

alter table "public"."production_issues" add constraint "production_issues_resolution_status_check" CHECK ((resolution_status = ANY (ARRAY['open'::text, 'investigating'::text, 'resolved'::text, 'wont_fix'::text]))) not valid;

alter table "public"."production_issues" validate constraint "production_issues_resolution_status_check";

alter table "public"."production_issues" add constraint "production_issues_resolved_by_id_fkey" FOREIGN KEY (resolved_by_id) REFERENCES workers(id) not valid;

alter table "public"."production_issues" validate constraint "production_issues_resolved_by_id_fkey";

alter table "public"."production_issues" add constraint "production_issues_severity_check" CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))) not valid;

alter table "public"."production_issues" validate constraint "production_issues_severity_check";

alter table "public"."production_issues" add constraint "production_issues_task_id_fkey" FOREIGN KEY (task_id) REFERENCES work_tasks(id) not valid;

alter table "public"."production_issues" validate constraint "production_issues_task_id_fkey";

alter table "public"."qc_checklist_items" add constraint "qc_checklist_items_production_step_value_fkey" FOREIGN KEY (production_step_value) REFERENCES qc_production_steps(value) ON DELETE CASCADE not valid;

alter table "public"."qc_checklist_items" validate constraint "qc_checklist_items_production_step_value_fkey";

alter table "public"."qc_production_steps" add constraint "qc_production_steps_value_key" UNIQUE using index "qc_production_steps_value_key";

alter table "public"."qc_results" add constraint "qc_results_overall_status_check" CHECK ((overall_status = ANY (ARRAY['pass'::text, 'fail'::text, 'rework'::text]))) not valid;

alter table "public"."qc_results" validate constraint "qc_results_overall_status_check";

alter table "public"."qc_results" add constraint "qc_results_task_id_fkey" FOREIGN KEY (task_id) REFERENCES work_tasks(id) ON DELETE CASCADE not valid;

alter table "public"."qc_results" validate constraint "qc_results_task_id_fkey";

alter table "public"."qc_results" add constraint "qc_results_template_id_fkey" FOREIGN KEY (template_id) REFERENCES qc_templates(id) not valid;

alter table "public"."qc_results" validate constraint "qc_results_template_id_fkey";

alter table "public"."qc_results" add constraint "qc_results_worker_id_fkey" FOREIGN KEY (worker_id) REFERENCES workers(id) not valid;

alter table "public"."qc_results" validate constraint "qc_results_worker_id_fkey";

alter table "public"."qc_submissions" add constraint "qc_submissions_worker_id_fkey" FOREIGN KEY (worker_id) REFERENCES workers(id) not valid;

alter table "public"."qc_submissions" validate constraint "qc_submissions_worker_id_fkey";

alter table "public"."quality_checkpoint_templates" add constraint "quality_checkpoint_templates_checkpoint_type_check" CHECK ((checkpoint_type = ANY (ARRAY['pre_work'::text, 'in_process'::text, 'post_work'::text, 'gate'::text]))) not valid;

alter table "public"."quality_checkpoint_templates" validate constraint "quality_checkpoint_templates_checkpoint_type_check";

alter table "public"."quality_checkpoint_templates" add constraint "quality_checkpoint_templates_stage_name_checkpoint_type_tem_key" UNIQUE using index "quality_checkpoint_templates_stage_name_checkpoint_type_tem_key";

alter table "public"."quality_checkpoints" add constraint "quality_checkpoints_checkpoint_type_check" CHECK ((checkpoint_type = ANY (ARRAY['pre_work'::text, 'in_process'::text, 'post_work'::text, 'gate'::text]))) not valid;

alter table "public"."quality_checkpoints" validate constraint "quality_checkpoints_checkpoint_type_check";

alter table "public"."quality_checkpoints" add constraint "quality_checkpoints_on_failure_check" CHECK ((on_failure = ANY (ARRAY['block_progress'::text, 'warn_continue'::text, 'log_only'::text]))) not valid;

alter table "public"."quality_checkpoints" validate constraint "quality_checkpoints_on_failure_check";

alter table "public"."quality_checkpoints" add constraint "quality_checkpoints_severity_check" CHECK ((severity = ANY (ARRAY['critical'::text, 'major'::text, 'minor'::text]))) not valid;

alter table "public"."quality_checkpoints" validate constraint "quality_checkpoints_severity_check";

alter table "public"."quality_checkpoints" add constraint "quality_checkpoints_workflow_template_id_fkey" FOREIGN KEY (workflow_template_id) REFERENCES workflow_templates(id) ON DELETE CASCADE not valid;

alter table "public"."quality_checkpoints" validate constraint "quality_checkpoints_workflow_template_id_fkey";

alter table "public"."quality_checkpoints" add constraint "quality_checkpoints_workflow_template_id_stage_checkpoint_t_key" UNIQUE using index "quality_checkpoints_workflow_template_id_stage_checkpoint_t_key";

alter table "public"."quality_holds" add constraint "quality_holds_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES workers(id) not valid;

alter table "public"."quality_holds" validate constraint "quality_holds_assigned_to_fkey";

alter table "public"."quality_holds" add constraint "quality_holds_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES work_batches(id) ON DELETE CASCADE not valid;

alter table "public"."quality_holds" validate constraint "quality_holds_batch_id_fkey";

alter table "public"."quality_holds" add constraint "quality_holds_component_tracking_id_fkey" FOREIGN KEY (component_tracking_id) REFERENCES component_tracking(id) not valid;

alter table "public"."quality_holds" validate constraint "quality_holds_component_tracking_id_fkey";

alter table "public"."quality_holds" add constraint "quality_holds_reported_by_fkey" FOREIGN KEY (reported_by) REFERENCES workers(id) not valid;

alter table "public"."quality_holds" validate constraint "quality_holds_reported_by_fkey";

alter table "public"."quality_holds" add constraint "quality_holds_severity_check" CHECK ((severity = ANY (ARRAY['critical'::text, 'major'::text, 'minor'::text]))) not valid;

alter table "public"."quality_holds" validate constraint "quality_holds_severity_check";

alter table "public"."quality_holds" add constraint "quality_holds_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'investigating'::text, 'resolved'::text, 'escalated'::text]))) not valid;

alter table "public"."quality_holds" validate constraint "quality_holds_status_check";

alter table "public"."quality_patterns" add constraint "quality_patterns_severity_trend_check" CHECK ((severity_trend = ANY (ARRAY['increasing'::text, 'stable'::text, 'decreasing'::text]))) not valid;

alter table "public"."quality_patterns" validate constraint "quality_patterns_severity_trend_check";

alter table "public"."quality_patterns" add constraint "quality_patterns_stage_issue_type_key" UNIQUE using index "quality_patterns_stage_issue_type_key";

alter table "public"."settings" add constraint "settings_key_key" UNIQUE using index "settings_key_key";

alter table "public"."settings" add constraint "settings_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES workers(id) not valid;

alter table "public"."settings" validate constraint "settings_updated_by_fkey";

alter table "public"."slack_configurations" add constraint "slack_configurations_created_by_id_fkey" FOREIGN KEY (created_by_id) REFERENCES workers(id) not valid;

alter table "public"."slack_configurations" validate constraint "slack_configurations_created_by_id_fkey";

alter table "public"."slack_messages" add constraint "slack_messages_message_type_check" CHECK ((message_type = ANY (ARRAY['issue_report'::text, 'issue_resolved'::text, 'workflow_complete'::text, 'bottleneck_alert'::text, 'daily_summary'::text, 'stage_transition'::text]))) not valid;

alter table "public"."slack_messages" validate constraint "slack_messages_message_type_check";

alter table "public"."slack_messages" add constraint "slack_messages_related_entity_type_check" CHECK ((related_entity_type = ANY (ARRAY['issue'::text, 'batch'::text, 'workflow'::text, 'task'::text]))) not valid;

alter table "public"."slack_messages" validate constraint "slack_messages_related_entity_type_check";

alter table "public"."stage_transitions" add constraint "either_batch_or_item" CHECK ((((batch_id IS NOT NULL) AND (order_item_id IS NULL)) OR ((batch_id IS NULL) AND (order_item_id IS NOT NULL)))) not valid;

alter table "public"."stage_transitions" validate constraint "either_batch_or_item";

alter table "public"."stage_transitions" add constraint "stage_transitions_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES work_batches(id) not valid;

alter table "public"."stage_transitions" validate constraint "stage_transitions_batch_id_fkey";

alter table "public"."stage_transitions" add constraint "stage_transitions_order_item_id_fkey" FOREIGN KEY (order_item_id) REFERENCES order_items(id) not valid;

alter table "public"."stage_transitions" validate constraint "stage_transitions_order_item_id_fkey";

alter table "public"."stage_transitions" add constraint "stage_transitions_transition_type_check" CHECK ((transition_type = ANY (ARRAY['auto'::text, 'manual'::text, 'conditional'::text]))) not valid;

alter table "public"."stage_transitions" validate constraint "stage_transitions_transition_type_check";

alter table "public"."stage_transitions" add constraint "stage_transitions_transitioned_by_id_fkey" FOREIGN KEY (transitioned_by_id) REFERENCES workers(id) not valid;

alter table "public"."stage_transitions" validate constraint "stage_transitions_transitioned_by_id_fkey";

alter table "public"."stage_transitions" add constraint "stage_transitions_workflow_template_id_fkey" FOREIGN KEY (workflow_template_id) REFERENCES workflow_templates(id) not valid;

alter table "public"."stage_transitions" validate constraint "stage_transitions_workflow_template_id_fkey";

alter table "public"."time_logs" add constraint "either_task_or_batch" CHECK ((((task_id IS NOT NULL) AND (batch_id IS NULL)) OR ((task_id IS NULL) AND (batch_id IS NOT NULL)))) not valid;

alter table "public"."time_logs" validate constraint "either_task_or_batch";

alter table "public"."time_logs" add constraint "time_logs_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES work_batches(id) not valid;

alter table "public"."time_logs" validate constraint "time_logs_batch_id_fkey";

alter table "public"."time_logs" add constraint "time_logs_task_id_fkey" FOREIGN KEY (task_id) REFERENCES work_tasks(id) not valid;

alter table "public"."time_logs" validate constraint "time_logs_task_id_fkey";

alter table "public"."time_logs" add constraint "time_logs_worker_id_fkey" FOREIGN KEY (worker_id) REFERENCES workers(id) not valid;

alter table "public"."time_logs" validate constraint "time_logs_worker_id_fkey";

alter table "public"."user_management_audit_log" add constraint "user_management_audit_log_action_type_check" CHECK ((action_type = ANY (ARRAY['approve'::text, 'reject'::text, 'suspend'::text, 'reactivate'::text, 'role_change'::text, 'invite_sent'::text, 'invite_accepted'::text]))) not valid;

alter table "public"."user_management_audit_log" validate constraint "user_management_audit_log_action_type_check";

alter table "public"."user_management_audit_log" add constraint "user_management_audit_log_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES workers(id) not valid;

alter table "public"."user_management_audit_log" validate constraint "user_management_audit_log_actor_id_fkey";

alter table "public"."user_management_audit_log" add constraint "user_management_audit_log_target_worker_id_fkey" FOREIGN KEY (target_worker_id) REFERENCES workers(id) not valid;

alter table "public"."user_management_audit_log" validate constraint "user_management_audit_log_target_worker_id_fkey";

alter table "public"."work_batches" add constraint "work_batches_batch_type_check" CHECK ((batch_type = ANY (ARRAY['model'::text, 'wood_type'::text, 'custom'::text]))) not valid;

alter table "public"."work_batches" validate constraint "work_batches_batch_type_check";

alter table "public"."work_batches" add constraint "work_batches_quality_hold_id_fkey" FOREIGN KEY (quality_hold_id) REFERENCES quality_holds(id) not valid;

alter table "public"."work_batches" validate constraint "work_batches_quality_hold_id_fkey";

alter table "public"."work_batches" add constraint "work_batches_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'completed'::text, 'on_hold'::text]))) not valid;

alter table "public"."work_batches" validate constraint "work_batches_status_check";

alter table "public"."work_batches" add constraint "work_batches_workflow_template_id_fkey" FOREIGN KEY (workflow_template_id) REFERENCES workflow_templates(id) not valid;

alter table "public"."work_batches" validate constraint "work_batches_workflow_template_id_fkey";

alter table "public"."work_logs" add constraint "work_logs_log_type_check" CHECK ((log_type = ANY (ARRAY['start'::text, 'pause'::text, 'resume'::text, 'complete'::text, 'note'::text]))) not valid;

alter table "public"."work_logs" validate constraint "work_logs_log_type_check";

alter table "public"."work_logs" add constraint "work_logs_task_id_fkey" FOREIGN KEY (task_id) REFERENCES work_tasks(id) ON DELETE CASCADE not valid;

alter table "public"."work_logs" validate constraint "work_logs_task_id_fkey";

alter table "public"."work_logs" add constraint "work_logs_worker_id_fkey" FOREIGN KEY (worker_id) REFERENCES workers(id) not valid;

alter table "public"."work_logs" validate constraint "work_logs_worker_id_fkey";

alter table "public"."work_tasks" add constraint "work_tasks_assigned_by_id_fkey" FOREIGN KEY (assigned_by_id) REFERENCES workers(id) not valid;

alter table "public"."work_tasks" validate constraint "work_tasks_assigned_by_id_fkey";

alter table "public"."work_tasks" add constraint "work_tasks_assigned_to_id_fkey" FOREIGN KEY (assigned_to_id) REFERENCES workers(id) not valid;

alter table "public"."work_tasks" validate constraint "work_tasks_assigned_to_id_fkey";

alter table "public"."work_tasks" add constraint "work_tasks_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES work_batches(id) not valid;

alter table "public"."work_tasks" validate constraint "work_tasks_batch_id_fkey";

alter table "public"."work_tasks" add constraint "work_tasks_component_tracking_id_fkey" FOREIGN KEY (component_tracking_id) REFERENCES component_tracking(id) not valid;

alter table "public"."work_tasks" validate constraint "work_tasks_component_tracking_id_fkey";

alter table "public"."work_tasks" add constraint "work_tasks_order_item_id_fkey" FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE not valid;

alter table "public"."work_tasks" validate constraint "work_tasks_order_item_id_fkey";

alter table "public"."work_tasks" add constraint "work_tasks_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))) not valid;

alter table "public"."work_tasks" validate constraint "work_tasks_priority_check";

alter table "public"."work_tasks" add constraint "work_tasks_stage_or_type_check" CHECK (((task_type IS NOT NULL) OR (stage IS NOT NULL))) not valid;

alter table "public"."work_tasks" validate constraint "work_tasks_stage_or_type_check";

alter table "public"."work_tasks" add constraint "work_tasks_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'assigned'::text, 'in_progress'::text, 'completed'::text, 'blocked'::text]))) not valid;

alter table "public"."work_tasks" validate constraint "work_tasks_status_check";

alter table "public"."work_tasks" add constraint "work_tasks_workflow_template_id_fkey" FOREIGN KEY (workflow_template_id) REFERENCES workflow_templates(id) not valid;

alter table "public"."work_tasks" validate constraint "work_tasks_workflow_template_id_fkey";

alter table "public"."worker_invitations" add constraint "worker_invitations_email_key" UNIQUE using index "worker_invitations_email_key";

alter table "public"."worker_invitations" add constraint "worker_invitations_invitation_token_key" UNIQUE using index "worker_invitations_invitation_token_key";

alter table "public"."worker_invitations" add constraint "worker_invitations_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES workers(id) not valid;

alter table "public"."worker_invitations" validate constraint "worker_invitations_invited_by_fkey";

alter table "public"."worker_invitations" add constraint "worker_invitations_role_check" CHECK ((role = ANY (ARRAY['worker'::text, 'supervisor'::text, 'manager'::text]))) not valid;

alter table "public"."worker_invitations" validate constraint "worker_invitations_role_check";

alter table "public"."worker_stage_assignments" add constraint "worker_stage_assignments_assigned_by_id_fkey" FOREIGN KEY (assigned_by_id) REFERENCES workers(id) not valid;

alter table "public"."worker_stage_assignments" validate constraint "worker_stage_assignments_assigned_by_id_fkey";

alter table "public"."worker_stage_assignments" add constraint "worker_stage_assignments_skill_level_check" CHECK ((skill_level = ANY (ARRAY['trainee'::text, 'competent'::text, 'expert'::text]))) not valid;

alter table "public"."worker_stage_assignments" validate constraint "worker_stage_assignments_skill_level_check";

alter table "public"."worker_stage_assignments" add constraint "worker_stage_assignments_worker_id_fkey" FOREIGN KEY (worker_id) REFERENCES workers(id) not valid;

alter table "public"."worker_stage_assignments" validate constraint "worker_stage_assignments_worker_id_fkey";

alter table "public"."worker_stage_assignments" add constraint "worker_stage_assignments_worker_id_stage_key" UNIQUE using index "worker_stage_assignments_worker_id_stage_key";

alter table "public"."workers" add constraint "workers_approval_status_check" CHECK ((approval_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'suspended'::text]))) not valid;

alter table "public"."workers" validate constraint "workers_approval_status_check";

alter table "public"."workers" add constraint "workers_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES workers(id) not valid;

alter table "public"."workers" validate constraint "workers_approved_by_fkey";

alter table "public"."workers" add constraint "workers_auth_user_id_fkey" FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."workers" validate constraint "workers_auth_user_id_fkey";

alter table "public"."workers" add constraint "workers_auth_user_id_key" UNIQUE using index "workers_auth_user_id_key";

alter table "public"."workers" add constraint "workers_email_key" UNIQUE using index "workers_email_key";

alter table "public"."workers" add constraint "workers_role_check" CHECK ((role = ANY (ARRAY['worker'::text, 'supervisor'::text, 'manager'::text]))) not valid;

alter table "public"."workers" validate constraint "workers_role_check";

alter table "public"."workflow_execution_log" add constraint "workflow_execution_log_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES work_batches(id) not valid;

alter table "public"."workflow_execution_log" validate constraint "workflow_execution_log_batch_id_fkey";

alter table "public"."workflow_execution_log" add constraint "workflow_execution_log_executed_by_id_fkey" FOREIGN KEY (executed_by_id) REFERENCES workers(id) not valid;

alter table "public"."workflow_execution_log" validate constraint "workflow_execution_log_executed_by_id_fkey";

alter table "public"."workflow_execution_log" add constraint "workflow_execution_log_execution_type_check" CHECK ((execution_type = ANY (ARRAY['auto'::text, 'manual'::text]))) not valid;

alter table "public"."workflow_execution_log" validate constraint "workflow_execution_log_execution_type_check";

alter table "public"."workflow_execution_log" add constraint "workflow_execution_log_order_item_id_fkey" FOREIGN KEY (order_item_id) REFERENCES order_items(id) not valid;

alter table "public"."workflow_execution_log" validate constraint "workflow_execution_log_order_item_id_fkey";

alter table "public"."workflow_execution_log" add constraint "workflow_execution_log_workflow_template_id_fkey" FOREIGN KEY (workflow_template_id) REFERENCES workflow_templates(id) not valid;

alter table "public"."workflow_execution_log" validate constraint "workflow_execution_log_workflow_template_id_fkey";

alter table "public"."workflow_performance_metrics" add constraint "workflow_performance_metrics_workflow_template_id_fkey" FOREIGN KEY (workflow_template_id) REFERENCES workflow_templates(id) ON DELETE CASCADE not valid;

alter table "public"."workflow_performance_metrics" validate constraint "workflow_performance_metrics_workflow_template_id_fkey";

alter table "public"."workflow_performance_metrics" add constraint "workflow_performance_metrics_workflow_template_id_stage_met_key" UNIQUE using index "workflow_performance_metrics_workflow_template_id_stage_met_key";

alter table "public"."workflow_templates" add constraint "workflow_templates_created_by_id_fkey" FOREIGN KEY (created_by_id) REFERENCES workers(id) not valid;

alter table "public"."workflow_templates" validate constraint "workflow_templates_created_by_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.approve_worker(p_worker_id uuid, p_approved_by_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Update worker status
  UPDATE workers
  SET 
    approval_status = 'approved',
    approved_by = p_approved_by_id,
    approved_at = NOW(),
    is_active = true
  WHERE id = p_worker_id
  AND approval_status = 'pending';

  RETURN FOUND;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete logs older than 30 days (adjust as needed)
  DELETE FROM application_logs 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$function$
;

create or replace view "public"."current_production_status" as  SELECT wb.id AS batch_id,
    wb.name AS batch_name,
    wb.current_stage,
    wb.status AS batch_status,
    wt.name AS workflow_name,
    count(wt_tasks.id) AS total_tasks,
    count(
        CASE
            WHEN (wt_tasks.status = 'completed'::text) THEN 1
            ELSE NULL::integer
        END) AS completed_tasks,
    count(
        CASE
            WHEN (wt_tasks.status = 'in_progress'::text) THEN 1
            ELSE NULL::integer
        END) AS active_tasks,
    count(
        CASE
            WHEN (wt_tasks.status = 'assigned'::text) THEN 1
            ELSE NULL::integer
        END) AS pending_tasks,
    COALESCE(round((EXTRACT(epoch FROM (now() - last_transition.transition_time)) / (3600)::numeric), 1), (0)::numeric) AS hours_in_current_stage,
    string_agg(DISTINCT w.name, ', '::text ORDER BY w.name) AS assigned_workers,
    count(DISTINCT w.id) AS worker_count,
    count(pi.id) AS open_issues,
    COALESCE(max(
        CASE pi.severity
            WHEN 'critical'::text THEN 4
            WHEN 'high'::text THEN 3
            WHEN 'medium'::text THEN 2
            WHEN 'low'::text THEN 1
            ELSE 0
        END), 0) AS severity_score,
    wb.created_at,
    wb.updated_at
   FROM (((((work_batches wb
     LEFT JOIN workflow_templates wt ON ((wt.id = wb.workflow_template_id)))
     LEFT JOIN work_tasks wt_tasks ON ((wt_tasks.batch_id = wb.id)))
     LEFT JOIN workers w ON (((w.id = wt_tasks.assigned_to_id) AND (w.is_active = true))))
     LEFT JOIN ( SELECT DISTINCT ON (stage_transitions.batch_id) stage_transitions.batch_id,
            stage_transitions.transition_time
           FROM stage_transitions
          ORDER BY stage_transitions.batch_id, stage_transitions.transition_time DESC) last_transition ON ((last_transition.batch_id = wb.id)))
     LEFT JOIN production_issues pi ON (((pi.batch_id = wb.id) AND (pi.resolution_status = 'open'::text))))
  WHERE (wb.status = ANY (ARRAY['pending'::text, 'active'::text]))
  GROUP BY wb.id, wb.name, wb.current_stage, wb.status, wt.name, wb.created_at, wb.updated_at, last_transition.transition_time;


CREATE OR REPLACE FUNCTION public.detect_workflow_bottlenecks()
 RETURNS TABLE(workflow_name text, stage text, avg_hours numeric, severity text, recommendation text)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    wb.workflow_name,
    wb.stage,
    wb.avg_hours_in_stage,
    CASE 
      WHEN wb.stage_bottleneck_rank = 1 AND wb.avg_hours_in_stage > 8 THEN 'critical'
      WHEN wb.stage_bottleneck_rank <= 2 AND wb.avg_hours_in_stage > 4 THEN 'high'
      WHEN wb.stage_bottleneck_rank <= 3 AND wb.avg_hours_in_stage > 2 THEN 'medium'
      ELSE 'low'
    END as severity,
    CASE 
      WHEN wb.avg_automation_rate < 50 THEN 'Consider adding automation rules'
      WHEN wb.avg_daily_issues > 1 THEN 'High issue rate - review quality process'
      WHEN wb.performance_trend = 'getting_slower' THEN 'Performance declining - investigate causes'
      ELSE 'Monitor for improvements'
    END as recommendation
  FROM workflow_bottlenecks wb
  WHERE wb.stage_bottleneck_rank <= 5
  ORDER BY wb.avg_hours_in_stage DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_serial_number(model text, year integer DEFAULT (EXTRACT(year FROM now()))::integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    counter INTEGER;
    serial TEXT;
BEGIN
    -- Get the next counter for this model and year
    SELECT COUNT(*) + 1 INTO counter
    FROM component_tracking
    WHERE specifications->>'model' = model
    AND EXTRACT(YEAR FROM created_at) = year;
    
    -- Format: ZMF-YYYY-MODEL-NNNNN
    serial := FORMAT('ZMF-%s-%s-%s', year, UPPER(LEFT(model, 3)), LPAD(counter::TEXT, 5, '0'));
    
    RETURN serial;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_error_patterns(days integer DEFAULT 7)
 RETURNS TABLE(error_pattern text, occurrences bigint, first_seen timestamp with time zone, last_seen timestamp with time zone, contexts text[], sample_correlation_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(al.error_name, 'Unknown') as error_pattern,
    COUNT(*) as occurrences,
    MIN(al.created_at) as first_seen,
    MAX(al.created_at) as last_seen,
    ARRAY_AGG(DISTINCT al.context) as contexts,
    (ARRAY_AGG(al.correlation_id))[1] as sample_correlation_id
  FROM application_logs al
  WHERE 
    al.level = 0 -- ERROR level
    AND al.created_at >= NOW() - (days || ' days')::INTERVAL
  GROUP BY COALESCE(al.error_name, 'Unknown')
  ORDER BY occurrences DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_invitation record;
  v_is_pre_approved boolean := false;
  v_approved_by uuid;
BEGIN
  -- Check if this email has a pending invitation
  SELECT * INTO v_invitation
  FROM public.worker_invitations
  WHERE email = new.email
    AND accepted_at IS NULL
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If invitation exists, mark as pre-approved
  IF FOUND THEN
    v_is_pre_approved := true;
    v_approved_by := v_invitation.invited_by;
    
    -- Mark invitation as accepted
    UPDATE public.worker_invitations
    SET accepted_at = NOW()
    WHERE id = v_invitation.id;
  END IF;
  
  -- Create a worker entry for the new user
  INSERT INTO public.workers (
    auth_user_id,
    email,
    name,
    role,
    is_active,
    approval_status,
    approved_at,
    approved_by,
    skills
  ) VALUES (
    new.id,
    new.email,
    COALESCE(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    COALESCE(v_invitation.role, 'worker'),
    v_is_pre_approved,
    CASE WHEN v_is_pre_approved THEN 'approved' ELSE 'pending' END,
    CASE WHEN v_is_pre_approved THEN NOW() ELSE NULL END,
    v_approved_by,
    ARRAY[]::text[]
  );
  
  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    -- If worker already exists, update it
    UPDATE public.workers
    SET 
      auth_user_id = new.id,
      name = COALESCE(
        new.raw_user_meta_data->>'name',
        new.raw_user_meta_data->>'full_name',
        name
      )
    WHERE email = new.email;
    RETURN new;
  WHEN OTHERS THEN
    -- Log error but don't block signup
    RAISE WARNING 'Failed to create worker entry for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$function$
;

create or replace view "public"."headphone_order_items" as  SELECT oi.id,
    oi.order_id,
    oi.shopify_line_item_id,
    oi.product_name,
    oi.variant_title,
    oi.quantity,
    oi.price,
    oi.sku,
    oi.product_data,
    oi.created_at,
    oi.headphone_material,
    oi.headphone_color,
    oi.product_category,
    oi.requires_custom_work,
    ((oi.product_data -> 'headphone_specs'::text) ->> 'material'::text) AS material,
    ((oi.product_data -> 'headphone_specs'::text) ->> 'color'::text) AS color,
    ((oi.product_data -> 'headphone_specs'::text) ->> 'pad_type'::text) AS pad_type,
    ((oi.product_data -> 'headphone_specs'::text) ->> 'cable_type'::text) AS cable_type,
    ((oi.product_data -> 'headphone_specs'::text) ->> 'impedance'::text) AS impedance,
    ((oi.product_data -> 'headphone_specs'::text) ->> 'custom_engraving'::text) AS custom_engraving,
    (((oi.product_data -> 'headphone_specs'::text) ->> 'bundle_component'::text))::boolean AS bundle_component,
    o.order_number,
    o.customer_name,
    o.order_date,
    o.status AS order_status
   FROM (order_items oi
     JOIN orders o ON ((oi.order_id = o.id)))
  WHERE ((oi.product_category = 'headphone'::text) OR (oi.product_name ~~* '%headphone%'::text) OR (oi.product_name ~~* '%atrium%'::text) OR (oi.product_name ~~* '%aeon%'::text));


CREATE OR REPLACE FUNCTION public.is_manager()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.workers 
    WHERE auth_user_id = auth.uid() 
    AND role = 'manager' 
    AND is_active = true
  );
$function$
;

create or replace view "public"."log_analytics" as  SELECT date(application_logs.created_at) AS log_date,
    application_logs.context,
    application_logs.level,
    count(*) AS total_logs,
    count(*) FILTER (WHERE (application_logs.level = 0)) AS error_count,
    count(*) FILTER (WHERE (application_logs.level = 1)) AS warn_count,
    count(*) FILTER (WHERE (application_logs.level = 2)) AS info_count,
    count(*) FILTER (WHERE (application_logs.level = 3)) AS debug_count,
    avg(application_logs.api_duration) FILTER (WHERE (application_logs.api_duration IS NOT NULL)) AS avg_api_duration,
    max(application_logs.api_duration) FILTER (WHERE (application_logs.api_duration IS NOT NULL)) AS max_api_duration,
    avg(application_logs.db_duration) FILTER (WHERE (application_logs.db_duration IS NOT NULL)) AS avg_db_duration,
    max(application_logs.db_duration) FILTER (WHERE (application_logs.db_duration IS NOT NULL)) AS max_db_duration
   FROM application_logs
  GROUP BY (date(application_logs.created_at)), application_logs.context, application_logs.level
  ORDER BY (date(application_logs.created_at)) DESC, application_logs.context, application_logs.level;


CREATE OR REPLACE FUNCTION public.reactivate_worker(p_worker_id uuid, p_reactivated_by_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Update worker status
  UPDATE workers
  SET 
    approval_status = 'approved',
    suspension_reason = NULL,
    suspended_at = NULL,
    is_active = true
  WHERE id = p_worker_id
  AND approval_status = 'suspended';

  RETURN FOUND;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_analytics_views()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  duration_ms INTEGER;
BEGIN
  start_time := clock_timestamp();
  
  REFRESH MATERIALIZED VIEW workflow_daily_metrics;
  REFRESH MATERIALIZED VIEW workflow_bottlenecks;
  REFRESH MATERIALIZED VIEW worker_productivity_metrics;
  
  end_time := clock_timestamp();
  duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
  
  -- Log the refresh
  INSERT INTO analytics_refresh_log (refresh_type, status, duration_ms)
  VALUES ('all_views', 'success', duration_ms);
  
EXCEPTION WHEN OTHERS THEN
  -- Log the error
  INSERT INTO analytics_refresh_log (refresh_type, status, error_message)
  VALUES ('all_views', 'failed', SQLERRM);
  
  RAISE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.reject_worker(p_worker_id uuid, p_rejected_by_id uuid, p_reason text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Update worker status
  UPDATE workers
  SET 
    approval_status = 'rejected',
    rejection_reason = p_reason,
    approved_by = p_rejected_by_id,
    approved_at = NOW(),
    is_active = false
  WHERE id = p_worker_id
  AND approval_status = 'pending';

  RETURN FOUND;
END;
$function$
;

create or replace view "public"."stage_durations" as  SELECT st.id,
    st.workflow_template_id,
    st.batch_id,
    st.order_item_id,
    st.from_stage,
    st.to_stage,
    st.transition_time,
    st.transition_type,
    COALESCE((st.batch_id)::text, (st.order_item_id)::text) AS entity_id,
    (EXTRACT(epoch FROM (st.transition_time - lag(st.transition_time) OVER (PARTITION BY COALESCE(st.batch_id, st.order_item_id), st.workflow_template_id ORDER BY st.transition_time))) / (3600)::numeric) AS hours_in_previous_stage
   FROM stage_transitions st;


CREATE OR REPLACE FUNCTION public.suspend_worker(p_worker_id uuid, p_suspended_by_id uuid, p_reason text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Update worker status
  UPDATE workers
  SET 
    approval_status = 'suspended',
    suspension_reason = p_reason,
    suspended_at = NOW(),
    is_active = false
  WHERE id = p_worker_id
  AND approval_status = 'approved';

  RETURN FOUND;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_automation_rule_metrics()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Update execution count and average time
  UPDATE automation_rules 
  SET 
    execution_count = execution_count + 1,
    last_executed_at = NEW.executed_at,
    average_execution_time_ms = COALESCE(
      (average_execution_time_ms * (execution_count - 1) + NEW.execution_time_ms) / execution_count,
      NEW.execution_time_ms
    )
  WHERE id = NEW.automation_rule_id;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_quality_pattern_stats()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT NEW.passed THEN
        -- Update pattern occurrence count
        UPDATE quality_patterns
        SET occurrence_count = occurrence_count + 1,
            last_seen = NOW(),
            severity_trend = CASE 
                WHEN last_seen > NOW() - INTERVAL '7 days' THEN 'increasing'
                WHEN last_seen < NOW() - INTERVAL '30 days' THEN 'decreasing'
                ELSE 'stable'
            END
        WHERE stage = (
            SELECT stage FROM quality_checkpoints 
            WHERE id = NEW.checkpoint_id
        )
        AND issue_type = ANY(NEW.failed_checks);
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

create materialized view "public"."worker_productivity_metrics" as  SELECT w.id AS worker_id,
    w.name AS worker_name,
    w.role,
    date(tl.start_time) AS date,
    count(DISTINCT tl.id) AS sessions_count,
    sum(tl.duration_minutes) AS total_minutes_worked,
    round(avg(tl.duration_minutes), 1) AS avg_session_minutes,
    count(DISTINCT tl.task_id) AS tasks_worked,
    count(DISTINCT
        CASE
            WHEN (wt.status = 'completed'::text) THEN tl.task_id
            ELSE NULL::uuid
        END) AS tasks_completed,
    count(DISTINCT tl.batch_id) AS batches_worked,
    string_agg(DISTINCT tl.stage, ', '::text ORDER BY tl.stage) AS stages_worked,
    count(DISTINCT tl.stage) AS unique_stages_count,
    COALESCE(pi.issues_reported, (0)::bigint) AS issues_reported
   FROM (((time_logs tl
     JOIN workers w ON ((w.id = tl.worker_id)))
     LEFT JOIN work_tasks wt ON ((wt.id = tl.task_id)))
     LEFT JOIN ( SELECT production_issues.reported_by_id,
            date(production_issues.created_at) AS date,
            count(*) AS issues_reported
           FROM production_issues
          WHERE (production_issues.created_at >= (CURRENT_DATE - '90 days'::interval))
          GROUP BY production_issues.reported_by_id, (date(production_issues.created_at))) pi ON (((pi.reported_by_id = w.id) AND (pi.date = date(tl.start_time)))))
  WHERE ((w.is_active = true) AND (tl.start_time >= (CURRENT_DATE - '90 days'::interval)) AND (tl.end_time IS NOT NULL))
  GROUP BY w.id, w.name, w.role, (date(tl.start_time)), pi.issues_reported;


create materialized view "public"."workflow_daily_metrics" as  SELECT wt.id AS workflow_template_id,
    wt.name AS workflow_name,
    date(sd.transition_time) AS date,
    sd.to_stage AS stage,
    count(DISTINCT sd.batch_id) AS batches_processed,
    count(DISTINCT sd.order_item_id) AS items_processed,
    count(*) AS total_transitions,
    avg(sd.hours_in_previous_stage) FILTER (WHERE (sd.hours_in_previous_stage IS NOT NULL)) AS avg_hours_in_stage,
    min(sd.hours_in_previous_stage) FILTER (WHERE (sd.hours_in_previous_stage IS NOT NULL)) AS min_hours_in_stage,
    max(sd.hours_in_previous_stage) FILTER (WHERE (sd.hours_in_previous_stage IS NOT NULL)) AS max_hours_in_stage,
    sum(
        CASE
            WHEN (sd.transition_type = 'auto'::text) THEN 1
            ELSE 0
        END) AS auto_transitions,
    sum(
        CASE
            WHEN (sd.transition_type = 'manual'::text) THEN 1
            ELSE 0
        END) AS manual_transitions,
    round((((sum(
        CASE
            WHEN (sd.transition_type = 'auto'::text) THEN 1
            ELSE 0
        END))::numeric / (NULLIF(count(*), 0))::numeric) * (100)::numeric), 2) AS automation_percentage,
    COALESCE(pi.issue_count, (0)::bigint) AS issues_reported
   FROM ((stage_durations sd
     JOIN workflow_templates wt ON ((wt.id = sd.workflow_template_id)))
     LEFT JOIN ( SELECT production_issues.stage,
            date(production_issues.created_at) AS date,
            count(*) AS issue_count
           FROM production_issues
          WHERE (production_issues.created_at >= (CURRENT_DATE - '90 days'::interval))
          GROUP BY production_issues.stage, (date(production_issues.created_at))) pi ON (((pi.stage = sd.to_stage) AND (pi.date = date(sd.transition_time)))))
  WHERE (sd.transition_time >= (CURRENT_DATE - '90 days'::interval))
  GROUP BY wt.id, wt.name, (date(sd.transition_time)), sd.to_stage, pi.issue_count;


create materialized view "public"."workflow_bottlenecks" as  WITH stage_performance AS (
         SELECT workflow_daily_metrics.workflow_template_id,
            workflow_daily_metrics.workflow_name,
            workflow_daily_metrics.stage,
            avg(workflow_daily_metrics.avg_hours_in_stage) AS avg_hours_in_stage,
            max(workflow_daily_metrics.max_hours_in_stage) AS max_hours_in_stage,
            avg(workflow_daily_metrics.automation_percentage) AS avg_automation_rate,
            avg(workflow_daily_metrics.issues_reported) AS avg_daily_issues,
            count(*) AS data_points
           FROM workflow_daily_metrics
          WHERE ((workflow_daily_metrics.date >= (CURRENT_DATE - '30 days'::interval)) AND (workflow_daily_metrics.avg_hours_in_stage IS NOT NULL))
          GROUP BY workflow_daily_metrics.workflow_template_id, workflow_daily_metrics.workflow_name, workflow_daily_metrics.stage
        ), trend_analysis AS (
         SELECT workflow_daily_metrics.workflow_template_id,
            workflow_daily_metrics.stage,
            avg(
                CASE
                    WHEN (workflow_daily_metrics.date >= (CURRENT_DATE - '15 days'::interval)) THEN workflow_daily_metrics.avg_hours_in_stage
                    ELSE NULL::numeric
                END) AS recent_avg,
            avg(
                CASE
                    WHEN ((workflow_daily_metrics.date >= (CURRENT_DATE - '30 days'::interval)) AND (workflow_daily_metrics.date < (CURRENT_DATE - '15 days'::interval))) THEN workflow_daily_metrics.avg_hours_in_stage
                    ELSE NULL::numeric
                END) AS previous_avg
           FROM workflow_daily_metrics
          WHERE (workflow_daily_metrics.date >= (CURRENT_DATE - '30 days'::interval))
          GROUP BY workflow_daily_metrics.workflow_template_id, workflow_daily_metrics.stage
        )
 SELECT sp.workflow_template_id,
    sp.workflow_name,
    sp.stage,
    round(sp.avg_hours_in_stage, 2) AS avg_hours_in_stage,
    round(sp.max_hours_in_stage, 2) AS max_hours_in_stage,
    rank() OVER (PARTITION BY sp.workflow_template_id ORDER BY sp.avg_hours_in_stage DESC NULLS LAST) AS stage_bottleneck_rank,
    rank() OVER (ORDER BY sp.avg_hours_in_stage DESC NULLS LAST) AS overall_bottleneck_rank,
    round(sp.avg_automation_rate, 1) AS avg_automation_rate,
    round(sp.avg_daily_issues, 1) AS avg_daily_issues,
        CASE
            WHEN (ta.recent_avg > (ta.previous_avg * 1.1)) THEN 'getting_slower'::text
            WHEN (ta.recent_avg < (ta.previous_avg * 0.9)) THEN 'getting_faster'::text
            ELSE 'stable'::text
        END AS performance_trend,
    sp.data_points
   FROM (stage_performance sp
     LEFT JOIN trend_analysis ta ON (((ta.workflow_template_id = sp.workflow_template_id) AND (ta.stage = sp.stage))))
  WHERE (sp.data_points >= 3);


CREATE INDEX idx_worker_productivity_date ON public.worker_productivity_metrics USING btree (date);

CREATE UNIQUE INDEX idx_worker_productivity_unique ON public.worker_productivity_metrics USING btree (worker_id, date);

CREATE INDEX idx_worker_productivity_worker ON public.worker_productivity_metrics USING btree (worker_id);

CREATE INDEX idx_workflow_bottlenecks_performance ON public.workflow_bottlenecks USING btree (avg_hours_in_stage DESC);

CREATE INDEX idx_workflow_bottlenecks_rank ON public.workflow_bottlenecks USING btree (stage_bottleneck_rank);

CREATE UNIQUE INDEX idx_workflow_bottlenecks_unique ON public.workflow_bottlenecks USING btree (workflow_template_id, stage);

CREATE INDEX idx_workflow_daily_metrics_date ON public.workflow_daily_metrics USING btree (date);

CREATE INDEX idx_workflow_daily_metrics_template ON public.workflow_daily_metrics USING btree (workflow_template_id);

CREATE UNIQUE INDEX idx_workflow_daily_metrics_unique ON public.workflow_daily_metrics USING btree (workflow_template_id, date, stage);

grant delete on table "public"."analytics_refresh_log" to "anon";

grant insert on table "public"."analytics_refresh_log" to "anon";

grant references on table "public"."analytics_refresh_log" to "anon";

grant select on table "public"."analytics_refresh_log" to "anon";

grant trigger on table "public"."analytics_refresh_log" to "anon";

grant truncate on table "public"."analytics_refresh_log" to "anon";

grant update on table "public"."analytics_refresh_log" to "anon";

grant delete on table "public"."analytics_refresh_log" to "authenticated";

grant insert on table "public"."analytics_refresh_log" to "authenticated";

grant references on table "public"."analytics_refresh_log" to "authenticated";

grant select on table "public"."analytics_refresh_log" to "authenticated";

grant trigger on table "public"."analytics_refresh_log" to "authenticated";

grant truncate on table "public"."analytics_refresh_log" to "authenticated";

grant update on table "public"."analytics_refresh_log" to "authenticated";

grant delete on table "public"."analytics_refresh_log" to "service_role";

grant insert on table "public"."analytics_refresh_log" to "service_role";

grant references on table "public"."analytics_refresh_log" to "service_role";

grant select on table "public"."analytics_refresh_log" to "service_role";

grant trigger on table "public"."analytics_refresh_log" to "service_role";

grant truncate on table "public"."analytics_refresh_log" to "service_role";

grant update on table "public"."analytics_refresh_log" to "service_role";

grant delete on table "public"."application_logs" to "anon";

grant insert on table "public"."application_logs" to "anon";

grant references on table "public"."application_logs" to "anon";

grant select on table "public"."application_logs" to "anon";

grant trigger on table "public"."application_logs" to "anon";

grant truncate on table "public"."application_logs" to "anon";

grant update on table "public"."application_logs" to "anon";

grant delete on table "public"."application_logs" to "authenticated";

grant insert on table "public"."application_logs" to "authenticated";

grant references on table "public"."application_logs" to "authenticated";

grant select on table "public"."application_logs" to "authenticated";

grant trigger on table "public"."application_logs" to "authenticated";

grant truncate on table "public"."application_logs" to "authenticated";

grant update on table "public"."application_logs" to "authenticated";

grant delete on table "public"."application_logs" to "service_role";

grant insert on table "public"."application_logs" to "service_role";

grant references on table "public"."application_logs" to "service_role";

grant select on table "public"."application_logs" to "service_role";

grant trigger on table "public"."application_logs" to "service_role";

grant truncate on table "public"."application_logs" to "service_role";

grant update on table "public"."application_logs" to "service_role";

grant delete on table "public"."automation_execution_log" to "anon";

grant insert on table "public"."automation_execution_log" to "anon";

grant references on table "public"."automation_execution_log" to "anon";

grant select on table "public"."automation_execution_log" to "anon";

grant trigger on table "public"."automation_execution_log" to "anon";

grant truncate on table "public"."automation_execution_log" to "anon";

grant update on table "public"."automation_execution_log" to "anon";

grant delete on table "public"."automation_execution_log" to "authenticated";

grant insert on table "public"."automation_execution_log" to "authenticated";

grant references on table "public"."automation_execution_log" to "authenticated";

grant select on table "public"."automation_execution_log" to "authenticated";

grant trigger on table "public"."automation_execution_log" to "authenticated";

grant truncate on table "public"."automation_execution_log" to "authenticated";

grant update on table "public"."automation_execution_log" to "authenticated";

grant delete on table "public"."automation_execution_log" to "service_role";

grant insert on table "public"."automation_execution_log" to "service_role";

grant references on table "public"."automation_execution_log" to "service_role";

grant select on table "public"."automation_execution_log" to "service_role";

grant trigger on table "public"."automation_execution_log" to "service_role";

grant truncate on table "public"."automation_execution_log" to "service_role";

grant update on table "public"."automation_execution_log" to "service_role";

grant delete on table "public"."automation_executions" to "anon";

grant insert on table "public"."automation_executions" to "anon";

grant references on table "public"."automation_executions" to "anon";

grant select on table "public"."automation_executions" to "anon";

grant trigger on table "public"."automation_executions" to "anon";

grant truncate on table "public"."automation_executions" to "anon";

grant update on table "public"."automation_executions" to "anon";

grant delete on table "public"."automation_executions" to "authenticated";

grant insert on table "public"."automation_executions" to "authenticated";

grant references on table "public"."automation_executions" to "authenticated";

grant select on table "public"."automation_executions" to "authenticated";

grant trigger on table "public"."automation_executions" to "authenticated";

grant truncate on table "public"."automation_executions" to "authenticated";

grant update on table "public"."automation_executions" to "authenticated";

grant delete on table "public"."automation_executions" to "service_role";

grant insert on table "public"."automation_executions" to "service_role";

grant references on table "public"."automation_executions" to "service_role";

grant select on table "public"."automation_executions" to "service_role";

grant trigger on table "public"."automation_executions" to "service_role";

grant truncate on table "public"."automation_executions" to "service_role";

grant update on table "public"."automation_executions" to "service_role";

grant delete on table "public"."automation_metrics" to "anon";

grant insert on table "public"."automation_metrics" to "anon";

grant references on table "public"."automation_metrics" to "anon";

grant select on table "public"."automation_metrics" to "anon";

grant trigger on table "public"."automation_metrics" to "anon";

grant truncate on table "public"."automation_metrics" to "anon";

grant update on table "public"."automation_metrics" to "anon";

grant delete on table "public"."automation_metrics" to "authenticated";

grant insert on table "public"."automation_metrics" to "authenticated";

grant references on table "public"."automation_metrics" to "authenticated";

grant select on table "public"."automation_metrics" to "authenticated";

grant trigger on table "public"."automation_metrics" to "authenticated";

grant truncate on table "public"."automation_metrics" to "authenticated";

grant update on table "public"."automation_metrics" to "authenticated";

grant delete on table "public"."automation_metrics" to "service_role";

grant insert on table "public"."automation_metrics" to "service_role";

grant references on table "public"."automation_metrics" to "service_role";

grant select on table "public"."automation_metrics" to "service_role";

grant trigger on table "public"."automation_metrics" to "service_role";

grant truncate on table "public"."automation_metrics" to "service_role";

grant update on table "public"."automation_metrics" to "service_role";

grant delete on table "public"."automation_rules" to "anon";

grant insert on table "public"."automation_rules" to "anon";

grant references on table "public"."automation_rules" to "anon";

grant select on table "public"."automation_rules" to "anon";

grant trigger on table "public"."automation_rules" to "anon";

grant truncate on table "public"."automation_rules" to "anon";

grant update on table "public"."automation_rules" to "anon";

grant delete on table "public"."automation_rules" to "authenticated";

grant insert on table "public"."automation_rules" to "authenticated";

grant references on table "public"."automation_rules" to "authenticated";

grant select on table "public"."automation_rules" to "authenticated";

grant trigger on table "public"."automation_rules" to "authenticated";

grant truncate on table "public"."automation_rules" to "authenticated";

grant update on table "public"."automation_rules" to "authenticated";

grant delete on table "public"."automation_rules" to "service_role";

grant insert on table "public"."automation_rules" to "service_role";

grant references on table "public"."automation_rules" to "service_role";

grant select on table "public"."automation_rules" to "service_role";

grant trigger on table "public"."automation_rules" to "service_role";

grant truncate on table "public"."automation_rules" to "service_role";

grant update on table "public"."automation_rules" to "service_role";

grant delete on table "public"."automation_templates" to "anon";

grant insert on table "public"."automation_templates" to "anon";

grant references on table "public"."automation_templates" to "anon";

grant select on table "public"."automation_templates" to "anon";

grant trigger on table "public"."automation_templates" to "anon";

grant truncate on table "public"."automation_templates" to "anon";

grant update on table "public"."automation_templates" to "anon";

grant delete on table "public"."automation_templates" to "authenticated";

grant insert on table "public"."automation_templates" to "authenticated";

grant references on table "public"."automation_templates" to "authenticated";

grant select on table "public"."automation_templates" to "authenticated";

grant trigger on table "public"."automation_templates" to "authenticated";

grant truncate on table "public"."automation_templates" to "authenticated";

grant update on table "public"."automation_templates" to "authenticated";

grant delete on table "public"."automation_templates" to "service_role";

grant insert on table "public"."automation_templates" to "service_role";

grant references on table "public"."automation_templates" to "service_role";

grant select on table "public"."automation_templates" to "service_role";

grant trigger on table "public"."automation_templates" to "service_role";

grant truncate on table "public"."automation_templates" to "service_role";

grant update on table "public"."automation_templates" to "service_role";

grant delete on table "public"."component_tracking" to "anon";

grant insert on table "public"."component_tracking" to "anon";

grant references on table "public"."component_tracking" to "anon";

grant select on table "public"."component_tracking" to "anon";

grant trigger on table "public"."component_tracking" to "anon";

grant truncate on table "public"."component_tracking" to "anon";

grant update on table "public"."component_tracking" to "anon";

grant delete on table "public"."component_tracking" to "authenticated";

grant insert on table "public"."component_tracking" to "authenticated";

grant references on table "public"."component_tracking" to "authenticated";

grant select on table "public"."component_tracking" to "authenticated";

grant trigger on table "public"."component_tracking" to "authenticated";

grant truncate on table "public"."component_tracking" to "authenticated";

grant update on table "public"."component_tracking" to "authenticated";

grant delete on table "public"."component_tracking" to "service_role";

grant insert on table "public"."component_tracking" to "service_role";

grant references on table "public"."component_tracking" to "service_role";

grant select on table "public"."component_tracking" to "service_role";

grant trigger on table "public"."component_tracking" to "service_role";

grant truncate on table "public"."component_tracking" to "service_role";

grant update on table "public"."component_tracking" to "service_role";

grant delete on table "public"."custom_stages" to "anon";

grant insert on table "public"."custom_stages" to "anon";

grant references on table "public"."custom_stages" to "anon";

grant select on table "public"."custom_stages" to "anon";

grant trigger on table "public"."custom_stages" to "anon";

grant truncate on table "public"."custom_stages" to "anon";

grant update on table "public"."custom_stages" to "anon";

grant delete on table "public"."custom_stages" to "authenticated";

grant insert on table "public"."custom_stages" to "authenticated";

grant references on table "public"."custom_stages" to "authenticated";

grant select on table "public"."custom_stages" to "authenticated";

grant trigger on table "public"."custom_stages" to "authenticated";

grant truncate on table "public"."custom_stages" to "authenticated";

grant update on table "public"."custom_stages" to "authenticated";

grant delete on table "public"."custom_stages" to "service_role";

grant insert on table "public"."custom_stages" to "service_role";

grant references on table "public"."custom_stages" to "service_role";

grant select on table "public"."custom_stages" to "service_role";

grant trigger on table "public"."custom_stages" to "service_role";

grant truncate on table "public"."custom_stages" to "service_role";

grant update on table "public"."custom_stages" to "service_role";

grant delete on table "public"."inspection_results" to "anon";

grant insert on table "public"."inspection_results" to "anon";

grant references on table "public"."inspection_results" to "anon";

grant select on table "public"."inspection_results" to "anon";

grant trigger on table "public"."inspection_results" to "anon";

grant truncate on table "public"."inspection_results" to "anon";

grant update on table "public"."inspection_results" to "anon";

grant delete on table "public"."inspection_results" to "authenticated";

grant insert on table "public"."inspection_results" to "authenticated";

grant references on table "public"."inspection_results" to "authenticated";

grant select on table "public"."inspection_results" to "authenticated";

grant trigger on table "public"."inspection_results" to "authenticated";

grant truncate on table "public"."inspection_results" to "authenticated";

grant update on table "public"."inspection_results" to "authenticated";

grant delete on table "public"."inspection_results" to "service_role";

grant insert on table "public"."inspection_results" to "service_role";

grant references on table "public"."inspection_results" to "service_role";

grant select on table "public"."inspection_results" to "service_role";

grant trigger on table "public"."inspection_results" to "service_role";

grant truncate on table "public"."inspection_results" to "service_role";

grant update on table "public"."inspection_results" to "service_role";

grant delete on table "public"."notification_preferences" to "anon";

grant insert on table "public"."notification_preferences" to "anon";

grant references on table "public"."notification_preferences" to "anon";

grant select on table "public"."notification_preferences" to "anon";

grant trigger on table "public"."notification_preferences" to "anon";

grant truncate on table "public"."notification_preferences" to "anon";

grant update on table "public"."notification_preferences" to "anon";

grant delete on table "public"."notification_preferences" to "authenticated";

grant insert on table "public"."notification_preferences" to "authenticated";

grant references on table "public"."notification_preferences" to "authenticated";

grant select on table "public"."notification_preferences" to "authenticated";

grant trigger on table "public"."notification_preferences" to "authenticated";

grant truncate on table "public"."notification_preferences" to "authenticated";

grant update on table "public"."notification_preferences" to "authenticated";

grant delete on table "public"."notification_preferences" to "service_role";

grant insert on table "public"."notification_preferences" to "service_role";

grant references on table "public"."notification_preferences" to "service_role";

grant select on table "public"."notification_preferences" to "service_role";

grant trigger on table "public"."notification_preferences" to "service_role";

grant truncate on table "public"."notification_preferences" to "service_role";

grant update on table "public"."notification_preferences" to "service_role";

grant delete on table "public"."notification_queue" to "anon";

grant insert on table "public"."notification_queue" to "anon";

grant references on table "public"."notification_queue" to "anon";

grant select on table "public"."notification_queue" to "anon";

grant trigger on table "public"."notification_queue" to "anon";

grant truncate on table "public"."notification_queue" to "anon";

grant update on table "public"."notification_queue" to "anon";

grant delete on table "public"."notification_queue" to "authenticated";

grant insert on table "public"."notification_queue" to "authenticated";

grant references on table "public"."notification_queue" to "authenticated";

grant select on table "public"."notification_queue" to "authenticated";

grant trigger on table "public"."notification_queue" to "authenticated";

grant truncate on table "public"."notification_queue" to "authenticated";

grant update on table "public"."notification_queue" to "authenticated";

grant delete on table "public"."notification_queue" to "service_role";

grant insert on table "public"."notification_queue" to "service_role";

grant references on table "public"."notification_queue" to "service_role";

grant select on table "public"."notification_queue" to "service_role";

grant trigger on table "public"."notification_queue" to "service_role";

grant truncate on table "public"."notification_queue" to "service_role";

grant update on table "public"."notification_queue" to "service_role";

grant delete on table "public"."order_items" to "anon";

grant insert on table "public"."order_items" to "anon";

grant references on table "public"."order_items" to "anon";

grant select on table "public"."order_items" to "anon";

grant trigger on table "public"."order_items" to "anon";

grant truncate on table "public"."order_items" to "anon";

grant update on table "public"."order_items" to "anon";

grant delete on table "public"."order_items" to "authenticated";

grant insert on table "public"."order_items" to "authenticated";

grant references on table "public"."order_items" to "authenticated";

grant select on table "public"."order_items" to "authenticated";

grant trigger on table "public"."order_items" to "authenticated";

grant truncate on table "public"."order_items" to "authenticated";

grant update on table "public"."order_items" to "authenticated";

grant delete on table "public"."order_items" to "service_role";

grant insert on table "public"."order_items" to "service_role";

grant references on table "public"."order_items" to "service_role";

grant select on table "public"."order_items" to "service_role";

grant trigger on table "public"."order_items" to "service_role";

grant truncate on table "public"."order_items" to "service_role";

grant update on table "public"."order_items" to "service_role";

grant delete on table "public"."orders" to "anon";

grant insert on table "public"."orders" to "anon";

grant references on table "public"."orders" to "anon";

grant select on table "public"."orders" to "anon";

grant trigger on table "public"."orders" to "anon";

grant truncate on table "public"."orders" to "anon";

grant update on table "public"."orders" to "anon";

grant delete on table "public"."orders" to "authenticated";

grant insert on table "public"."orders" to "authenticated";

grant references on table "public"."orders" to "authenticated";

grant select on table "public"."orders" to "authenticated";

grant trigger on table "public"."orders" to "authenticated";

grant truncate on table "public"."orders" to "authenticated";

grant update on table "public"."orders" to "authenticated";

grant delete on table "public"."orders" to "service_role";

grant insert on table "public"."orders" to "service_role";

grant references on table "public"."orders" to "service_role";

grant select on table "public"."orders" to "service_role";

grant trigger on table "public"."orders" to "service_role";

grant truncate on table "public"."orders" to "service_role";

grant update on table "public"."orders" to "service_role";

grant delete on table "public"."production_issues" to "anon";

grant insert on table "public"."production_issues" to "anon";

grant references on table "public"."production_issues" to "anon";

grant select on table "public"."production_issues" to "anon";

grant trigger on table "public"."production_issues" to "anon";

grant truncate on table "public"."production_issues" to "anon";

grant update on table "public"."production_issues" to "anon";

grant delete on table "public"."production_issues" to "authenticated";

grant insert on table "public"."production_issues" to "authenticated";

grant references on table "public"."production_issues" to "authenticated";

grant select on table "public"."production_issues" to "authenticated";

grant trigger on table "public"."production_issues" to "authenticated";

grant truncate on table "public"."production_issues" to "authenticated";

grant update on table "public"."production_issues" to "authenticated";

grant delete on table "public"."production_issues" to "service_role";

grant insert on table "public"."production_issues" to "service_role";

grant references on table "public"."production_issues" to "service_role";

grant select on table "public"."production_issues" to "service_role";

grant trigger on table "public"."production_issues" to "service_role";

grant truncate on table "public"."production_issues" to "service_role";

grant update on table "public"."production_issues" to "service_role";

grant delete on table "public"."qc_checklist_items" to "anon";

grant insert on table "public"."qc_checklist_items" to "anon";

grant references on table "public"."qc_checklist_items" to "anon";

grant select on table "public"."qc_checklist_items" to "anon";

grant trigger on table "public"."qc_checklist_items" to "anon";

grant truncate on table "public"."qc_checklist_items" to "anon";

grant update on table "public"."qc_checklist_items" to "anon";

grant delete on table "public"."qc_checklist_items" to "authenticated";

grant insert on table "public"."qc_checklist_items" to "authenticated";

grant references on table "public"."qc_checklist_items" to "authenticated";

grant select on table "public"."qc_checklist_items" to "authenticated";

grant trigger on table "public"."qc_checklist_items" to "authenticated";

grant truncate on table "public"."qc_checklist_items" to "authenticated";

grant update on table "public"."qc_checklist_items" to "authenticated";

grant delete on table "public"."qc_checklist_items" to "service_role";

grant insert on table "public"."qc_checklist_items" to "service_role";

grant references on table "public"."qc_checklist_items" to "service_role";

grant select on table "public"."qc_checklist_items" to "service_role";

grant trigger on table "public"."qc_checklist_items" to "service_role";

grant truncate on table "public"."qc_checklist_items" to "service_role";

grant update on table "public"."qc_checklist_items" to "service_role";

grant delete on table "public"."qc_production_steps" to "anon";

grant insert on table "public"."qc_production_steps" to "anon";

grant references on table "public"."qc_production_steps" to "anon";

grant select on table "public"."qc_production_steps" to "anon";

grant trigger on table "public"."qc_production_steps" to "anon";

grant truncate on table "public"."qc_production_steps" to "anon";

grant update on table "public"."qc_production_steps" to "anon";

grant delete on table "public"."qc_production_steps" to "authenticated";

grant insert on table "public"."qc_production_steps" to "authenticated";

grant references on table "public"."qc_production_steps" to "authenticated";

grant select on table "public"."qc_production_steps" to "authenticated";

grant trigger on table "public"."qc_production_steps" to "authenticated";

grant truncate on table "public"."qc_production_steps" to "authenticated";

grant update on table "public"."qc_production_steps" to "authenticated";

grant delete on table "public"."qc_production_steps" to "service_role";

grant insert on table "public"."qc_production_steps" to "service_role";

grant references on table "public"."qc_production_steps" to "service_role";

grant select on table "public"."qc_production_steps" to "service_role";

grant trigger on table "public"."qc_production_steps" to "service_role";

grant truncate on table "public"."qc_production_steps" to "service_role";

grant update on table "public"."qc_production_steps" to "service_role";

grant delete on table "public"."qc_results" to "anon";

grant insert on table "public"."qc_results" to "anon";

grant references on table "public"."qc_results" to "anon";

grant select on table "public"."qc_results" to "anon";

grant trigger on table "public"."qc_results" to "anon";

grant truncate on table "public"."qc_results" to "anon";

grant update on table "public"."qc_results" to "anon";

grant delete on table "public"."qc_results" to "authenticated";

grant insert on table "public"."qc_results" to "authenticated";

grant references on table "public"."qc_results" to "authenticated";

grant select on table "public"."qc_results" to "authenticated";

grant trigger on table "public"."qc_results" to "authenticated";

grant truncate on table "public"."qc_results" to "authenticated";

grant update on table "public"."qc_results" to "authenticated";

grant delete on table "public"."qc_results" to "service_role";

grant insert on table "public"."qc_results" to "service_role";

grant references on table "public"."qc_results" to "service_role";

grant select on table "public"."qc_results" to "service_role";

grant trigger on table "public"."qc_results" to "service_role";

grant truncate on table "public"."qc_results" to "service_role";

grant update on table "public"."qc_results" to "service_role";

grant delete on table "public"."qc_submissions" to "anon";

grant insert on table "public"."qc_submissions" to "anon";

grant references on table "public"."qc_submissions" to "anon";

grant select on table "public"."qc_submissions" to "anon";

grant trigger on table "public"."qc_submissions" to "anon";

grant truncate on table "public"."qc_submissions" to "anon";

grant update on table "public"."qc_submissions" to "anon";

grant delete on table "public"."qc_submissions" to "authenticated";

grant insert on table "public"."qc_submissions" to "authenticated";

grant references on table "public"."qc_submissions" to "authenticated";

grant select on table "public"."qc_submissions" to "authenticated";

grant trigger on table "public"."qc_submissions" to "authenticated";

grant truncate on table "public"."qc_submissions" to "authenticated";

grant update on table "public"."qc_submissions" to "authenticated";

grant delete on table "public"."qc_submissions" to "service_role";

grant insert on table "public"."qc_submissions" to "service_role";

grant references on table "public"."qc_submissions" to "service_role";

grant select on table "public"."qc_submissions" to "service_role";

grant trigger on table "public"."qc_submissions" to "service_role";

grant truncate on table "public"."qc_submissions" to "service_role";

grant update on table "public"."qc_submissions" to "service_role";

grant delete on table "public"."qc_templates" to "anon";

grant insert on table "public"."qc_templates" to "anon";

grant references on table "public"."qc_templates" to "anon";

grant select on table "public"."qc_templates" to "anon";

grant trigger on table "public"."qc_templates" to "anon";

grant truncate on table "public"."qc_templates" to "anon";

grant update on table "public"."qc_templates" to "anon";

grant delete on table "public"."qc_templates" to "authenticated";

grant insert on table "public"."qc_templates" to "authenticated";

grant references on table "public"."qc_templates" to "authenticated";

grant select on table "public"."qc_templates" to "authenticated";

grant trigger on table "public"."qc_templates" to "authenticated";

grant truncate on table "public"."qc_templates" to "authenticated";

grant update on table "public"."qc_templates" to "authenticated";

grant delete on table "public"."qc_templates" to "service_role";

grant insert on table "public"."qc_templates" to "service_role";

grant references on table "public"."qc_templates" to "service_role";

grant select on table "public"."qc_templates" to "service_role";

grant trigger on table "public"."qc_templates" to "service_role";

grant truncate on table "public"."qc_templates" to "service_role";

grant update on table "public"."qc_templates" to "service_role";

grant delete on table "public"."quality_checkpoint_templates" to "anon";

grant insert on table "public"."quality_checkpoint_templates" to "anon";

grant references on table "public"."quality_checkpoint_templates" to "anon";

grant select on table "public"."quality_checkpoint_templates" to "anon";

grant trigger on table "public"."quality_checkpoint_templates" to "anon";

grant truncate on table "public"."quality_checkpoint_templates" to "anon";

grant update on table "public"."quality_checkpoint_templates" to "anon";

grant delete on table "public"."quality_checkpoint_templates" to "authenticated";

grant insert on table "public"."quality_checkpoint_templates" to "authenticated";

grant references on table "public"."quality_checkpoint_templates" to "authenticated";

grant select on table "public"."quality_checkpoint_templates" to "authenticated";

grant trigger on table "public"."quality_checkpoint_templates" to "authenticated";

grant truncate on table "public"."quality_checkpoint_templates" to "authenticated";

grant update on table "public"."quality_checkpoint_templates" to "authenticated";

grant delete on table "public"."quality_checkpoint_templates" to "service_role";

grant insert on table "public"."quality_checkpoint_templates" to "service_role";

grant references on table "public"."quality_checkpoint_templates" to "service_role";

grant select on table "public"."quality_checkpoint_templates" to "service_role";

grant trigger on table "public"."quality_checkpoint_templates" to "service_role";

grant truncate on table "public"."quality_checkpoint_templates" to "service_role";

grant update on table "public"."quality_checkpoint_templates" to "service_role";

grant delete on table "public"."quality_checkpoints" to "anon";

grant insert on table "public"."quality_checkpoints" to "anon";

grant references on table "public"."quality_checkpoints" to "anon";

grant select on table "public"."quality_checkpoints" to "anon";

grant trigger on table "public"."quality_checkpoints" to "anon";

grant truncate on table "public"."quality_checkpoints" to "anon";

grant update on table "public"."quality_checkpoints" to "anon";

grant delete on table "public"."quality_checkpoints" to "authenticated";

grant insert on table "public"."quality_checkpoints" to "authenticated";

grant references on table "public"."quality_checkpoints" to "authenticated";

grant select on table "public"."quality_checkpoints" to "authenticated";

grant trigger on table "public"."quality_checkpoints" to "authenticated";

grant truncate on table "public"."quality_checkpoints" to "authenticated";

grant update on table "public"."quality_checkpoints" to "authenticated";

grant delete on table "public"."quality_checkpoints" to "service_role";

grant insert on table "public"."quality_checkpoints" to "service_role";

grant references on table "public"."quality_checkpoints" to "service_role";

grant select on table "public"."quality_checkpoints" to "service_role";

grant trigger on table "public"."quality_checkpoints" to "service_role";

grant truncate on table "public"."quality_checkpoints" to "service_role";

grant update on table "public"."quality_checkpoints" to "service_role";

grant delete on table "public"."quality_holds" to "anon";

grant insert on table "public"."quality_holds" to "anon";

grant references on table "public"."quality_holds" to "anon";

grant select on table "public"."quality_holds" to "anon";

grant trigger on table "public"."quality_holds" to "anon";

grant truncate on table "public"."quality_holds" to "anon";

grant update on table "public"."quality_holds" to "anon";

grant delete on table "public"."quality_holds" to "authenticated";

grant insert on table "public"."quality_holds" to "authenticated";

grant references on table "public"."quality_holds" to "authenticated";

grant select on table "public"."quality_holds" to "authenticated";

grant trigger on table "public"."quality_holds" to "authenticated";

grant truncate on table "public"."quality_holds" to "authenticated";

grant update on table "public"."quality_holds" to "authenticated";

grant delete on table "public"."quality_holds" to "service_role";

grant insert on table "public"."quality_holds" to "service_role";

grant references on table "public"."quality_holds" to "service_role";

grant select on table "public"."quality_holds" to "service_role";

grant trigger on table "public"."quality_holds" to "service_role";

grant truncate on table "public"."quality_holds" to "service_role";

grant update on table "public"."quality_holds" to "service_role";

grant delete on table "public"."quality_patterns" to "anon";

grant insert on table "public"."quality_patterns" to "anon";

grant references on table "public"."quality_patterns" to "anon";

grant select on table "public"."quality_patterns" to "anon";

grant trigger on table "public"."quality_patterns" to "anon";

grant truncate on table "public"."quality_patterns" to "anon";

grant update on table "public"."quality_patterns" to "anon";

grant delete on table "public"."quality_patterns" to "authenticated";

grant insert on table "public"."quality_patterns" to "authenticated";

grant references on table "public"."quality_patterns" to "authenticated";

grant select on table "public"."quality_patterns" to "authenticated";

grant trigger on table "public"."quality_patterns" to "authenticated";

grant truncate on table "public"."quality_patterns" to "authenticated";

grant update on table "public"."quality_patterns" to "authenticated";

grant delete on table "public"."quality_patterns" to "service_role";

grant insert on table "public"."quality_patterns" to "service_role";

grant references on table "public"."quality_patterns" to "service_role";

grant select on table "public"."quality_patterns" to "service_role";

grant trigger on table "public"."quality_patterns" to "service_role";

grant truncate on table "public"."quality_patterns" to "service_role";

grant update on table "public"."quality_patterns" to "service_role";

grant delete on table "public"."settings" to "anon";

grant insert on table "public"."settings" to "anon";

grant references on table "public"."settings" to "anon";

grant select on table "public"."settings" to "anon";

grant trigger on table "public"."settings" to "anon";

grant truncate on table "public"."settings" to "anon";

grant update on table "public"."settings" to "anon";

grant delete on table "public"."settings" to "authenticated";

grant insert on table "public"."settings" to "authenticated";

grant references on table "public"."settings" to "authenticated";

grant select on table "public"."settings" to "authenticated";

grant trigger on table "public"."settings" to "authenticated";

grant truncate on table "public"."settings" to "authenticated";

grant update on table "public"."settings" to "authenticated";

grant delete on table "public"."settings" to "service_role";

grant insert on table "public"."settings" to "service_role";

grant references on table "public"."settings" to "service_role";

grant select on table "public"."settings" to "service_role";

grant trigger on table "public"."settings" to "service_role";

grant truncate on table "public"."settings" to "service_role";

grant update on table "public"."settings" to "service_role";

grant delete on table "public"."slack_configurations" to "anon";

grant insert on table "public"."slack_configurations" to "anon";

grant references on table "public"."slack_configurations" to "anon";

grant select on table "public"."slack_configurations" to "anon";

grant trigger on table "public"."slack_configurations" to "anon";

grant truncate on table "public"."slack_configurations" to "anon";

grant update on table "public"."slack_configurations" to "anon";

grant delete on table "public"."slack_configurations" to "authenticated";

grant insert on table "public"."slack_configurations" to "authenticated";

grant references on table "public"."slack_configurations" to "authenticated";

grant select on table "public"."slack_configurations" to "authenticated";

grant trigger on table "public"."slack_configurations" to "authenticated";

grant truncate on table "public"."slack_configurations" to "authenticated";

grant update on table "public"."slack_configurations" to "authenticated";

grant delete on table "public"."slack_configurations" to "service_role";

grant insert on table "public"."slack_configurations" to "service_role";

grant references on table "public"."slack_configurations" to "service_role";

grant select on table "public"."slack_configurations" to "service_role";

grant trigger on table "public"."slack_configurations" to "service_role";

grant truncate on table "public"."slack_configurations" to "service_role";

grant update on table "public"."slack_configurations" to "service_role";

grant delete on table "public"."slack_messages" to "anon";

grant insert on table "public"."slack_messages" to "anon";

grant references on table "public"."slack_messages" to "anon";

grant select on table "public"."slack_messages" to "anon";

grant trigger on table "public"."slack_messages" to "anon";

grant truncate on table "public"."slack_messages" to "anon";

grant update on table "public"."slack_messages" to "anon";

grant delete on table "public"."slack_messages" to "authenticated";

grant insert on table "public"."slack_messages" to "authenticated";

grant references on table "public"."slack_messages" to "authenticated";

grant select on table "public"."slack_messages" to "authenticated";

grant trigger on table "public"."slack_messages" to "authenticated";

grant truncate on table "public"."slack_messages" to "authenticated";

grant update on table "public"."slack_messages" to "authenticated";

grant delete on table "public"."slack_messages" to "service_role";

grant insert on table "public"."slack_messages" to "service_role";

grant references on table "public"."slack_messages" to "service_role";

grant select on table "public"."slack_messages" to "service_role";

grant trigger on table "public"."slack_messages" to "service_role";

grant truncate on table "public"."slack_messages" to "service_role";

grant update on table "public"."slack_messages" to "service_role";

grant delete on table "public"."stage_transitions" to "anon";

grant insert on table "public"."stage_transitions" to "anon";

grant references on table "public"."stage_transitions" to "anon";

grant select on table "public"."stage_transitions" to "anon";

grant trigger on table "public"."stage_transitions" to "anon";

grant truncate on table "public"."stage_transitions" to "anon";

grant update on table "public"."stage_transitions" to "anon";

grant delete on table "public"."stage_transitions" to "authenticated";

grant insert on table "public"."stage_transitions" to "authenticated";

grant references on table "public"."stage_transitions" to "authenticated";

grant select on table "public"."stage_transitions" to "authenticated";

grant trigger on table "public"."stage_transitions" to "authenticated";

grant truncate on table "public"."stage_transitions" to "authenticated";

grant update on table "public"."stage_transitions" to "authenticated";

grant delete on table "public"."stage_transitions" to "service_role";

grant insert on table "public"."stage_transitions" to "service_role";

grant references on table "public"."stage_transitions" to "service_role";

grant select on table "public"."stage_transitions" to "service_role";

grant trigger on table "public"."stage_transitions" to "service_role";

grant truncate on table "public"."stage_transitions" to "service_role";

grant update on table "public"."stage_transitions" to "service_role";

grant delete on table "public"."time_logs" to "anon";

grant insert on table "public"."time_logs" to "anon";

grant references on table "public"."time_logs" to "anon";

grant select on table "public"."time_logs" to "anon";

grant trigger on table "public"."time_logs" to "anon";

grant truncate on table "public"."time_logs" to "anon";

grant update on table "public"."time_logs" to "anon";

grant delete on table "public"."time_logs" to "authenticated";

grant insert on table "public"."time_logs" to "authenticated";

grant references on table "public"."time_logs" to "authenticated";

grant select on table "public"."time_logs" to "authenticated";

grant trigger on table "public"."time_logs" to "authenticated";

grant truncate on table "public"."time_logs" to "authenticated";

grant update on table "public"."time_logs" to "authenticated";

grant delete on table "public"."time_logs" to "service_role";

grant insert on table "public"."time_logs" to "service_role";

grant references on table "public"."time_logs" to "service_role";

grant select on table "public"."time_logs" to "service_role";

grant trigger on table "public"."time_logs" to "service_role";

grant truncate on table "public"."time_logs" to "service_role";

grant update on table "public"."time_logs" to "service_role";

grant delete on table "public"."user_management_audit_log" to "anon";

grant insert on table "public"."user_management_audit_log" to "anon";

grant references on table "public"."user_management_audit_log" to "anon";

grant select on table "public"."user_management_audit_log" to "anon";

grant trigger on table "public"."user_management_audit_log" to "anon";

grant truncate on table "public"."user_management_audit_log" to "anon";

grant update on table "public"."user_management_audit_log" to "anon";

grant delete on table "public"."user_management_audit_log" to "authenticated";

grant insert on table "public"."user_management_audit_log" to "authenticated";

grant references on table "public"."user_management_audit_log" to "authenticated";

grant select on table "public"."user_management_audit_log" to "authenticated";

grant trigger on table "public"."user_management_audit_log" to "authenticated";

grant truncate on table "public"."user_management_audit_log" to "authenticated";

grant update on table "public"."user_management_audit_log" to "authenticated";

grant delete on table "public"."user_management_audit_log" to "service_role";

grant insert on table "public"."user_management_audit_log" to "service_role";

grant references on table "public"."user_management_audit_log" to "service_role";

grant select on table "public"."user_management_audit_log" to "service_role";

grant trigger on table "public"."user_management_audit_log" to "service_role";

grant truncate on table "public"."user_management_audit_log" to "service_role";

grant update on table "public"."user_management_audit_log" to "service_role";

grant delete on table "public"."work_batches" to "anon";

grant insert on table "public"."work_batches" to "anon";

grant references on table "public"."work_batches" to "anon";

grant select on table "public"."work_batches" to "anon";

grant trigger on table "public"."work_batches" to "anon";

grant truncate on table "public"."work_batches" to "anon";

grant update on table "public"."work_batches" to "anon";

grant delete on table "public"."work_batches" to "authenticated";

grant insert on table "public"."work_batches" to "authenticated";

grant references on table "public"."work_batches" to "authenticated";

grant select on table "public"."work_batches" to "authenticated";

grant trigger on table "public"."work_batches" to "authenticated";

grant truncate on table "public"."work_batches" to "authenticated";

grant update on table "public"."work_batches" to "authenticated";

grant delete on table "public"."work_batches" to "service_role";

grant insert on table "public"."work_batches" to "service_role";

grant references on table "public"."work_batches" to "service_role";

grant select on table "public"."work_batches" to "service_role";

grant trigger on table "public"."work_batches" to "service_role";

grant truncate on table "public"."work_batches" to "service_role";

grant update on table "public"."work_batches" to "service_role";

grant delete on table "public"."work_logs" to "anon";

grant insert on table "public"."work_logs" to "anon";

grant references on table "public"."work_logs" to "anon";

grant select on table "public"."work_logs" to "anon";

grant trigger on table "public"."work_logs" to "anon";

grant truncate on table "public"."work_logs" to "anon";

grant update on table "public"."work_logs" to "anon";

grant delete on table "public"."work_logs" to "authenticated";

grant insert on table "public"."work_logs" to "authenticated";

grant references on table "public"."work_logs" to "authenticated";

grant select on table "public"."work_logs" to "authenticated";

grant trigger on table "public"."work_logs" to "authenticated";

grant truncate on table "public"."work_logs" to "authenticated";

grant update on table "public"."work_logs" to "authenticated";

grant delete on table "public"."work_logs" to "service_role";

grant insert on table "public"."work_logs" to "service_role";

grant references on table "public"."work_logs" to "service_role";

grant select on table "public"."work_logs" to "service_role";

grant trigger on table "public"."work_logs" to "service_role";

grant truncate on table "public"."work_logs" to "service_role";

grant update on table "public"."work_logs" to "service_role";

grant delete on table "public"."work_tasks" to "anon";

grant insert on table "public"."work_tasks" to "anon";

grant references on table "public"."work_tasks" to "anon";

grant select on table "public"."work_tasks" to "anon";

grant trigger on table "public"."work_tasks" to "anon";

grant truncate on table "public"."work_tasks" to "anon";

grant update on table "public"."work_tasks" to "anon";

grant delete on table "public"."work_tasks" to "authenticated";

grant insert on table "public"."work_tasks" to "authenticated";

grant references on table "public"."work_tasks" to "authenticated";

grant select on table "public"."work_tasks" to "authenticated";

grant trigger on table "public"."work_tasks" to "authenticated";

grant truncate on table "public"."work_tasks" to "authenticated";

grant update on table "public"."work_tasks" to "authenticated";

grant delete on table "public"."work_tasks" to "service_role";

grant insert on table "public"."work_tasks" to "service_role";

grant references on table "public"."work_tasks" to "service_role";

grant select on table "public"."work_tasks" to "service_role";

grant trigger on table "public"."work_tasks" to "service_role";

grant truncate on table "public"."work_tasks" to "service_role";

grant update on table "public"."work_tasks" to "service_role";

grant delete on table "public"."worker_invitations" to "anon";

grant insert on table "public"."worker_invitations" to "anon";

grant references on table "public"."worker_invitations" to "anon";

grant select on table "public"."worker_invitations" to "anon";

grant trigger on table "public"."worker_invitations" to "anon";

grant truncate on table "public"."worker_invitations" to "anon";

grant update on table "public"."worker_invitations" to "anon";

grant delete on table "public"."worker_invitations" to "authenticated";

grant insert on table "public"."worker_invitations" to "authenticated";

grant references on table "public"."worker_invitations" to "authenticated";

grant select on table "public"."worker_invitations" to "authenticated";

grant trigger on table "public"."worker_invitations" to "authenticated";

grant truncate on table "public"."worker_invitations" to "authenticated";

grant update on table "public"."worker_invitations" to "authenticated";

grant delete on table "public"."worker_invitations" to "service_role";

grant insert on table "public"."worker_invitations" to "service_role";

grant references on table "public"."worker_invitations" to "service_role";

grant select on table "public"."worker_invitations" to "service_role";

grant trigger on table "public"."worker_invitations" to "service_role";

grant truncate on table "public"."worker_invitations" to "service_role";

grant update on table "public"."worker_invitations" to "service_role";

grant delete on table "public"."worker_stage_assignments" to "anon";

grant insert on table "public"."worker_stage_assignments" to "anon";

grant references on table "public"."worker_stage_assignments" to "anon";

grant select on table "public"."worker_stage_assignments" to "anon";

grant trigger on table "public"."worker_stage_assignments" to "anon";

grant truncate on table "public"."worker_stage_assignments" to "anon";

grant update on table "public"."worker_stage_assignments" to "anon";

grant delete on table "public"."worker_stage_assignments" to "authenticated";

grant insert on table "public"."worker_stage_assignments" to "authenticated";

grant references on table "public"."worker_stage_assignments" to "authenticated";

grant select on table "public"."worker_stage_assignments" to "authenticated";

grant trigger on table "public"."worker_stage_assignments" to "authenticated";

grant truncate on table "public"."worker_stage_assignments" to "authenticated";

grant update on table "public"."worker_stage_assignments" to "authenticated";

grant delete on table "public"."worker_stage_assignments" to "service_role";

grant insert on table "public"."worker_stage_assignments" to "service_role";

grant references on table "public"."worker_stage_assignments" to "service_role";

grant select on table "public"."worker_stage_assignments" to "service_role";

grant trigger on table "public"."worker_stage_assignments" to "service_role";

grant truncate on table "public"."worker_stage_assignments" to "service_role";

grant update on table "public"."worker_stage_assignments" to "service_role";

grant delete on table "public"."workers" to "anon";

grant insert on table "public"."workers" to "anon";

grant references on table "public"."workers" to "anon";

grant select on table "public"."workers" to "anon";

grant trigger on table "public"."workers" to "anon";

grant truncate on table "public"."workers" to "anon";

grant update on table "public"."workers" to "anon";

grant delete on table "public"."workers" to "authenticated";

grant insert on table "public"."workers" to "authenticated";

grant references on table "public"."workers" to "authenticated";

grant select on table "public"."workers" to "authenticated";

grant trigger on table "public"."workers" to "authenticated";

grant truncate on table "public"."workers" to "authenticated";

grant update on table "public"."workers" to "authenticated";

grant delete on table "public"."workers" to "service_role";

grant insert on table "public"."workers" to "service_role";

grant references on table "public"."workers" to "service_role";

grant select on table "public"."workers" to "service_role";

grant trigger on table "public"."workers" to "service_role";

grant truncate on table "public"."workers" to "service_role";

grant update on table "public"."workers" to "service_role";

grant delete on table "public"."workflow_execution_log" to "anon";

grant insert on table "public"."workflow_execution_log" to "anon";

grant references on table "public"."workflow_execution_log" to "anon";

grant select on table "public"."workflow_execution_log" to "anon";

grant trigger on table "public"."workflow_execution_log" to "anon";

grant truncate on table "public"."workflow_execution_log" to "anon";

grant update on table "public"."workflow_execution_log" to "anon";

grant delete on table "public"."workflow_execution_log" to "authenticated";

grant insert on table "public"."workflow_execution_log" to "authenticated";

grant references on table "public"."workflow_execution_log" to "authenticated";

grant select on table "public"."workflow_execution_log" to "authenticated";

grant trigger on table "public"."workflow_execution_log" to "authenticated";

grant truncate on table "public"."workflow_execution_log" to "authenticated";

grant update on table "public"."workflow_execution_log" to "authenticated";

grant delete on table "public"."workflow_execution_log" to "service_role";

grant insert on table "public"."workflow_execution_log" to "service_role";

grant references on table "public"."workflow_execution_log" to "service_role";

grant select on table "public"."workflow_execution_log" to "service_role";

grant trigger on table "public"."workflow_execution_log" to "service_role";

grant truncate on table "public"."workflow_execution_log" to "service_role";

grant update on table "public"."workflow_execution_log" to "service_role";

grant delete on table "public"."workflow_performance_metrics" to "anon";

grant insert on table "public"."workflow_performance_metrics" to "anon";

grant references on table "public"."workflow_performance_metrics" to "anon";

grant select on table "public"."workflow_performance_metrics" to "anon";

grant trigger on table "public"."workflow_performance_metrics" to "anon";

grant truncate on table "public"."workflow_performance_metrics" to "anon";

grant update on table "public"."workflow_performance_metrics" to "anon";

grant delete on table "public"."workflow_performance_metrics" to "authenticated";

grant insert on table "public"."workflow_performance_metrics" to "authenticated";

grant references on table "public"."workflow_performance_metrics" to "authenticated";

grant select on table "public"."workflow_performance_metrics" to "authenticated";

grant trigger on table "public"."workflow_performance_metrics" to "authenticated";

grant truncate on table "public"."workflow_performance_metrics" to "authenticated";

grant update on table "public"."workflow_performance_metrics" to "authenticated";

grant delete on table "public"."workflow_performance_metrics" to "service_role";

grant insert on table "public"."workflow_performance_metrics" to "service_role";

grant references on table "public"."workflow_performance_metrics" to "service_role";

grant select on table "public"."workflow_performance_metrics" to "service_role";

grant trigger on table "public"."workflow_performance_metrics" to "service_role";

grant truncate on table "public"."workflow_performance_metrics" to "service_role";

grant update on table "public"."workflow_performance_metrics" to "service_role";

grant delete on table "public"."workflow_templates" to "anon";

grant insert on table "public"."workflow_templates" to "anon";

grant references on table "public"."workflow_templates" to "anon";

grant select on table "public"."workflow_templates" to "anon";

grant trigger on table "public"."workflow_templates" to "anon";

grant truncate on table "public"."workflow_templates" to "anon";

grant update on table "public"."workflow_templates" to "anon";

grant delete on table "public"."workflow_templates" to "authenticated";

grant insert on table "public"."workflow_templates" to "authenticated";

grant references on table "public"."workflow_templates" to "authenticated";

grant select on table "public"."workflow_templates" to "authenticated";

grant trigger on table "public"."workflow_templates" to "authenticated";

grant truncate on table "public"."workflow_templates" to "authenticated";

grant update on table "public"."workflow_templates" to "authenticated";

grant delete on table "public"."workflow_templates" to "service_role";

grant insert on table "public"."workflow_templates" to "service_role";

grant references on table "public"."workflow_templates" to "service_role";

grant select on table "public"."workflow_templates" to "service_role";

grant trigger on table "public"."workflow_templates" to "service_role";

grant truncate on table "public"."workflow_templates" to "service_role";

grant update on table "public"."workflow_templates" to "service_role";

create policy "Managers can read analytics refresh log"
on "public"."analytics_refresh_log"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = auth.uid()) AND (workers.role = ANY (ARRAY['manager'::text, 'supervisor'::text])) AND (workers.is_active = true)))));


create policy "Managers can view all logs"
on "public"."application_logs"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = ( SELECT auth.uid() AS uid)) AND (workers.role = ANY (ARRAY['manager'::text, 'supervisor'::text])) AND (workers.is_active = true)))));


create policy "System can insert logs"
on "public"."application_logs"
as permissive
for insert
to service_role
with check (true);


create policy "automation_execution_log_manager_read"
on "public"."automation_execution_log"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = ( SELECT auth.uid() AS uid)) AND (workers.role = ANY (ARRAY['manager'::text, 'supervisor'::text])) AND (workers.is_active = true)))));


create policy "All users can read automation executions"
on "public"."automation_executions"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = auth.uid()) AND (workers.is_active = true)))));


create policy "System can create automation executions"
on "public"."automation_executions"
as permissive
for insert
to authenticated
with check (true);


create policy "Managers can read automation metrics"
on "public"."automation_metrics"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = auth.uid()) AND (workers.role = ANY (ARRAY['manager'::text, 'supervisor'::text])) AND (workers.is_active = true)))));


create policy "All users can read automation rules"
on "public"."automation_rules"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = auth.uid()) AND (workers.is_active = true)))));


create policy "Managers manage automation rules"
on "public"."automation_rules"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = auth.uid()) AND (workers.role = ANY (ARRAY['manager'::text, 'supervisor'::text])) AND (workers.is_active = true)))));


create policy "automation_rules_manager_all"
on "public"."automation_rules"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = ( SELECT auth.uid() AS uid)) AND (workers.role = ANY (ARRAY['manager'::text, 'supervisor'::text])) AND (workers.is_active = true)))));


create policy "All users can read automation templates"
on "public"."automation_templates"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = auth.uid()) AND (workers.is_active = true)))));


create policy "Managers can modify automation templates"
on "public"."automation_templates"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = auth.uid()) AND (workers.role = ANY (ARRAY['manager'::text, 'supervisor'::text])) AND (workers.is_active = true)))));


create policy "Managers can modify component tracking"
on "public"."component_tracking"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers w
  WHERE ((w.auth_user_id = auth.uid()) AND (w.role = ANY (ARRAY['manager'::text, 'supervisor'::text])) AND (w.is_active = true)))));


create policy "Workers can view component tracking"
on "public"."component_tracking"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers w
  WHERE ((w.auth_user_id = auth.uid()) AND (w.is_active = true)))));


create policy "custom_stages_managers"
on "public"."custom_stages"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = auth.uid()) AND (workers.role = ANY (ARRAY['manager'::text, 'supervisor'::text]))))));


create policy "All workers can view inspection results"
on "public"."inspection_results"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers w
  WHERE ((w.auth_user_id = auth.uid()) AND (w.is_active = true)))));


create policy "Workers can create inspection results"
on "public"."inspection_results"
as permissive
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM workers w
  WHERE ((w.auth_user_id = auth.uid()) AND (w.id = inspection_results.worker_id) AND (w.is_active = true)))));


create policy "Workers manage own preferences"
on "public"."notification_preferences"
as permissive
for all
to authenticated
using ((worker_id IN ( SELECT workers.id
   FROM workers
  WHERE ((workers.auth_user_id = auth.uid()) AND (workers.is_active = true)))));


create policy "Managers manage notification queue"
on "public"."notification_queue"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = auth.uid()) AND (workers.role = ANY (ARRAY['manager'::text, 'supervisor'::text])) AND (workers.is_active = true)))));


create policy "order_items_managers_modify"
on "public"."order_items"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = auth.uid()) AND (workers.role = ANY (ARRAY['manager'::text, 'supervisor'::text]))))));


create policy "order_items_view_all"
on "public"."order_items"
as permissive
for select
to authenticated
using (true);


create policy "orders_managers_modify"
on "public"."orders"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = auth.uid()) AND (workers.role = ANY (ARRAY['manager'::text, 'supervisor'::text]))))));


create policy "orders_view_all"
on "public"."orders"
as permissive
for select
to authenticated
using (true);


create policy "issues_create_all"
on "public"."production_issues"
as permissive
for insert
to authenticated
with check ((reported_by_id IN ( SELECT workers.id
   FROM workers
  WHERE (workers.auth_user_id = auth.uid()))));


create policy "issues_update_managers"
on "public"."production_issues"
as permissive
for update
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = auth.uid()) AND (workers.role = ANY (ARRAY['manager'::text, 'supervisor'::text]))))));


create policy "issues_view_all"
on "public"."production_issues"
as permissive
for select
to authenticated
using (true);


create policy "Only managers can modify QC checklist items"
on "public"."qc_checklist_items"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = ( SELECT auth.uid() AS uid)) AND (workers.role = 'manager'::text) AND (workers.is_active = true)))))
with check ((EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = ( SELECT auth.uid() AS uid)) AND (workers.role = 'manager'::text) AND (workers.is_active = true)))));


create policy "QC checklist items are viewable by authenticated users"
on "public"."qc_checklist_items"
as permissive
for select
to authenticated
using (true);


create policy "Only managers can modify QC steps"
on "public"."qc_production_steps"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = ( SELECT auth.uid() AS uid)) AND (workers.role = 'manager'::text) AND (workers.is_active = true)))))
with check ((EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = ( SELECT auth.uid() AS uid)) AND (workers.role = 'manager'::text) AND (workers.is_active = true)))));


create policy "QC steps are viewable by authenticated users"
on "public"."qc_production_steps"
as permissive
for select
to authenticated
using (true);


create policy "qc_results_create"
on "public"."qc_results"
as permissive
for insert
to authenticated
with check ((task_id IN ( SELECT work_tasks.id
   FROM work_tasks
  WHERE (work_tasks.assigned_to_id IN ( SELECT workers.id
           FROM workers
          WHERE (workers.auth_user_id = ( SELECT auth.uid() AS uid)))))));


create policy "qc_results_create_all"
on "public"."qc_results"
as permissive
for insert
to authenticated
with check ((worker_id IN ( SELECT workers.id
   FROM workers
  WHERE (workers.auth_user_id = auth.uid()))));


create policy "qc_results_read"
on "public"."qc_results"
as permissive
for select
to authenticated
using ((task_id IN ( SELECT work_tasks.id
   FROM work_tasks
  WHERE true)));


create policy "qc_results_view_all"
on "public"."qc_results"
as permissive
for select
to authenticated
using (true);


create policy "qc_results_workers_update_own"
on "public"."qc_results"
as permissive
for update
to authenticated
using ((worker_id IN ( SELECT workers.id
   FROM workers
  WHERE (workers.auth_user_id = auth.uid()))));


create policy "Workers can insert own QC submissions"
on "public"."qc_submissions"
as permissive
for insert
to authenticated
with check (((worker_id = ( SELECT workers.id
   FROM workers
  WHERE (workers.auth_user_id = ( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = ( SELECT auth.uid() AS uid)) AND (workers.role = 'manager'::text))))));


create policy "Workers can read own QC submissions"
on "public"."qc_submissions"
as permissive
for select
to authenticated
using (((worker_id = ( SELECT workers.id
   FROM workers
  WHERE (workers.auth_user_id = ( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = ( SELECT auth.uid() AS uid)) AND (workers.role = 'manager'::text))))));


create policy "qc_templates_managers_modify"
on "public"."qc_templates"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = auth.uid()) AND (workers.role = ANY (ARRAY['manager'::text, 'supervisor'::text]))))));


create policy "qc_templates_modify"
on "public"."qc_templates"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = ( SELECT auth.uid() AS uid)) AND (workers.role = ANY (ARRAY['manager'::text, 'supervisor'::text]))))));


create policy "qc_templates_read"
on "public"."qc_templates"
as permissive
for select
to authenticated
using ((is_active = true));


create policy "qc_templates_view_all"
on "public"."qc_templates"
as permissive
for select
to authenticated
using (true);


create policy "All workers can view checkpoint templates"
on "public"."quality_checkpoint_templates"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers w
  WHERE ((w.auth_user_id = auth.uid()) AND (w.is_active = true)))));


create policy "Managers can modify checkpoint templates"
on "public"."quality_checkpoint_templates"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers w
  WHERE ((w.auth_user_id = auth.uid()) AND (w.role = 'manager'::text) AND (w.is_active = true)))));


create policy "All workers can view quality checkpoints"
on "public"."quality_checkpoints"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers w
  WHERE ((w.auth_user_id = auth.uid()) AND (w.is_active = true)))));


create policy "Managers can modify quality checkpoints"
on "public"."quality_checkpoints"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers w
  WHERE ((w.auth_user_id = auth.uid()) AND (w.role = 'manager'::text) AND (w.is_active = true)))));


create policy "All workers can view quality holds"
on "public"."quality_holds"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers w
  WHERE ((w.auth_user_id = auth.uid()) AND (w.is_active = true)))));


create policy "Managers can modify quality holds"
on "public"."quality_holds"
as permissive
for update
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers w
  WHERE ((w.auth_user_id = auth.uid()) AND (w.role = ANY (ARRAY['manager'::text, 'supervisor'::text])) AND (w.is_active = true)))));


create policy "Workers can create quality holds"
on "public"."quality_holds"
as permissive
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM workers w
  WHERE ((w.auth_user_id = auth.uid()) AND (w.id = quality_holds.reported_by) AND (w.is_active = true)))));


create policy "All workers can view quality patterns"
on "public"."quality_patterns"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers w
  WHERE ((w.auth_user_id = auth.uid()) AND (w.is_active = true)))));


create policy "Managers can modify quality patterns"
on "public"."quality_patterns"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers w
  WHERE ((w.auth_user_id = auth.uid()) AND (w.role = 'manager'::text) AND (w.is_active = true)))));


create policy "settings_managers_only"
on "public"."settings"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = auth.uid()) AND (workers.role = ANY (ARRAY['manager'::text, 'supervisor'::text]))))));


create policy "Managers manage slack config"
on "public"."slack_configurations"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = auth.uid()) AND (workers.role = ANY (ARRAY['manager'::text, 'supervisor'::text])) AND (workers.is_active = true)))));


create policy "All users can read slack messages"
on "public"."slack_messages"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = auth.uid()) AND (workers.is_active = true)))));


create policy "Managers can create slack messages"
on "public"."slack_messages"
as permissive
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = auth.uid()) AND (workers.role = ANY (ARRAY['manager'::text, 'supervisor'::text])) AND (workers.is_active = true)))));


create policy "transitions_create"
on "public"."stage_transitions"
as permissive
for insert
to authenticated
with check ((transitioned_by_id IN ( SELECT workers.id
   FROM workers
  WHERE (workers.auth_user_id = auth.uid()))));


create policy "transitions_view_all"
on "public"."stage_transitions"
as permissive
for select
to authenticated
using (true);


create policy "time_logs_all_access"
on "public"."time_logs"
as permissive
for all
to authenticated
using (true)
with check (true);


create policy "batches_manager_operations"
on "public"."work_batches"
as permissive
for all
to authenticated
using (true)
with check (true);


create policy "batches_view_all"
on "public"."work_batches"
as permissive
for select
to authenticated
using (true);


create policy "work_logs_all_access"
on "public"."work_logs"
as permissive
for all
to authenticated
using (true)
with check (true);


create policy "work_logs_create"
on "public"."work_logs"
as permissive
for insert
to authenticated
with check ((worker_id IN ( SELECT workers.id
   FROM workers
  WHERE (workers.auth_user_id = ( SELECT auth.uid() AS uid)))));


create policy "work_logs_read"
on "public"."work_logs"
as permissive
for select
to authenticated
using (((worker_id IN ( SELECT workers.id
   FROM workers
  WHERE (workers.auth_user_id = ( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = ( SELECT auth.uid() AS uid)) AND (workers.role = ANY (ARRAY['manager'::text, 'supervisor'::text])))))));


create policy "work_tasks_assigned"
on "public"."work_tasks"
as permissive
for select
to authenticated
using (((assigned_to_id IN ( SELECT workers.id
   FROM workers
  WHERE (workers.auth_user_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = auth.uid()) AND (workers.role = ANY (ARRAY['manager'::text, 'supervisor'::text])))))));


create policy "work_tasks_managers_delete"
on "public"."work_tasks"
as permissive
for delete
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = auth.uid()) AND (workers.role = ANY (ARRAY['manager'::text, 'supervisor'::text]))))));


create policy "work_tasks_managers_insert"
on "public"."work_tasks"
as permissive
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = auth.uid()) AND (workers.role = ANY (ARRAY['manager'::text, 'supervisor'::text]))))));


create policy "work_tasks_managers_update"
on "public"."work_tasks"
as permissive
for update
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = auth.uid()) AND (workers.role = ANY (ARRAY['manager'::text, 'supervisor'::text]))))));


create policy "work_tasks_view_all"
on "public"."work_tasks"
as permissive
for select
to authenticated
using (true);


create policy "work_tasks_workers_update_own"
on "public"."work_tasks"
as permissive
for update
to authenticated
using ((assigned_to_id IN ( SELECT workers.id
   FROM workers
  WHERE (workers.auth_user_id = auth.uid()))));


create policy "stage_assignments_managers_modify"
on "public"."worker_stage_assignments"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = auth.uid()) AND (workers.role = ANY (ARRAY['manager'::text, 'supervisor'::text]))))));


create policy "stage_assignments_view"
on "public"."worker_stage_assignments"
as permissive
for select
to authenticated
using (((worker_id IN ( SELECT workers.id
   FROM workers
  WHERE (workers.auth_user_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = auth.uid()) AND (workers.role = ANY (ARRAY['manager'::text, 'supervisor'::text])))))));


create policy "managers_can_update_workers"
on "public"."workers"
as permissive
for update
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers current_worker
  WHERE ((current_worker.auth_user_id = auth.uid()) AND (current_worker.role = 'manager'::text) AND (current_worker.is_active = true)))))
with check ((EXISTS ( SELECT 1
   FROM workers current_worker
  WHERE ((current_worker.auth_user_id = auth.uid()) AND (current_worker.role = 'manager'::text) AND (current_worker.is_active = true)))));


create policy "workers_select_all"
on "public"."workers"
as permissive
for select
to public
using (true);


create policy "workers_update_own"
on "public"."workers"
as permissive
for update
to public
using ((auth_user_id = auth.uid()))
with check ((auth_user_id = auth.uid()));


create policy "workflow_log_managers"
on "public"."workflow_execution_log"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = auth.uid()) AND (workers.role = ANY (ARRAY['manager'::text, 'supervisor'::text]))))));


create policy "workflow_performance_metrics_manager_read"
on "public"."workflow_performance_metrics"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM workers
  WHERE ((workers.auth_user_id = ( SELECT auth.uid() AS uid)) AND (workers.role = ANY (ARRAY['manager'::text, 'supervisor'::text])) AND (workers.is_active = true)))));


create policy "workflow_templates_manager_operations"
on "public"."workflow_templates"
as permissive
for all
to authenticated
using (true)
with check (true);


create policy "workflow_templates_view_all"
on "public"."workflow_templates"
as permissive
for select
to authenticated
using (true);


CREATE TRIGGER update_automation_metrics_trigger AFTER INSERT ON public.automation_executions FOR EACH ROW EXECUTE FUNCTION update_automation_rule_metrics();

CREATE TRIGGER update_quality_patterns_on_inspection AFTER INSERT ON public.inspection_results FOR EACH ROW EXECUTE FUNCTION update_quality_pattern_stats();

CREATE TRIGGER update_qc_checklist_items_updated_at BEFORE UPDATE ON public.qc_checklist_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_qc_production_steps_updated_at BEFORE UPDATE ON public.qc_production_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


