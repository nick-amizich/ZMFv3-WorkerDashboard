

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."approve_worker"("p_worker_id" "uuid", "p_approved_by_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."approve_worker"("p_worker_id" "uuid", "p_approved_by_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_logs"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete logs older than 30 days (adjust as needed)
  DELETE FROM application_logs 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_logs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."detect_workflow_bottlenecks"() RETURNS TABLE("workflow_name" "text", "stage" "text", "avg_hours" numeric, "severity" "text", "recommendation" "text")
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."detect_workflow_bottlenecks"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."detect_workflow_bottlenecks"() IS 'Automatically identifies bottlenecks and provides recommendations';



CREATE OR REPLACE FUNCTION "public"."generate_serial_number"("model" "text", "year" integer DEFAULT (EXTRACT(year FROM "now"()))::integer) RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."generate_serial_number"("model" "text", "year" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_error_patterns"("days" integer DEFAULT 7) RETURNS TABLE("error_pattern" "text", "occurrences" bigint, "first_seen" timestamp with time zone, "last_seen" timestamp with time zone, "contexts" "text"[], "sample_correlation_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_error_patterns"("days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_manager"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.workers 
    WHERE auth_user_id = auth.uid() 
    AND role = 'manager' 
    AND is_active = true
  );
$$;


ALTER FUNCTION "public"."is_manager"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reactivate_worker"("p_worker_id" "uuid", "p_reactivated_by_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."reactivate_worker"("p_worker_id" "uuid", "p_reactivated_by_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_analytics_views"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."refresh_analytics_views"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."refresh_analytics_views"() IS 'Refreshes all materialized views for updated analytics';



CREATE OR REPLACE FUNCTION "public"."reject_worker"("p_worker_id" "uuid", "p_rejected_by_id" "uuid", "p_reason" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."reject_worker"("p_worker_id" "uuid", "p_rejected_by_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."suspend_worker"("p_worker_id" "uuid", "p_suspended_by_id" "uuid", "p_reason" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."suspend_worker"("p_worker_id" "uuid", "p_suspended_by_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_automation_rule_metrics"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_automation_rule_metrics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_quality_pattern_stats"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_quality_pattern_stats"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."analytics_refresh_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "refresh_type" "text" NOT NULL,
    "status" "text" DEFAULT 'success'::"text",
    "duration_ms" integer,
    "error_message" "text",
    "refreshed_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "analytics_refresh_log_status_check" CHECK (("status" = ANY (ARRAY['success'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."analytics_refresh_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."analytics_refresh_log" IS 'Tracks analytics materialized view refresh operations';



CREATE TABLE IF NOT EXISTS "public"."application_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "level" integer NOT NULL,
    "message" "text" NOT NULL,
    "context" "text" DEFAULT 'APP'::"text" NOT NULL,
    "correlation_id" "uuid",
    "request_id" "uuid",
    "user_id" "uuid",
    "session_id" "text",
    "api_method" "text",
    "api_url" "text",
    "api_status_code" integer,
    "api_duration" integer,
    "api_user_agent" "text",
    "api_ip" "text",
    "db_query" "text",
    "db_duration" integer,
    "db_row_count" integer,
    "error_name" "text",
    "error_message" "text",
    "error_stack" "text",
    "error_code" "text",
    "performance_duration" integer,
    "memory_usage" numeric,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "chk_log_level" CHECK (("level" = ANY (ARRAY[0, 1, 2, 3])))
);


ALTER TABLE "public"."application_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."application_logs" IS 'Centralized application logging for debugging and monitoring';



COMMENT ON COLUMN "public"."application_logs"."level" IS 'Log level: 0=ERROR, 1=WARN, 2=INFO, 3=DEBUG';



COMMENT ON COLUMN "public"."application_logs"."correlation_id" IS 'Used for tracing requests across multiple operations';



COMMENT ON COLUMN "public"."application_logs"."metadata" IS 'Additional context-specific data stored as JSON';



CREATE TABLE IF NOT EXISTS "public"."automation_execution_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rule_id" "uuid",
    "workflow_instance_id" "uuid",
    "trigger_data" "jsonb",
    "conditions_evaluated" "jsonb",
    "actions_executed" "jsonb",
    "execution_status" "text" NOT NULL,
    "error_message" "text",
    "executed_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "automation_execution_log_execution_status_check" CHECK (("execution_status" = ANY (ARRAY['success'::"text", 'failed'::"text", 'partial'::"text"])))
);


ALTER TABLE "public"."automation_execution_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."automation_executions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "automation_rule_id" "uuid",
    "workflow_template_id" "uuid",
    "batch_id" "uuid",
    "task_id" "uuid",
    "trigger_data" "jsonb" NOT NULL,
    "conditions_evaluated" "jsonb" NOT NULL,
    "conditions_met" "jsonb" NOT NULL,
    "actions_executed" "jsonb" NOT NULL,
    "execution_status" "text" DEFAULT 'success'::"text",
    "error_message" "text",
    "execution_time_ms" integer,
    "execution_context" "jsonb" DEFAULT '{}'::"jsonb",
    "executed_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "automation_executions_execution_status_check" CHECK (("execution_status" = ANY (ARRAY['success'::"text", 'failed'::"text", 'partial'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."automation_executions" OWNER TO "postgres";


COMMENT ON TABLE "public"."automation_executions" IS 'Audit log of automation rule executions';



CREATE TABLE IF NOT EXISTS "public"."automation_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "automation_rule_id" "uuid",
    "date" "date" NOT NULL,
    "executions_count" integer DEFAULT 0,
    "successful_executions" integer DEFAULT 0,
    "failed_executions" integer DEFAULT 0,
    "average_execution_time_ms" numeric(10,2),
    "tasks_automated" integer DEFAULT 0,
    "manual_interventions_saved" integer DEFAULT 0,
    "time_saved_hours" numeric(8,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."automation_metrics" OWNER TO "postgres";


COMMENT ON TABLE "public"."automation_metrics" IS 'Daily performance metrics for automation rules';



CREATE TABLE IF NOT EXISTS "public"."automation_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workflow_template_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "trigger_config" "jsonb" DEFAULT '{"type": "stage_complete", "stage": null, "schedule": null, "conditions": [], "elapsed_hours": null}'::"jsonb" NOT NULL,
    "conditions" "jsonb" DEFAULT '[]'::"jsonb",
    "actions" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true,
    "priority" integer DEFAULT 0,
    "execution_order" integer DEFAULT 0,
    "execution_count" integer DEFAULT 0,
    "last_executed_at" timestamp with time zone,
    "average_execution_time_ms" integer,
    "created_by_id" "uuid",
    "updated_by_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_trigger_type" CHECK ((("trigger_config" ->> 'type'::"text") = ANY (ARRAY['stage_complete'::"text", 'time_elapsed'::"text", 'manual'::"text", 'schedule'::"text", 'batch_size'::"text", 'bottleneck_detected'::"text"])))
);


ALTER TABLE "public"."automation_rules" OWNER TO "postgres";


COMMENT ON TABLE "public"."automation_rules" IS 'Configurable automation rules for workflow management';



CREATE TABLE IF NOT EXISTS "public"."automation_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "text",
    "template_config" "jsonb" NOT NULL,
    "default_settings" "jsonb" DEFAULT '{}'::"jsonb",
    "usage_count" integer DEFAULT 0,
    "is_built_in" boolean DEFAULT false,
    "created_by_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "automation_templates_category_check" CHECK (("category" = ANY (ARRAY['productivity'::"text", 'quality'::"text", 'notifications'::"text", 'assignment'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."automation_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."automation_templates" IS 'Pre-built automation rule templates';



CREATE TABLE IF NOT EXISTS "public"."component_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cup_pair_id" "uuid" NOT NULL,
    "left_cup_serial" "text" NOT NULL,
    "right_cup_serial" "text" NOT NULL,
    "wood_batch_id" "uuid",
    "grade" "text" NOT NULL,
    "source_tracking" "jsonb" DEFAULT '{}'::"jsonb",
    "specifications" "jsonb" NOT NULL,
    "journey" "jsonb" DEFAULT '[]'::"jsonb",
    "final_metrics" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "component_tracking_grade_check" CHECK (("grade" = ANY (ARRAY['A'::"text", 'B'::"text"])))
);


ALTER TABLE "public"."component_tracking" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."production_issues" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reported_by_id" "uuid" NOT NULL,
    "task_id" "uuid",
    "batch_id" "uuid",
    "order_item_id" "uuid",
    "stage" "text" NOT NULL,
    "issue_type" "text" NOT NULL,
    "severity" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "image_urls" "text"[],
    "slack_thread_id" "text",
    "resolution_status" "text" DEFAULT 'open'::"text",
    "resolved_by_id" "uuid",
    "resolution_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "resolved_at" timestamp with time zone,
    CONSTRAINT "production_issues_issue_type_check" CHECK (("issue_type" = ANY (ARRAY['defect'::"text", 'material'::"text", 'tooling'::"text", 'process'::"text", 'other'::"text"]))),
    CONSTRAINT "production_issues_resolution_status_check" CHECK (("resolution_status" = ANY (ARRAY['open'::"text", 'investigating'::"text", 'resolved'::"text", 'wont_fix'::"text"]))),
    CONSTRAINT "production_issues_severity_check" CHECK (("severity" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."production_issues" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stage_transitions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "batch_id" "uuid",
    "order_item_id" "uuid",
    "workflow_template_id" "uuid",
    "from_stage" "text",
    "to_stage" "text" NOT NULL,
    "transition_type" "text" DEFAULT 'manual'::"text",
    "transitioned_by_id" "uuid",
    "notes" "text",
    "transition_time" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "either_batch_or_item" CHECK (((("batch_id" IS NOT NULL) AND ("order_item_id" IS NULL)) OR (("batch_id" IS NULL) AND ("order_item_id" IS NOT NULL)))),
    CONSTRAINT "stage_transitions_transition_type_check" CHECK (("transition_type" = ANY (ARRAY['auto'::"text", 'manual'::"text", 'conditional'::"text"])))
);


ALTER TABLE "public"."stage_transitions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."work_batches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "batch_type" "text" NOT NULL,
    "criteria" "jsonb" NOT NULL,
    "order_item_ids" "uuid"[] NOT NULL,
    "workflow_template_id" "uuid",
    "current_stage" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "quality_hold_id" "uuid",
    "first_pass_yield" numeric(5,2),
    CONSTRAINT "work_batches_batch_type_check" CHECK (("batch_type" = ANY (ARRAY['model'::"text", 'wood_type'::"text", 'custom'::"text"]))),
    CONSTRAINT "work_batches_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'completed'::"text", 'on_hold'::"text"])))
);


ALTER TABLE "public"."work_batches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."work_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_item_id" "uuid",
    "task_type" "text" NOT NULL,
    "task_description" "text",
    "assigned_to_id" "uuid",
    "assigned_by_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text",
    "priority" "text" DEFAULT 'normal'::"text",
    "estimated_hours" numeric(5,2),
    "actual_hours" numeric(5,2),
    "due_date" "date",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "batch_id" "uuid",
    "stage" "text",
    "auto_generated" boolean DEFAULT false,
    "depends_on_task_ids" "uuid"[],
    "manual_assignment" boolean DEFAULT false,
    "workflow_template_id" "uuid",
    "component_tracking_id" "uuid",
    "quality_score" numeric(5,2),
    "rework_count" integer DEFAULT 0,
    CONSTRAINT "work_tasks_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'normal'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "work_tasks_stage_or_type_check" CHECK ((("task_type" IS NOT NULL) OR ("stage" IS NOT NULL))),
    CONSTRAINT "work_tasks_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'assigned'::"text", 'in_progress'::"text", 'completed'::"text", 'blocked'::"text"])))
);


ALTER TABLE "public"."work_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid",
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'worker'::"text",
    "skills" "text"[] DEFAULT '{}'::"text"[],
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "approval_status" "text" DEFAULT 'pending'::"text",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "rejection_reason" "text",
    "suspension_reason" "text",
    "suspended_at" timestamp with time zone,
    "last_active_at" timestamp with time zone,
    CONSTRAINT "workers_approval_status_check" CHECK (("approval_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'suspended'::"text"]))),
    CONSTRAINT "workers_role_check" CHECK (("role" = ANY (ARRAY['worker'::"text", 'supervisor'::"text", 'manager'::"text"])))
);


ALTER TABLE "public"."workers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "trigger_rules" "jsonb" DEFAULT '{"manual_only": true}'::"jsonb" NOT NULL,
    "stages" "jsonb" NOT NULL,
    "stage_transitions" "jsonb" NOT NULL,
    "is_active" boolean DEFAULT true,
    "is_default" boolean DEFAULT false,
    "created_by_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."workflow_templates" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."current_production_status" AS
 SELECT "wb"."id" AS "batch_id",
    "wb"."name" AS "batch_name",
    "wb"."current_stage",
    "wb"."status" AS "batch_status",
    "wt"."name" AS "workflow_name",
    "count"("wt_tasks"."id") AS "total_tasks",
    "count"(
        CASE
            WHEN ("wt_tasks"."status" = 'completed'::"text") THEN 1
            ELSE NULL::integer
        END) AS "completed_tasks",
    "count"(
        CASE
            WHEN ("wt_tasks"."status" = 'in_progress'::"text") THEN 1
            ELSE NULL::integer
        END) AS "active_tasks",
    "count"(
        CASE
            WHEN ("wt_tasks"."status" = 'assigned'::"text") THEN 1
            ELSE NULL::integer
        END) AS "pending_tasks",
    COALESCE("round"((EXTRACT(epoch FROM ("now"() - "last_transition"."transition_time")) / (3600)::numeric), 1), (0)::numeric) AS "hours_in_current_stage",
    "string_agg"(DISTINCT "w"."name", ', '::"text" ORDER BY "w"."name") AS "assigned_workers",
    "count"(DISTINCT "w"."id") AS "worker_count",
    "count"("pi"."id") AS "open_issues",
    COALESCE("max"(
        CASE "pi"."severity"
            WHEN 'critical'::"text" THEN 4
            WHEN 'high'::"text" THEN 3
            WHEN 'medium'::"text" THEN 2
            WHEN 'low'::"text" THEN 1
            ELSE 0
        END), 0) AS "severity_score",
    "wb"."created_at",
    "wb"."updated_at"
   FROM ((((("public"."work_batches" "wb"
     LEFT JOIN "public"."workflow_templates" "wt" ON (("wt"."id" = "wb"."workflow_template_id")))
     LEFT JOIN "public"."work_tasks" "wt_tasks" ON (("wt_tasks"."batch_id" = "wb"."id")))
     LEFT JOIN "public"."workers" "w" ON ((("w"."id" = "wt_tasks"."assigned_to_id") AND ("w"."is_active" = true))))
     LEFT JOIN ( SELECT DISTINCT ON ("stage_transitions"."batch_id") "stage_transitions"."batch_id",
            "stage_transitions"."transition_time"
           FROM "public"."stage_transitions"
          ORDER BY "stage_transitions"."batch_id", "stage_transitions"."transition_time" DESC) "last_transition" ON (("last_transition"."batch_id" = "wb"."id")))
     LEFT JOIN "public"."production_issues" "pi" ON ((("pi"."batch_id" = "wb"."id") AND ("pi"."resolution_status" = 'open'::"text"))))
  WHERE ("wb"."status" = ANY (ARRAY['pending'::"text", 'active'::"text"]))
  GROUP BY "wb"."id", "wb"."name", "wb"."current_stage", "wb"."status", "wt"."name", "wb"."created_at", "wb"."updated_at", "last_transition"."transition_time";


ALTER TABLE "public"."current_production_status" OWNER TO "postgres";


COMMENT ON VIEW "public"."current_production_status" IS 'Real-time view of active production batches and their status';



CREATE TABLE IF NOT EXISTS "public"."custom_stages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stage_code" "text" NOT NULL,
    "stage_name" "text" NOT NULL,
    "description" "text",
    "default_estimated_hours" numeric(5,2),
    "required_skills" "text"[],
    "created_by_id" "uuid",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."custom_stages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "shopify_line_item_id" bigint,
    "product_name" "text" NOT NULL,
    "variant_title" "text",
    "quantity" integer NOT NULL,
    "price" numeric(10,2),
    "sku" "text",
    "product_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "headphone_material" "text" GENERATED ALWAYS AS (
CASE
    WHEN (("product_data" ->> 'headphone_specs'::"text") IS NOT NULL) THEN (("product_data" -> 'headphone_specs'::"text") ->> 'material'::"text")
    ELSE NULL::"text"
END) STORED,
    "headphone_color" "text" GENERATED ALWAYS AS (
CASE
    WHEN (("product_data" ->> 'headphone_specs'::"text") IS NOT NULL) THEN (("product_data" -> 'headphone_specs'::"text") ->> 'color'::"text")
    ELSE NULL::"text"
END) STORED,
    "product_category" "text" GENERATED ALWAYS AS (
CASE
    WHEN (("product_data" ->> 'headphone_specs'::"text") IS NOT NULL) THEN (("product_data" -> 'headphone_specs'::"text") ->> 'product_category'::"text")
    ELSE 'other'::"text"
END) STORED,
    "requires_custom_work" boolean GENERATED ALWAYS AS (
CASE
    WHEN (("product_data" ->> 'headphone_specs'::"text") IS NOT NULL) THEN ((("product_data" -> 'headphone_specs'::"text") ->> 'requires_custom_work'::"text"))::boolean
    ELSE false
END) STORED,
    CONSTRAINT "order_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


COMMENT ON COLUMN "public"."order_items"."headphone_material" IS 'Extracted headphone material from product_data for faster queries';



COMMENT ON COLUMN "public"."order_items"."headphone_color" IS 'Extracted headphone color from product_data for faster queries';



COMMENT ON COLUMN "public"."order_items"."product_category" IS 'Product category determined from headphone specs (headphone, accessory, cable, etc.)';



COMMENT ON COLUMN "public"."order_items"."requires_custom_work" IS 'Whether this item requires custom work like engraving';



CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shopify_order_id" bigint NOT NULL,
    "order_number" "text" NOT NULL,
    "customer_name" "text",
    "customer_email" "text",
    "total_price" numeric(10,2),
    "order_date" timestamp with time zone,
    "status" "text" DEFAULT 'pending'::"text",
    "raw_data" "jsonb" NOT NULL,
    "synced_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "orders_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'assigned'::"text", 'in_progress'::"text", 'completed'::"text", 'shipped'::"text"])))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."headphone_order_items" AS
 SELECT "oi"."id",
    "oi"."order_id",
    "oi"."shopify_line_item_id",
    "oi"."product_name",
    "oi"."variant_title",
    "oi"."quantity",
    "oi"."price",
    "oi"."sku",
    "oi"."product_data",
    "oi"."created_at",
    "oi"."headphone_material",
    "oi"."headphone_color",
    "oi"."product_category",
    "oi"."requires_custom_work",
    (("oi"."product_data" -> 'headphone_specs'::"text") ->> 'material'::"text") AS "material",
    (("oi"."product_data" -> 'headphone_specs'::"text") ->> 'color'::"text") AS "color",
    (("oi"."product_data" -> 'headphone_specs'::"text") ->> 'pad_type'::"text") AS "pad_type",
    (("oi"."product_data" -> 'headphone_specs'::"text") ->> 'cable_type'::"text") AS "cable_type",
    (("oi"."product_data" -> 'headphone_specs'::"text") ->> 'impedance'::"text") AS "impedance",
    (("oi"."product_data" -> 'headphone_specs'::"text") ->> 'custom_engraving'::"text") AS "custom_engraving",
    ((("oi"."product_data" -> 'headphone_specs'::"text") ->> 'bundle_component'::"text"))::boolean AS "bundle_component",
    "o"."order_number",
    "o"."customer_name",
    "o"."order_date",
    "o"."status" AS "order_status"
   FROM ("public"."order_items" "oi"
     JOIN "public"."orders" "o" ON (("oi"."order_id" = "o"."id")))
  WHERE (("oi"."product_category" = 'headphone'::"text") OR ("oi"."product_name" ~~* '%headphone%'::"text") OR ("oi"."product_name" ~~* '%atrium%'::"text") OR ("oi"."product_name" ~~* '%aeon%'::"text"));


ALTER TABLE "public"."headphone_order_items" OWNER TO "postgres";


COMMENT ON VIEW "public"."headphone_order_items" IS 'Denormalized view of headphone order items with all specifications extracted for easy querying';



CREATE TABLE IF NOT EXISTS "public"."inspection_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid",
    "checkpoint_id" "uuid",
    "component_tracking_id" "uuid",
    "worker_id" "uuid" NOT NULL,
    "passed" boolean NOT NULL,
    "failed_checks" "text"[],
    "root_cause" "text",
    "corrective_action" "text",
    "prevention_suggestion" "text",
    "time_to_resolve" integer,
    "notes" "text",
    "photo_urls" "text"[],
    "measurement_data" "jsonb",
    "inspected_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."inspection_results" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."log_analytics" AS
 SELECT "date"("application_logs"."created_at") AS "log_date",
    "application_logs"."context",
    "application_logs"."level",
    "count"(*) AS "total_logs",
    "count"(*) FILTER (WHERE ("application_logs"."level" = 0)) AS "error_count",
    "count"(*) FILTER (WHERE ("application_logs"."level" = 1)) AS "warn_count",
    "count"(*) FILTER (WHERE ("application_logs"."level" = 2)) AS "info_count",
    "count"(*) FILTER (WHERE ("application_logs"."level" = 3)) AS "debug_count",
    "avg"("application_logs"."api_duration") FILTER (WHERE ("application_logs"."api_duration" IS NOT NULL)) AS "avg_api_duration",
    "max"("application_logs"."api_duration") FILTER (WHERE ("application_logs"."api_duration" IS NOT NULL)) AS "max_api_duration",
    "avg"("application_logs"."db_duration") FILTER (WHERE ("application_logs"."db_duration" IS NOT NULL)) AS "avg_db_duration",
    "max"("application_logs"."db_duration") FILTER (WHERE ("application_logs"."db_duration" IS NOT NULL)) AS "max_db_duration"
   FROM "public"."application_logs"
  GROUP BY ("date"("application_logs"."created_at")), "application_logs"."context", "application_logs"."level"
  ORDER BY ("date"("application_logs"."created_at")) DESC, "application_logs"."context", "application_logs"."level";


ALTER TABLE "public"."log_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "worker_id" "uuid",
    "slack_enabled" boolean DEFAULT true,
    "slack_username" "text",
    "email_enabled" boolean DEFAULT false,
    "issue_notifications" boolean DEFAULT true,
    "workflow_notifications" boolean DEFAULT true,
    "daily_summary" boolean DEFAULT false,
    "bottleneck_alerts" boolean DEFAULT true,
    "mention_on_urgent" boolean DEFAULT true,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";


COMMENT ON TABLE "public"."notification_preferences" IS 'Worker notification preferences for Slack, email, etc.';



CREATE TABLE IF NOT EXISTS "public"."notification_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "notification_type" "text" NOT NULL,
    "recipient_type" "text" NOT NULL,
    "recipient_id" "text" NOT NULL,
    "subject" "text",
    "message" "text" NOT NULL,
    "template_data" "jsonb" DEFAULT '{}'::"jsonb",
    "priority" integer DEFAULT 0,
    "status" "text" DEFAULT 'pending'::"text",
    "retry_count" integer DEFAULT 0,
    "max_retries" integer DEFAULT 3,
    "scheduled_for" timestamp with time zone DEFAULT "now"(),
    "sent_at" timestamp with time zone,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notification_queue_notification_type_check" CHECK (("notification_type" = ANY (ARRAY['slack'::"text", 'email'::"text", 'in_app'::"text"]))),
    CONSTRAINT "notification_queue_recipient_type_check" CHECK (("recipient_type" = ANY (ARRAY['worker'::"text", 'manager'::"text", 'channel'::"text", 'all_managers'::"text"]))),
    CONSTRAINT "notification_queue_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."notification_queue" OWNER TO "postgres";


COMMENT ON TABLE "public"."notification_queue" IS 'Async notification processing queue';



CREATE TABLE IF NOT EXISTS "public"."qc_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid",
    "template_id" "uuid",
    "worker_id" "uuid",
    "results" "jsonb" NOT NULL,
    "overall_status" "text" NOT NULL,
    "inspector_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "qc_results_overall_status_check" CHECK (("overall_status" = ANY (ARRAY['pass'::"text", 'fail'::"text", 'rework'::"text"])))
);


ALTER TABLE "public"."qc_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."qc_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "checklist_items" "jsonb" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."qc_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quality_checkpoint_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stage_name" "text" NOT NULL,
    "checkpoint_type" "text" NOT NULL,
    "template_name" "text" NOT NULL,
    "checks" "jsonb" NOT NULL,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "quality_checkpoint_templates_checkpoint_type_check" CHECK (("checkpoint_type" = ANY (ARRAY['pre_work'::"text", 'in_process'::"text", 'post_work'::"text", 'gate'::"text"])))
);


ALTER TABLE "public"."quality_checkpoint_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quality_checkpoints" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workflow_template_id" "uuid",
    "stage" "text" NOT NULL,
    "checkpoint_type" "text" NOT NULL,
    "severity" "text" DEFAULT 'major'::"text" NOT NULL,
    "checks" "jsonb" NOT NULL,
    "on_failure" "text" DEFAULT 'block_progress'::"text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "quality_checkpoints_checkpoint_type_check" CHECK (("checkpoint_type" = ANY (ARRAY['pre_work'::"text", 'in_process'::"text", 'post_work'::"text", 'gate'::"text"]))),
    CONSTRAINT "quality_checkpoints_on_failure_check" CHECK (("on_failure" = ANY (ARRAY['block_progress'::"text", 'warn_continue'::"text", 'log_only'::"text"]))),
    CONSTRAINT "quality_checkpoints_severity_check" CHECK (("severity" = ANY (ARRAY['critical'::"text", 'major'::"text", 'minor'::"text"])))
);


ALTER TABLE "public"."quality_checkpoints" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quality_holds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "batch_id" "uuid",
    "component_tracking_id" "uuid",
    "hold_reason" "text" NOT NULL,
    "severity" "text" NOT NULL,
    "reported_by" "uuid" NOT NULL,
    "assigned_to" "uuid",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "resolution_notes" "text",
    "resolved_at" timestamp with time zone,
    "escalated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "quality_holds_severity_check" CHECK (("severity" = ANY (ARRAY['critical'::"text", 'major'::"text", 'minor'::"text"]))),
    CONSTRAINT "quality_holds_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'investigating'::"text", 'resolved'::"text", 'escalated'::"text"])))
);


ALTER TABLE "public"."quality_holds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quality_patterns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stage" "text" NOT NULL,
    "issue_type" "text" NOT NULL,
    "occurrence_count" integer DEFAULT 1,
    "common_causes" "text"[],
    "effective_solutions" "text"[],
    "prevention_tips" "text"[],
    "affected_models" "text"[],
    "affected_materials" "text"[],
    "severity_trend" "text",
    "last_seen" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "quality_patterns_severity_trend_check" CHECK (("severity_trend" = ANY (ARRAY['increasing'::"text", 'stable'::"text", 'decreasing'::"text"])))
);


ALTER TABLE "public"."quality_patterns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "encrypted" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid"
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."slack_configurations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_name" "text" NOT NULL,
    "webhook_url" "text" NOT NULL,
    "default_channel" "text" DEFAULT '#production'::"text",
    "notification_channels" "jsonb" DEFAULT '{"issues": "#production-issues", "workflows": "#production-flow", "daily_summary": "#production-summary"}'::"jsonb",
    "created_by_id" "uuid",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."slack_configurations" OWNER TO "postgres";


COMMENT ON TABLE "public"."slack_configurations" IS 'Slack workspace integration settings';



CREATE TABLE IF NOT EXISTS "public"."slack_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_ts" "text" NOT NULL,
    "channel" "text" NOT NULL,
    "thread_ts" "text",
    "message_type" "text" NOT NULL,
    "related_entity_type" "text",
    "related_entity_id" "uuid",
    "message_content" "text",
    "sent_successfully" boolean DEFAULT true,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "slack_messages_message_type_check" CHECK (("message_type" = ANY (ARRAY['issue_report'::"text", 'issue_resolved'::"text", 'workflow_complete'::"text", 'bottleneck_alert'::"text", 'daily_summary'::"text", 'stage_transition'::"text"]))),
    CONSTRAINT "slack_messages_related_entity_type_check" CHECK (("related_entity_type" = ANY (ARRAY['issue'::"text", 'batch'::"text", 'workflow'::"text", 'task'::"text"])))
);


ALTER TABLE "public"."slack_messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."slack_messages" IS 'Track sent Slack messages for audit and threading';



CREATE OR REPLACE VIEW "public"."stage_durations" AS
 SELECT "st"."id",
    "st"."workflow_template_id",
    "st"."batch_id",
    "st"."order_item_id",
    "st"."from_stage",
    "st"."to_stage",
    "st"."transition_time",
    "st"."transition_type",
    COALESCE(("st"."batch_id")::"text", ("st"."order_item_id")::"text") AS "entity_id",
    (EXTRACT(epoch FROM ("st"."transition_time" - "lag"("st"."transition_time") OVER (PARTITION BY COALESCE("st"."batch_id", "st"."order_item_id"), "st"."workflow_template_id" ORDER BY "st"."transition_time"))) / (3600)::numeric) AS "hours_in_previous_stage"
   FROM "public"."stage_transitions" "st";


ALTER TABLE "public"."stage_durations" OWNER TO "postgres";


COMMENT ON VIEW "public"."stage_durations" IS 'Helper view to calculate time spent in each workflow stage';



CREATE TABLE IF NOT EXISTS "public"."time_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "task_id" "uuid",
    "batch_id" "uuid",
    "stage" "text" NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone,
    "duration_minutes" integer GENERATED ALWAYS AS (
CASE
    WHEN ("end_time" IS NOT NULL) THEN (EXTRACT(epoch FROM ("end_time" - "start_time")) / (60)::numeric)
    ELSE NULL::numeric
END) STORED,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "either_task_or_batch" CHECK (((("task_id" IS NOT NULL) AND ("batch_id" IS NULL)) OR (("task_id" IS NULL) AND ("batch_id" IS NOT NULL))))
);


ALTER TABLE "public"."time_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_management_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "action_type" "text" NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "target_worker_id" "uuid",
    "target_email" "text",
    "previous_value" "jsonb",
    "new_value" "jsonb",
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_management_audit_log_action_type_check" CHECK (("action_type" = ANY (ARRAY['approve'::"text", 'reject'::"text", 'suspend'::"text", 'reactivate'::"text", 'role_change'::"text", 'invite_sent'::"text", 'invite_accepted'::"text"])))
);


ALTER TABLE "public"."user_management_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."work_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid",
    "worker_id" "uuid",
    "log_type" "text" NOT NULL,
    "time_spent_minutes" integer,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "work_logs_log_type_check" CHECK (("log_type" = ANY (ARRAY['start'::"text", 'pause'::"text", 'resume'::"text", 'complete'::"text", 'note'::"text"])))
);


ALTER TABLE "public"."work_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."worker_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "invitation_token" "text" DEFAULT "encode"("extensions"."gen_random_bytes"(32), 'hex'::"text") NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "worker_invitations_role_check" CHECK (("role" = ANY (ARRAY['worker'::"text", 'supervisor'::"text", 'manager'::"text"])))
);


ALTER TABLE "public"."worker_invitations" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."worker_productivity_metrics" AS
 SELECT "w"."id" AS "worker_id",
    "w"."name" AS "worker_name",
    "w"."role",
    "date"("tl"."start_time") AS "date",
    "count"(DISTINCT "tl"."id") AS "sessions_count",
    "sum"("tl"."duration_minutes") AS "total_minutes_worked",
    "round"("avg"("tl"."duration_minutes"), 1) AS "avg_session_minutes",
    "count"(DISTINCT "tl"."task_id") AS "tasks_worked",
    "count"(DISTINCT
        CASE
            WHEN ("wt"."status" = 'completed'::"text") THEN "tl"."task_id"
            ELSE NULL::"uuid"
        END) AS "tasks_completed",
    "count"(DISTINCT "tl"."batch_id") AS "batches_worked",
    "string_agg"(DISTINCT "tl"."stage", ', '::"text" ORDER BY "tl"."stage") AS "stages_worked",
    "count"(DISTINCT "tl"."stage") AS "unique_stages_count",
    COALESCE("pi"."issues_reported", (0)::bigint) AS "issues_reported"
   FROM ((("public"."time_logs" "tl"
     JOIN "public"."workers" "w" ON (("w"."id" = "tl"."worker_id")))
     LEFT JOIN "public"."work_tasks" "wt" ON (("wt"."id" = "tl"."task_id")))
     LEFT JOIN ( SELECT "production_issues"."reported_by_id",
            "date"("production_issues"."created_at") AS "date",
            "count"(*) AS "issues_reported"
           FROM "public"."production_issues"
          WHERE ("production_issues"."created_at" >= (CURRENT_DATE - '90 days'::interval))
          GROUP BY "production_issues"."reported_by_id", ("date"("production_issues"."created_at"))) "pi" ON ((("pi"."reported_by_id" = "w"."id") AND ("pi"."date" = "date"("tl"."start_time")))))
  WHERE (("w"."is_active" = true) AND ("tl"."start_time" >= (CURRENT_DATE - '90 days'::interval)) AND ("tl"."end_time" IS NOT NULL))
  GROUP BY "w"."id", "w"."name", "w"."role", ("date"("tl"."start_time")), "pi"."issues_reported"
  WITH NO DATA;


ALTER TABLE "public"."worker_productivity_metrics" OWNER TO "postgres";


COMMENT ON MATERIALIZED VIEW "public"."worker_productivity_metrics" IS 'Daily worker productivity tracking across stages and workflows';



CREATE TABLE IF NOT EXISTS "public"."worker_stage_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "stage" "text" NOT NULL,
    "skill_level" "text" DEFAULT 'competent'::"text",
    "is_active" boolean DEFAULT true,
    "assigned_by_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "worker_stage_assignments_skill_level_check" CHECK (("skill_level" = ANY (ARRAY['trainee'::"text", 'competent'::"text", 'expert'::"text"])))
);


ALTER TABLE "public"."worker_stage_assignments" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."workflow_daily_metrics" AS
 SELECT "wt"."id" AS "workflow_template_id",
    "wt"."name" AS "workflow_name",
    "date"("sd"."transition_time") AS "date",
    "sd"."to_stage" AS "stage",
    "count"(DISTINCT "sd"."batch_id") AS "batches_processed",
    "count"(DISTINCT "sd"."order_item_id") AS "items_processed",
    "count"(*) AS "total_transitions",
    "avg"("sd"."hours_in_previous_stage") FILTER (WHERE ("sd"."hours_in_previous_stage" IS NOT NULL)) AS "avg_hours_in_stage",
    "min"("sd"."hours_in_previous_stage") FILTER (WHERE ("sd"."hours_in_previous_stage" IS NOT NULL)) AS "min_hours_in_stage",
    "max"("sd"."hours_in_previous_stage") FILTER (WHERE ("sd"."hours_in_previous_stage" IS NOT NULL)) AS "max_hours_in_stage",
    "sum"(
        CASE
            WHEN ("sd"."transition_type" = 'auto'::"text") THEN 1
            ELSE 0
        END) AS "auto_transitions",
    "sum"(
        CASE
            WHEN ("sd"."transition_type" = 'manual'::"text") THEN 1
            ELSE 0
        END) AS "manual_transitions",
    "round"(((("sum"(
        CASE
            WHEN ("sd"."transition_type" = 'auto'::"text") THEN 1
            ELSE 0
        END))::numeric / (NULLIF("count"(*), 0))::numeric) * (100)::numeric), 2) AS "automation_percentage",
    COALESCE("pi"."issue_count", (0)::bigint) AS "issues_reported"
   FROM (("public"."stage_durations" "sd"
     JOIN "public"."workflow_templates" "wt" ON (("wt"."id" = "sd"."workflow_template_id")))
     LEFT JOIN ( SELECT "production_issues"."stage",
            "date"("production_issues"."created_at") AS "date",
            "count"(*) AS "issue_count"
           FROM "public"."production_issues"
          WHERE ("production_issues"."created_at" >= (CURRENT_DATE - '90 days'::interval))
          GROUP BY "production_issues"."stage", ("date"("production_issues"."created_at"))) "pi" ON ((("pi"."stage" = "sd"."to_stage") AND ("pi"."date" = "date"("sd"."transition_time")))))
  WHERE ("sd"."transition_time" >= (CURRENT_DATE - '90 days'::interval))
  GROUP BY "wt"."id", "wt"."name", ("date"("sd"."transition_time")), "sd"."to_stage", "pi"."issue_count"
  WITH NO DATA;


ALTER TABLE "public"."workflow_daily_metrics" OWNER TO "postgres";


COMMENT ON MATERIALIZED VIEW "public"."workflow_daily_metrics" IS 'Daily workflow performance metrics with automation and time tracking';



CREATE MATERIALIZED VIEW "public"."workflow_bottlenecks" AS
 WITH "stage_performance" AS (
         SELECT "workflow_daily_metrics"."workflow_template_id",
            "workflow_daily_metrics"."workflow_name",
            "workflow_daily_metrics"."stage",
            "avg"("workflow_daily_metrics"."avg_hours_in_stage") AS "avg_hours_in_stage",
            "max"("workflow_daily_metrics"."max_hours_in_stage") AS "max_hours_in_stage",
            "avg"("workflow_daily_metrics"."automation_percentage") AS "avg_automation_rate",
            "avg"("workflow_daily_metrics"."issues_reported") AS "avg_daily_issues",
            "count"(*) AS "data_points"
           FROM "public"."workflow_daily_metrics"
          WHERE (("workflow_daily_metrics"."date" >= (CURRENT_DATE - '30 days'::interval)) AND ("workflow_daily_metrics"."avg_hours_in_stage" IS NOT NULL))
          GROUP BY "workflow_daily_metrics"."workflow_template_id", "workflow_daily_metrics"."workflow_name", "workflow_daily_metrics"."stage"
        ), "trend_analysis" AS (
         SELECT "workflow_daily_metrics"."workflow_template_id",
            "workflow_daily_metrics"."stage",
            "avg"(
                CASE
                    WHEN ("workflow_daily_metrics"."date" >= (CURRENT_DATE - '15 days'::interval)) THEN "workflow_daily_metrics"."avg_hours_in_stage"
                    ELSE NULL::numeric
                END) AS "recent_avg",
            "avg"(
                CASE
                    WHEN (("workflow_daily_metrics"."date" >= (CURRENT_DATE - '30 days'::interval)) AND ("workflow_daily_metrics"."date" < (CURRENT_DATE - '15 days'::interval))) THEN "workflow_daily_metrics"."avg_hours_in_stage"
                    ELSE NULL::numeric
                END) AS "previous_avg"
           FROM "public"."workflow_daily_metrics"
          WHERE ("workflow_daily_metrics"."date" >= (CURRENT_DATE - '30 days'::interval))
          GROUP BY "workflow_daily_metrics"."workflow_template_id", "workflow_daily_metrics"."stage"
        )
 SELECT "sp"."workflow_template_id",
    "sp"."workflow_name",
    "sp"."stage",
    "round"("sp"."avg_hours_in_stage", 2) AS "avg_hours_in_stage",
    "round"("sp"."max_hours_in_stage", 2) AS "max_hours_in_stage",
    "rank"() OVER (PARTITION BY "sp"."workflow_template_id" ORDER BY "sp"."avg_hours_in_stage" DESC NULLS LAST) AS "stage_bottleneck_rank",
    "rank"() OVER (ORDER BY "sp"."avg_hours_in_stage" DESC NULLS LAST) AS "overall_bottleneck_rank",
    "round"("sp"."avg_automation_rate", 1) AS "avg_automation_rate",
    "round"("sp"."avg_daily_issues", 1) AS "avg_daily_issues",
        CASE
            WHEN ("ta"."recent_avg" > ("ta"."previous_avg" * 1.1)) THEN 'getting_slower'::"text"
            WHEN ("ta"."recent_avg" < ("ta"."previous_avg" * 0.9)) THEN 'getting_faster'::"text"
            ELSE 'stable'::"text"
        END AS "performance_trend",
    "sp"."data_points"
   FROM ("stage_performance" "sp"
     LEFT JOIN "trend_analysis" "ta" ON ((("ta"."workflow_template_id" = "sp"."workflow_template_id") AND ("ta"."stage" = "sp"."stage"))))
  WHERE ("sp"."data_points" >= 3)
  WITH NO DATA;


ALTER TABLE "public"."workflow_bottlenecks" OWNER TO "postgres";


COMMENT ON MATERIALIZED VIEW "public"."workflow_bottlenecks" IS 'Identifies workflow stages that consistently take longer or have issues';



CREATE TABLE IF NOT EXISTS "public"."workflow_execution_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workflow_template_id" "uuid",
    "batch_id" "uuid",
    "order_item_id" "uuid",
    "stage" "text" NOT NULL,
    "action" "text" NOT NULL,
    "action_details" "jsonb",
    "executed_by_id" "uuid",
    "execution_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "workflow_execution_log_execution_type_check" CHECK (("execution_type" = ANY (ARRAY['auto'::"text", 'manual'::"text"])))
);


ALTER TABLE "public"."workflow_execution_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_performance_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workflow_template_id" "uuid",
    "stage" "text" NOT NULL,
    "metric_date" "date" NOT NULL,
    "avg_completion_time_minutes" numeric(10,2),
    "total_tasks_completed" integer DEFAULT 0,
    "automation_success_rate" numeric(5,2),
    "manual_intervention_count" integer DEFAULT 0,
    "bottleneck_incidents" integer DEFAULT 0,
    "calculated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."workflow_performance_metrics" OWNER TO "postgres";


ALTER TABLE ONLY "public"."analytics_refresh_log"
    ADD CONSTRAINT "analytics_refresh_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."application_logs"
    ADD CONSTRAINT "application_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."automation_execution_log"
    ADD CONSTRAINT "automation_execution_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."automation_executions"
    ADD CONSTRAINT "automation_executions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."automation_metrics"
    ADD CONSTRAINT "automation_metrics_automation_rule_id_date_key" UNIQUE ("automation_rule_id", "date");



ALTER TABLE ONLY "public"."automation_metrics"
    ADD CONSTRAINT "automation_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."automation_rules"
    ADD CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."automation_templates"
    ADD CONSTRAINT "automation_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."component_tracking"
    ADD CONSTRAINT "component_tracking_cup_pair_id_key" UNIQUE ("cup_pair_id");



ALTER TABLE ONLY "public"."component_tracking"
    ADD CONSTRAINT "component_tracking_left_cup_serial_key" UNIQUE ("left_cup_serial");



ALTER TABLE ONLY "public"."component_tracking"
    ADD CONSTRAINT "component_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."component_tracking"
    ADD CONSTRAINT "component_tracking_right_cup_serial_key" UNIQUE ("right_cup_serial");



ALTER TABLE ONLY "public"."custom_stages"
    ADD CONSTRAINT "custom_stages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_stages"
    ADD CONSTRAINT "custom_stages_stage_code_key" UNIQUE ("stage_code");



ALTER TABLE ONLY "public"."inspection_results"
    ADD CONSTRAINT "inspection_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_worker_id_key" UNIQUE ("worker_id");



ALTER TABLE ONLY "public"."notification_queue"
    ADD CONSTRAINT "notification_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_shopify_line_item_id_unique" UNIQUE ("shopify_line_item_id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_shopify_order_id_key" UNIQUE ("shopify_order_id");



ALTER TABLE ONLY "public"."production_issues"
    ADD CONSTRAINT "production_issues_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qc_results"
    ADD CONSTRAINT "qc_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qc_templates"
    ADD CONSTRAINT "qc_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quality_checkpoint_templates"
    ADD CONSTRAINT "quality_checkpoint_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quality_checkpoint_templates"
    ADD CONSTRAINT "quality_checkpoint_templates_stage_name_checkpoint_type_tem_key" UNIQUE ("stage_name", "checkpoint_type", "template_name");



ALTER TABLE ONLY "public"."quality_checkpoints"
    ADD CONSTRAINT "quality_checkpoints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quality_checkpoints"
    ADD CONSTRAINT "quality_checkpoints_workflow_template_id_stage_checkpoint_t_key" UNIQUE ("workflow_template_id", "stage", "checkpoint_type");



ALTER TABLE ONLY "public"."quality_holds"
    ADD CONSTRAINT "quality_holds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quality_patterns"
    ADD CONSTRAINT "quality_patterns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quality_patterns"
    ADD CONSTRAINT "quality_patterns_stage_issue_type_key" UNIQUE ("stage", "issue_type");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."slack_configurations"
    ADD CONSTRAINT "slack_configurations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."slack_messages"
    ADD CONSTRAINT "slack_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stage_transitions"
    ADD CONSTRAINT "stage_transitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."time_logs"
    ADD CONSTRAINT "time_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_management_audit_log"
    ADD CONSTRAINT "user_management_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_batches"
    ADD CONSTRAINT "work_batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_logs"
    ADD CONSTRAINT "work_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_tasks"
    ADD CONSTRAINT "work_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."worker_invitations"
    ADD CONSTRAINT "worker_invitations_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."worker_invitations"
    ADD CONSTRAINT "worker_invitations_invitation_token_key" UNIQUE ("invitation_token");



ALTER TABLE ONLY "public"."worker_invitations"
    ADD CONSTRAINT "worker_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."worker_stage_assignments"
    ADD CONSTRAINT "worker_stage_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."worker_stage_assignments"
    ADD CONSTRAINT "worker_stage_assignments_worker_id_stage_key" UNIQUE ("worker_id", "stage");



ALTER TABLE ONLY "public"."workers"
    ADD CONSTRAINT "workers_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "public"."workers"
    ADD CONSTRAINT "workers_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."workers"
    ADD CONSTRAINT "workers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_execution_log"
    ADD CONSTRAINT "workflow_execution_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_performance_metrics"
    ADD CONSTRAINT "workflow_performance_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_performance_metrics"
    ADD CONSTRAINT "workflow_performance_metrics_workflow_template_id_stage_met_key" UNIQUE ("workflow_template_id", "stage", "metric_date");



ALTER TABLE ONLY "public"."workflow_templates"
    ADD CONSTRAINT "workflow_templates_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_analytics_refresh_log_date" ON "public"."analytics_refresh_log" USING "btree" ("refreshed_at");



CREATE INDEX "idx_application_logs_api_url" ON "public"."application_logs" USING "btree" ("api_url");



CREATE INDEX "idx_application_logs_context" ON "public"."application_logs" USING "btree" ("context");



CREATE INDEX "idx_application_logs_correlation_id" ON "public"."application_logs" USING "btree" ("correlation_id");



CREATE INDEX "idx_application_logs_created_at" ON "public"."application_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_application_logs_error_name" ON "public"."application_logs" USING "btree" ("error_name");



CREATE INDEX "idx_application_logs_level" ON "public"."application_logs" USING "btree" ("level");



CREATE INDEX "idx_application_logs_metadata" ON "public"."application_logs" USING "gin" ("metadata");



CREATE INDEX "idx_application_logs_user_id" ON "public"."application_logs" USING "btree" ("user_id");



CREATE INDEX "idx_audit_log_actor" ON "public"."user_management_audit_log" USING "btree" ("actor_id");



CREATE INDEX "idx_audit_log_created" ON "public"."user_management_audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_log_target" ON "public"."user_management_audit_log" USING "btree" ("target_worker_id");



CREATE INDEX "idx_automation_execution_log_executed" ON "public"."automation_execution_log" USING "btree" ("executed_at" DESC);



CREATE INDEX "idx_automation_execution_log_rule" ON "public"."automation_execution_log" USING "btree" ("rule_id");



CREATE INDEX "idx_automation_executions_batch" ON "public"."automation_executions" USING "btree" ("batch_id");



CREATE INDEX "idx_automation_executions_rule" ON "public"."automation_executions" USING "btree" ("automation_rule_id");



CREATE INDEX "idx_automation_executions_status_date" ON "public"."automation_executions" USING "btree" ("execution_status", "executed_at");



CREATE INDEX "idx_automation_executions_workflow" ON "public"."automation_executions" USING "btree" ("workflow_template_id");



CREATE INDEX "idx_automation_metrics_rule_date" ON "public"."automation_metrics" USING "btree" ("automation_rule_id", "date");



CREATE INDEX "idx_automation_rules_active" ON "public"."automation_rules" USING "btree" ("is_active");



CREATE INDEX "idx_automation_rules_active_priority" ON "public"."automation_rules" USING "btree" ("is_active", "priority" DESC, "execution_order");



CREATE INDEX "idx_automation_rules_trigger_type" ON "public"."automation_rules" USING "btree" ((("trigger_config" ->> 'type'::"text")));



CREATE INDEX "idx_automation_rules_workflow" ON "public"."automation_rules" USING "btree" ("workflow_template_id");



CREATE INDEX "idx_automation_templates_category" ON "public"."automation_templates" USING "btree" ("category", "is_built_in");



CREATE INDEX "idx_component_tracking_cup_pair" ON "public"."component_tracking" USING "btree" ("cup_pair_id");



CREATE INDEX "idx_component_tracking_grade" ON "public"."component_tracking" USING "btree" ("grade");



CREATE INDEX "idx_component_tracking_wood_batch" ON "public"."component_tracking" USING "btree" ("wood_batch_id");



CREATE INDEX "idx_inspection_results_component" ON "public"."inspection_results" USING "btree" ("component_tracking_id");



CREATE INDEX "idx_inspection_results_passed" ON "public"."inspection_results" USING "btree" ("passed");



CREATE INDEX "idx_inspection_results_task" ON "public"."inspection_results" USING "btree" ("task_id");



CREATE INDEX "idx_invitations_email" ON "public"."worker_invitations" USING "btree" ("email");



CREATE INDEX "idx_invitations_expires" ON "public"."worker_invitations" USING "btree" ("expires_at");



CREATE INDEX "idx_invitations_token" ON "public"."worker_invitations" USING "btree" ("invitation_token");



CREATE INDEX "idx_notification_preferences_worker" ON "public"."notification_preferences" USING "btree" ("worker_id");



CREATE INDEX "idx_notification_queue_status_priority" ON "public"."notification_queue" USING "btree" ("status", "priority", "scheduled_for");



CREATE INDEX "idx_notification_queue_type_recipient" ON "public"."notification_queue" USING "btree" ("notification_type", "recipient_type", "recipient_id");



CREATE INDEX "idx_order_items_headphone_color" ON "public"."order_items" USING "btree" ("headphone_color");



CREATE INDEX "idx_order_items_headphone_material" ON "public"."order_items" USING "btree" ("headphone_material");



CREATE INDEX "idx_order_items_order_id" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_order_items_product_category" ON "public"."order_items" USING "btree" ("product_category");



CREATE INDEX "idx_order_items_product_data_specs" ON "public"."order_items" USING "gin" ((("product_data" -> 'headphone_specs'::"text")));



CREATE INDEX "idx_order_items_requires_custom_work" ON "public"."order_items" USING "btree" ("requires_custom_work");



CREATE INDEX "idx_orders_shopify_id" ON "public"."orders" USING "btree" ("shopify_order_id");



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_production_issues_status" ON "public"."production_issues" USING "btree" ("resolution_status");



CREATE INDEX "idx_quality_checkpoints_stage" ON "public"."quality_checkpoints" USING "btree" ("stage");



CREATE INDEX "idx_quality_checkpoints_workflow" ON "public"."quality_checkpoints" USING "btree" ("workflow_template_id");



CREATE INDEX "idx_quality_holds_batch" ON "public"."quality_holds" USING "btree" ("batch_id");



CREATE INDEX "idx_quality_holds_status" ON "public"."quality_holds" USING "btree" ("status");



CREATE INDEX "idx_quality_patterns_issue" ON "public"."quality_patterns" USING "btree" ("issue_type");



CREATE INDEX "idx_quality_patterns_stage" ON "public"."quality_patterns" USING "btree" ("stage");



CREATE INDEX "idx_slack_configurations_active" ON "public"."slack_configurations" USING "btree" ("is_active");



CREATE INDEX "idx_slack_messages_channel_ts" ON "public"."slack_messages" USING "btree" ("channel", "message_ts");



CREATE INDEX "idx_slack_messages_type_entity" ON "public"."slack_messages" USING "btree" ("message_type", "related_entity_type", "related_entity_id");



CREATE INDEX "idx_stage_transitions_batch" ON "public"."stage_transitions" USING "btree" ("batch_id");



CREATE INDEX "idx_stage_transitions_time" ON "public"."stage_transitions" USING "btree" ("transition_time");



CREATE INDEX "idx_time_logs_worker_date" ON "public"."time_logs" USING "btree" ("worker_id", "start_time");



CREATE INDEX "idx_work_batches_stage" ON "public"."work_batches" USING "btree" ("current_stage");



CREATE INDEX "idx_work_batches_status" ON "public"."work_batches" USING "btree" ("status");



CREATE INDEX "idx_work_batches_workflow" ON "public"."work_batches" USING "btree" ("workflow_template_id");



CREATE INDEX "idx_work_tasks_assigned_to" ON "public"."work_tasks" USING "btree" ("assigned_to_id");



CREATE INDEX "idx_work_tasks_batch" ON "public"."work_tasks" USING "btree" ("batch_id");



CREATE INDEX "idx_work_tasks_stage" ON "public"."work_tasks" USING "btree" ("stage");



CREATE INDEX "idx_work_tasks_status" ON "public"."work_tasks" USING "btree" ("status");



CREATE INDEX "idx_worker_productivity_date" ON "public"."worker_productivity_metrics" USING "btree" ("date");



CREATE UNIQUE INDEX "idx_worker_productivity_unique" ON "public"."worker_productivity_metrics" USING "btree" ("worker_id", "date");



CREATE INDEX "idx_worker_productivity_worker" ON "public"."worker_productivity_metrics" USING "btree" ("worker_id");



CREATE INDEX "idx_worker_stage_assignments" ON "public"."worker_stage_assignments" USING "btree" ("worker_id", "stage") WHERE ("is_active" = true);



CREATE INDEX "idx_workers_approval_status" ON "public"."workers" USING "btree" ("approval_status");



CREATE INDEX "idx_workers_approved_by" ON "public"."workers" USING "btree" ("approved_by");



CREATE INDEX "idx_workers_auth_user_id" ON "public"."workers" USING "btree" ("auth_user_id");



CREATE INDEX "idx_workers_role" ON "public"."workers" USING "btree" ("role");



CREATE INDEX "idx_workflow_bottlenecks_performance" ON "public"."workflow_bottlenecks" USING "btree" ("avg_hours_in_stage" DESC);



CREATE INDEX "idx_workflow_bottlenecks_rank" ON "public"."workflow_bottlenecks" USING "btree" ("stage_bottleneck_rank");



CREATE UNIQUE INDEX "idx_workflow_bottlenecks_unique" ON "public"."workflow_bottlenecks" USING "btree" ("workflow_template_id", "stage");



CREATE INDEX "idx_workflow_daily_metrics_date" ON "public"."workflow_daily_metrics" USING "btree" ("date");



CREATE INDEX "idx_workflow_daily_metrics_template" ON "public"."workflow_daily_metrics" USING "btree" ("workflow_template_id");



CREATE UNIQUE INDEX "idx_workflow_daily_metrics_unique" ON "public"."workflow_daily_metrics" USING "btree" ("workflow_template_id", "date", "stage");



CREATE INDEX "idx_workflow_execution_log_batch" ON "public"."workflow_execution_log" USING "btree" ("batch_id");



CREATE INDEX "idx_workflow_execution_log_time" ON "public"."workflow_execution_log" USING "btree" ("created_at");



CREATE INDEX "idx_workflow_performance_metrics_workflow" ON "public"."workflow_performance_metrics" USING "btree" ("workflow_template_id", "metric_date");



CREATE OR REPLACE TRIGGER "update_automation_metrics_trigger" AFTER INSERT ON "public"."automation_executions" FOR EACH ROW EXECUTE FUNCTION "public"."update_automation_rule_metrics"();



CREATE OR REPLACE TRIGGER "update_quality_patterns_on_inspection" AFTER INSERT ON "public"."inspection_results" FOR EACH ROW EXECUTE FUNCTION "public"."update_quality_pattern_stats"();



ALTER TABLE ONLY "public"."automation_execution_log"
    ADD CONSTRAINT "automation_execution_log_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "public"."automation_rules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."automation_executions"
    ADD CONSTRAINT "automation_executions_automation_rule_id_fkey" FOREIGN KEY ("automation_rule_id") REFERENCES "public"."automation_rules"("id");



ALTER TABLE ONLY "public"."automation_executions"
    ADD CONSTRAINT "automation_executions_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."work_batches"("id");



ALTER TABLE ONLY "public"."automation_executions"
    ADD CONSTRAINT "automation_executions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."work_tasks"("id");



ALTER TABLE ONLY "public"."automation_executions"
    ADD CONSTRAINT "automation_executions_workflow_template_id_fkey" FOREIGN KEY ("workflow_template_id") REFERENCES "public"."workflow_templates"("id");



ALTER TABLE ONLY "public"."automation_metrics"
    ADD CONSTRAINT "automation_metrics_automation_rule_id_fkey" FOREIGN KEY ("automation_rule_id") REFERENCES "public"."automation_rules"("id");



ALTER TABLE ONLY "public"."automation_rules"
    ADD CONSTRAINT "automation_rules_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."workers"("id");



ALTER TABLE ONLY "public"."automation_rules"
    ADD CONSTRAINT "automation_rules_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "public"."workers"("id");



ALTER TABLE ONLY "public"."automation_rules"
    ADD CONSTRAINT "automation_rules_workflow_template_id_fkey" FOREIGN KEY ("workflow_template_id") REFERENCES "public"."workflow_templates"("id");



ALTER TABLE ONLY "public"."automation_templates"
    ADD CONSTRAINT "automation_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."workers"("id");



ALTER TABLE ONLY "public"."custom_stages"
    ADD CONSTRAINT "custom_stages_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."workers"("id");



ALTER TABLE ONLY "public"."inspection_results"
    ADD CONSTRAINT "inspection_results_checkpoint_id_fkey" FOREIGN KEY ("checkpoint_id") REFERENCES "public"."quality_checkpoints"("id");



ALTER TABLE ONLY "public"."inspection_results"
    ADD CONSTRAINT "inspection_results_component_tracking_id_fkey" FOREIGN KEY ("component_tracking_id") REFERENCES "public"."component_tracking"("id");



ALTER TABLE ONLY "public"."inspection_results"
    ADD CONSTRAINT "inspection_results_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."work_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inspection_results"
    ADD CONSTRAINT "inspection_results_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."production_issues"
    ADD CONSTRAINT "production_issues_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."work_batches"("id");



ALTER TABLE ONLY "public"."production_issues"
    ADD CONSTRAINT "production_issues_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id");



ALTER TABLE ONLY "public"."production_issues"
    ADD CONSTRAINT "production_issues_reported_by_id_fkey" FOREIGN KEY ("reported_by_id") REFERENCES "public"."workers"("id");



ALTER TABLE ONLY "public"."production_issues"
    ADD CONSTRAINT "production_issues_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "public"."workers"("id");



ALTER TABLE ONLY "public"."production_issues"
    ADD CONSTRAINT "production_issues_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."work_tasks"("id");



ALTER TABLE ONLY "public"."qc_results"
    ADD CONSTRAINT "qc_results_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."work_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."qc_results"
    ADD CONSTRAINT "qc_results_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."qc_templates"("id");



ALTER TABLE ONLY "public"."qc_results"
    ADD CONSTRAINT "qc_results_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id");



ALTER TABLE ONLY "public"."quality_checkpoints"
    ADD CONSTRAINT "quality_checkpoints_workflow_template_id_fkey" FOREIGN KEY ("workflow_template_id") REFERENCES "public"."workflow_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quality_holds"
    ADD CONSTRAINT "quality_holds_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."workers"("id");



ALTER TABLE ONLY "public"."quality_holds"
    ADD CONSTRAINT "quality_holds_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."work_batches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quality_holds"
    ADD CONSTRAINT "quality_holds_component_tracking_id_fkey" FOREIGN KEY ("component_tracking_id") REFERENCES "public"."component_tracking"("id");



ALTER TABLE ONLY "public"."quality_holds"
    ADD CONSTRAINT "quality_holds_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "public"."workers"("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."workers"("id");



ALTER TABLE ONLY "public"."slack_configurations"
    ADD CONSTRAINT "slack_configurations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."workers"("id");



ALTER TABLE ONLY "public"."stage_transitions"
    ADD CONSTRAINT "stage_transitions_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."work_batches"("id");



ALTER TABLE ONLY "public"."stage_transitions"
    ADD CONSTRAINT "stage_transitions_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id");



ALTER TABLE ONLY "public"."stage_transitions"
    ADD CONSTRAINT "stage_transitions_transitioned_by_id_fkey" FOREIGN KEY ("transitioned_by_id") REFERENCES "public"."workers"("id");



ALTER TABLE ONLY "public"."stage_transitions"
    ADD CONSTRAINT "stage_transitions_workflow_template_id_fkey" FOREIGN KEY ("workflow_template_id") REFERENCES "public"."workflow_templates"("id");



ALTER TABLE ONLY "public"."time_logs"
    ADD CONSTRAINT "time_logs_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."work_batches"("id");



ALTER TABLE ONLY "public"."time_logs"
    ADD CONSTRAINT "time_logs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."work_tasks"("id");



ALTER TABLE ONLY "public"."time_logs"
    ADD CONSTRAINT "time_logs_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id");



ALTER TABLE ONLY "public"."user_management_audit_log"
    ADD CONSTRAINT "user_management_audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."workers"("id");



ALTER TABLE ONLY "public"."user_management_audit_log"
    ADD CONSTRAINT "user_management_audit_log_target_worker_id_fkey" FOREIGN KEY ("target_worker_id") REFERENCES "public"."workers"("id");



ALTER TABLE ONLY "public"."work_batches"
    ADD CONSTRAINT "work_batches_quality_hold_id_fkey" FOREIGN KEY ("quality_hold_id") REFERENCES "public"."quality_holds"("id");



ALTER TABLE ONLY "public"."work_batches"
    ADD CONSTRAINT "work_batches_workflow_template_id_fkey" FOREIGN KEY ("workflow_template_id") REFERENCES "public"."workflow_templates"("id");



ALTER TABLE ONLY "public"."work_logs"
    ADD CONSTRAINT "work_logs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."work_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_logs"
    ADD CONSTRAINT "work_logs_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id");



ALTER TABLE ONLY "public"."work_tasks"
    ADD CONSTRAINT "work_tasks_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."workers"("id");



ALTER TABLE ONLY "public"."work_tasks"
    ADD CONSTRAINT "work_tasks_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."workers"("id");



ALTER TABLE ONLY "public"."work_tasks"
    ADD CONSTRAINT "work_tasks_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."work_batches"("id");



ALTER TABLE ONLY "public"."work_tasks"
    ADD CONSTRAINT "work_tasks_component_tracking_id_fkey" FOREIGN KEY ("component_tracking_id") REFERENCES "public"."component_tracking"("id");



ALTER TABLE ONLY "public"."work_tasks"
    ADD CONSTRAINT "work_tasks_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_tasks"
    ADD CONSTRAINT "work_tasks_workflow_template_id_fkey" FOREIGN KEY ("workflow_template_id") REFERENCES "public"."workflow_templates"("id");



ALTER TABLE ONLY "public"."worker_invitations"
    ADD CONSTRAINT "worker_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."workers"("id");



ALTER TABLE ONLY "public"."worker_stage_assignments"
    ADD CONSTRAINT "worker_stage_assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."workers"("id");



ALTER TABLE ONLY "public"."worker_stage_assignments"
    ADD CONSTRAINT "worker_stage_assignments_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id");



ALTER TABLE ONLY "public"."workers"
    ADD CONSTRAINT "workers_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."workers"("id");



ALTER TABLE ONLY "public"."workers"
    ADD CONSTRAINT "workers_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_execution_log"
    ADD CONSTRAINT "workflow_execution_log_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."work_batches"("id");



ALTER TABLE ONLY "public"."workflow_execution_log"
    ADD CONSTRAINT "workflow_execution_log_executed_by_id_fkey" FOREIGN KEY ("executed_by_id") REFERENCES "public"."workers"("id");



ALTER TABLE ONLY "public"."workflow_execution_log"
    ADD CONSTRAINT "workflow_execution_log_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id");



ALTER TABLE ONLY "public"."workflow_execution_log"
    ADD CONSTRAINT "workflow_execution_log_workflow_template_id_fkey" FOREIGN KEY ("workflow_template_id") REFERENCES "public"."workflow_templates"("id");



ALTER TABLE ONLY "public"."workflow_performance_metrics"
    ADD CONSTRAINT "workflow_performance_metrics_workflow_template_id_fkey" FOREIGN KEY ("workflow_template_id") REFERENCES "public"."workflow_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_templates"
    ADD CONSTRAINT "workflow_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."workers"("id");



CREATE POLICY "All users can read automation executions" ON "public"."automation_executions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers"
  WHERE (("workers"."auth_user_id" = "auth"."uid"()) AND ("workers"."is_active" = true)))));



CREATE POLICY "All users can read automation rules" ON "public"."automation_rules" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers"
  WHERE (("workers"."auth_user_id" = "auth"."uid"()) AND ("workers"."is_active" = true)))));



CREATE POLICY "All users can read automation templates" ON "public"."automation_templates" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers"
  WHERE (("workers"."auth_user_id" = "auth"."uid"()) AND ("workers"."is_active" = true)))));



CREATE POLICY "All users can read slack messages" ON "public"."slack_messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers"
  WHERE (("workers"."auth_user_id" = "auth"."uid"()) AND ("workers"."is_active" = true)))));



CREATE POLICY "All workers can view checkpoint templates" ON "public"."quality_checkpoint_templates" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers" "w"
  WHERE (("w"."auth_user_id" = "auth"."uid"()) AND ("w"."is_active" = true)))));



CREATE POLICY "All workers can view inspection results" ON "public"."inspection_results" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers" "w"
  WHERE (("w"."auth_user_id" = "auth"."uid"()) AND ("w"."is_active" = true)))));



CREATE POLICY "All workers can view quality checkpoints" ON "public"."quality_checkpoints" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers" "w"
  WHERE (("w"."auth_user_id" = "auth"."uid"()) AND ("w"."is_active" = true)))));



CREATE POLICY "All workers can view quality holds" ON "public"."quality_holds" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers" "w"
  WHERE (("w"."auth_user_id" = "auth"."uid"()) AND ("w"."is_active" = true)))));



CREATE POLICY "All workers can view quality patterns" ON "public"."quality_patterns" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers" "w"
  WHERE (("w"."auth_user_id" = "auth"."uid"()) AND ("w"."is_active" = true)))));



CREATE POLICY "Managers can create slack messages" ON "public"."slack_messages" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workers"
  WHERE (("workers"."auth_user_id" = "auth"."uid"()) AND ("workers"."role" = ANY (ARRAY['manager'::"text", 'supervisor'::"text"])) AND ("workers"."is_active" = true)))));



CREATE POLICY "Managers can modify automation templates" ON "public"."automation_templates" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers"
  WHERE (("workers"."auth_user_id" = "auth"."uid"()) AND ("workers"."role" = ANY (ARRAY['manager'::"text", 'supervisor'::"text"])) AND ("workers"."is_active" = true)))));



CREATE POLICY "Managers can modify checkpoint templates" ON "public"."quality_checkpoint_templates" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers" "w"
  WHERE (("w"."auth_user_id" = "auth"."uid"()) AND ("w"."role" = 'manager'::"text") AND ("w"."is_active" = true)))));



CREATE POLICY "Managers can modify component tracking" ON "public"."component_tracking" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers" "w"
  WHERE (("w"."auth_user_id" = "auth"."uid"()) AND ("w"."role" = ANY (ARRAY['manager'::"text", 'supervisor'::"text"])) AND ("w"."is_active" = true)))));



CREATE POLICY "Managers can modify quality checkpoints" ON "public"."quality_checkpoints" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers" "w"
  WHERE (("w"."auth_user_id" = "auth"."uid"()) AND ("w"."role" = 'manager'::"text") AND ("w"."is_active" = true)))));



CREATE POLICY "Managers can modify quality holds" ON "public"."quality_holds" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers" "w"
  WHERE (("w"."auth_user_id" = "auth"."uid"()) AND ("w"."role" = ANY (ARRAY['manager'::"text", 'supervisor'::"text"])) AND ("w"."is_active" = true)))));



CREATE POLICY "Managers can modify quality patterns" ON "public"."quality_patterns" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers" "w"
  WHERE (("w"."auth_user_id" = "auth"."uid"()) AND ("w"."role" = 'manager'::"text") AND ("w"."is_active" = true)))));



CREATE POLICY "Managers can read analytics refresh log" ON "public"."analytics_refresh_log" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers"
  WHERE (("workers"."auth_user_id" = "auth"."uid"()) AND ("workers"."role" = ANY (ARRAY['manager'::"text", 'supervisor'::"text"])) AND ("workers"."is_active" = true)))));



CREATE POLICY "Managers can read automation metrics" ON "public"."automation_metrics" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers"
  WHERE (("workers"."auth_user_id" = "auth"."uid"()) AND ("workers"."role" = ANY (ARRAY['manager'::"text", 'supervisor'::"text"])) AND ("workers"."is_active" = true)))));



CREATE POLICY "Managers can view all logs" ON "public"."application_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers"
  WHERE (("workers"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("workers"."role" = ANY (ARRAY['manager'::"text", 'supervisor'::"text"])) AND ("workers"."is_active" = true)))));



CREATE POLICY "Managers manage automation rules" ON "public"."automation_rules" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers"
  WHERE (("workers"."auth_user_id" = "auth"."uid"()) AND ("workers"."role" = ANY (ARRAY['manager'::"text", 'supervisor'::"text"])) AND ("workers"."is_active" = true)))));



CREATE POLICY "Managers manage notification queue" ON "public"."notification_queue" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers"
  WHERE (("workers"."auth_user_id" = "auth"."uid"()) AND ("workers"."role" = ANY (ARRAY['manager'::"text", 'supervisor'::"text"])) AND ("workers"."is_active" = true)))));



CREATE POLICY "Managers manage slack config" ON "public"."slack_configurations" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers"
  WHERE (("workers"."auth_user_id" = "auth"."uid"()) AND ("workers"."role" = ANY (ARRAY['manager'::"text", 'supervisor'::"text"])) AND ("workers"."is_active" = true)))));



CREATE POLICY "System can create automation executions" ON "public"."automation_executions" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "System can insert logs" ON "public"."application_logs" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Workers can create inspection results" ON "public"."inspection_results" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workers" "w"
  WHERE (("w"."auth_user_id" = "auth"."uid"()) AND ("w"."id" = "inspection_results"."worker_id") AND ("w"."is_active" = true)))));



CREATE POLICY "Workers can create quality holds" ON "public"."quality_holds" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workers" "w"
  WHERE (("w"."auth_user_id" = "auth"."uid"()) AND ("w"."id" = "quality_holds"."reported_by") AND ("w"."is_active" = true)))));



CREATE POLICY "Workers can view component tracking" ON "public"."component_tracking" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers" "w"
  WHERE (("w"."auth_user_id" = "auth"."uid"()) AND ("w"."is_active" = true)))));



CREATE POLICY "Workers manage own preferences" ON "public"."notification_preferences" TO "authenticated" USING (("worker_id" IN ( SELECT "workers"."id"
   FROM "public"."workers"
  WHERE (("workers"."auth_user_id" = "auth"."uid"()) AND ("workers"."is_active" = true)))));



ALTER TABLE "public"."analytics_refresh_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."application_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."automation_execution_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "automation_execution_log_manager_read" ON "public"."automation_execution_log" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers"
  WHERE (("workers"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("workers"."role" = ANY (ARRAY['manager'::"text", 'supervisor'::"text"])) AND ("workers"."is_active" = true)))));



ALTER TABLE "public"."automation_executions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."automation_metrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."automation_rules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "automation_rules_manager_all" ON "public"."automation_rules" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers"
  WHERE (("workers"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("workers"."role" = ANY (ARRAY['manager'::"text", 'supervisor'::"text"])) AND ("workers"."is_active" = true)))));



ALTER TABLE "public"."automation_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "batches_manager_operations" ON "public"."work_batches" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "batches_view_all" ON "public"."work_batches" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."component_tracking" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."custom_stages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "custom_stages_managers" ON "public"."custom_stages" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers"
  WHERE (("workers"."auth_user_id" = "auth"."uid"()) AND ("workers"."role" = ANY (ARRAY['manager'::"text", 'supervisor'::"text"]))))));



ALTER TABLE "public"."inspection_results" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "issues_create_all" ON "public"."production_issues" FOR INSERT TO "authenticated" WITH CHECK (("reported_by_id" IN ( SELECT "workers"."id"
   FROM "public"."workers"
  WHERE ("workers"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "issues_update_managers" ON "public"."production_issues" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers"
  WHERE (("workers"."auth_user_id" = "auth"."uid"()) AND ("workers"."role" = ANY (ARRAY['manager'::"text", 'supervisor'::"text"]))))));



CREATE POLICY "issues_view_all" ON "public"."production_issues" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_items_managers_modify" ON "public"."order_items" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers"
  WHERE (("workers"."auth_user_id" = "auth"."uid"()) AND ("workers"."role" = ANY (ARRAY['manager'::"text", 'supervisor'::"text"]))))));



CREATE POLICY "order_items_view_all" ON "public"."order_items" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders_managers_modify" ON "public"."orders" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers"
  WHERE (("workers"."auth_user_id" = "auth"."uid"()) AND ("workers"."role" = ANY (ARRAY['manager'::"text", 'supervisor'::"text"]))))));



CREATE POLICY "orders_view_all" ON "public"."orders" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."production_issues" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."qc_results" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "qc_results_create" ON "public"."qc_results" FOR INSERT TO "authenticated" WITH CHECK (("task_id" IN ( SELECT "work_tasks"."id"
   FROM "public"."work_tasks"
  WHERE ("work_tasks"."assigned_to_id" IN ( SELECT "workers"."id"
           FROM "public"."workers"
          WHERE ("workers"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "qc_results_create_all" ON "public"."qc_results" FOR INSERT TO "authenticated" WITH CHECK (("worker_id" IN ( SELECT "workers"."id"
   FROM "public"."workers"
  WHERE ("workers"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "qc_results_read" ON "public"."qc_results" FOR SELECT TO "authenticated" USING (("task_id" IN ( SELECT "work_tasks"."id"
   FROM "public"."work_tasks"
  WHERE true)));



CREATE POLICY "qc_results_view_all" ON "public"."qc_results" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "qc_results_workers_update_own" ON "public"."qc_results" FOR UPDATE TO "authenticated" USING (("worker_id" IN ( SELECT "workers"."id"
   FROM "public"."workers"
  WHERE ("workers"."auth_user_id" = "auth"."uid"()))));



ALTER TABLE "public"."qc_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "qc_templates_managers_modify" ON "public"."qc_templates" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers"
  WHERE (("workers"."auth_user_id" = "auth"."uid"()) AND ("workers"."role" = ANY (ARRAY['manager'::"text", 'supervisor'::"text"]))))));



CREATE POLICY "qc_templates_modify" ON "public"."qc_templates" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers"
  WHERE (("workers"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("workers"."role" = ANY (ARRAY['manager'::"text", 'supervisor'::"text"]))))));



CREATE POLICY "qc_templates_read" ON "public"."qc_templates" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "qc_templates_view_all" ON "public"."qc_templates" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."quality_checkpoint_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quality_checkpoints" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quality_holds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quality_patterns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "settings_managers_only" ON "public"."settings" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers"
  WHERE (("workers"."auth_user_id" = "auth"."uid"()) AND ("workers"."role" = ANY (ARRAY['manager'::"text", 'supervisor'::"text"]))))));



ALTER TABLE "public"."slack_configurations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."slack_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stage_assignments_managers_modify" ON "public"."worker_stage_assignments" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers"
  WHERE (("workers"."auth_user_id" = "auth"."uid"()) AND ("workers"."role" = ANY (ARRAY['manager'::"text", 'supervisor'::"text"]))))));



CREATE POLICY "stage_assignments_view" ON "public"."worker_stage_assignments" FOR SELECT TO "authenticated" USING ((("worker_id" IN ( SELECT "workers"."id"
   FROM "public"."workers"
  WHERE ("workers"."auth_user_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."workers"
  WHERE (("workers"."auth_user_id" = "auth"."uid"()) AND ("workers"."role" = ANY (ARRAY['manager'::"text", 'supervisor'::"text"])))))));



ALTER TABLE "public"."stage_transitions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."time_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "time_logs_all_access" ON "public"."time_logs" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "transitions_create" ON "public"."stage_transitions" FOR INSERT TO "authenticated" WITH CHECK (("transitioned_by_id" IN ( SELECT "workers"."id"
   FROM "public"."workers"
  WHERE ("workers"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "transitions_view_all" ON "public"."stage_transitions" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."user_management_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."work_batches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."work_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "work_logs_all_access" ON "public"."work_logs" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "work_logs_create" ON "public"."work_logs" FOR INSERT TO "authenticated" WITH CHECK (("worker_id" IN ( SELECT "workers"."id"
   FROM "public"."workers"
  WHERE ("workers"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "work_logs_read" ON "public"."work_logs" FOR SELECT TO "authenticated" USING ((("worker_id" IN ( SELECT "workers"."id"
   FROM "public"."workers"
  WHERE ("workers"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))) OR (EXISTS ( SELECT 1
   FROM "public"."workers"
  WHERE (("workers"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("workers"."role" = ANY (ARRAY['manager'::"text", 'supervisor'::"text"])))))));



ALTER TABLE "public"."work_tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "work_tasks_assigned" ON "public"."work_tasks" FOR SELECT TO "authenticated" USING ((("assigned_to_id" IN ( SELECT "workers"."id"
   FROM "public"."workers"
  WHERE ("workers"."auth_user_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."workers"
  WHERE (("workers"."auth_user_id" = "auth"."uid"()) AND ("workers"."role" = ANY (ARRAY['manager'::"text", 'supervisor'::"text"])))))));



CREATE POLICY "work_tasks_managers_delete" ON "public"."work_tasks" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers"
  WHERE (("workers"."auth_user_id" = "auth"."uid"()) AND ("workers"."role" = ANY (ARRAY['manager'::"text", 'supervisor'::"text"]))))));



CREATE POLICY "work_tasks_managers_insert" ON "public"."work_tasks" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workers"
  WHERE (("workers"."auth_user_id" = "auth"."uid"()) AND ("workers"."role" = ANY (ARRAY['manager'::"text", 'supervisor'::"text"]))))));



CREATE POLICY "work_tasks_managers_update" ON "public"."work_tasks" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers"
  WHERE (("workers"."auth_user_id" = "auth"."uid"()) AND ("workers"."role" = ANY (ARRAY['manager'::"text", 'supervisor'::"text"]))))));



CREATE POLICY "work_tasks_view_all" ON "public"."work_tasks" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "work_tasks_workers_update_own" ON "public"."work_tasks" FOR UPDATE TO "authenticated" USING (("assigned_to_id" IN ( SELECT "workers"."id"
   FROM "public"."workers"
  WHERE ("workers"."auth_user_id" = "auth"."uid"()))));



ALTER TABLE "public"."worker_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."worker_stage_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workers_select_all" ON "public"."workers" FOR SELECT USING (true);



CREATE POLICY "workers_update_own" ON "public"."workers" FOR UPDATE USING (("auth_user_id" = "auth"."uid"())) WITH CHECK (("auth_user_id" = "auth"."uid"()));



ALTER TABLE "public"."workflow_execution_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workflow_log_managers" ON "public"."workflow_execution_log" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers"
  WHERE (("workers"."auth_user_id" = "auth"."uid"()) AND ("workers"."role" = ANY (ARRAY['manager'::"text", 'supervisor'::"text"]))))));



ALTER TABLE "public"."workflow_performance_metrics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workflow_performance_metrics_manager_read" ON "public"."workflow_performance_metrics" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workers"
  WHERE (("workers"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("workers"."role" = ANY (ARRAY['manager'::"text", 'supervisor'::"text"])) AND ("workers"."is_active" = true)))));



ALTER TABLE "public"."workflow_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workflow_templates_manager_operations" ON "public"."workflow_templates" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "workflow_templates_view_all" ON "public"."workflow_templates" FOR SELECT TO "authenticated" USING (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."analytics_refresh_log";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."automation_executions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."automation_metrics";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."automation_rules";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."automation_templates";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notification_preferences";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notification_queue";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."production_issues";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."slack_configurations";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."slack_messages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."stage_transitions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."time_logs";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."work_batches";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."work_logs";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."work_tasks";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."workflow_execution_log";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."approve_worker"("p_worker_id" "uuid", "p_approved_by_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_worker"("p_worker_id" "uuid", "p_approved_by_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_worker"("p_worker_id" "uuid", "p_approved_by_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."detect_workflow_bottlenecks"() TO "anon";
GRANT ALL ON FUNCTION "public"."detect_workflow_bottlenecks"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."detect_workflow_bottlenecks"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_serial_number"("model" "text", "year" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_serial_number"("model" "text", "year" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_serial_number"("model" "text", "year" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_error_patterns"("days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_error_patterns"("days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_error_patterns"("days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_manager"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_manager"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_manager"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reactivate_worker"("p_worker_id" "uuid", "p_reactivated_by_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reactivate_worker"("p_worker_id" "uuid", "p_reactivated_by_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reactivate_worker"("p_worker_id" "uuid", "p_reactivated_by_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_analytics_views"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_analytics_views"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_analytics_views"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reject_worker"("p_worker_id" "uuid", "p_rejected_by_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."reject_worker"("p_worker_id" "uuid", "p_rejected_by_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_worker"("p_worker_id" "uuid", "p_rejected_by_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."suspend_worker"("p_worker_id" "uuid", "p_suspended_by_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."suspend_worker"("p_worker_id" "uuid", "p_suspended_by_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."suspend_worker"("p_worker_id" "uuid", "p_suspended_by_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_automation_rule_metrics"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_automation_rule_metrics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_automation_rule_metrics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_quality_pattern_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_quality_pattern_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_quality_pattern_stats"() TO "service_role";


















GRANT ALL ON TABLE "public"."analytics_refresh_log" TO "anon";
GRANT ALL ON TABLE "public"."analytics_refresh_log" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_refresh_log" TO "service_role";



GRANT ALL ON TABLE "public"."application_logs" TO "anon";
GRANT ALL ON TABLE "public"."application_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."application_logs" TO "service_role";



GRANT ALL ON TABLE "public"."automation_execution_log" TO "anon";
GRANT ALL ON TABLE "public"."automation_execution_log" TO "authenticated";
GRANT ALL ON TABLE "public"."automation_execution_log" TO "service_role";



GRANT ALL ON TABLE "public"."automation_executions" TO "anon";
GRANT ALL ON TABLE "public"."automation_executions" TO "authenticated";
GRANT ALL ON TABLE "public"."automation_executions" TO "service_role";



GRANT ALL ON TABLE "public"."automation_metrics" TO "anon";
GRANT ALL ON TABLE "public"."automation_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."automation_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."automation_rules" TO "anon";
GRANT ALL ON TABLE "public"."automation_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."automation_rules" TO "service_role";



GRANT ALL ON TABLE "public"."automation_templates" TO "anon";
GRANT ALL ON TABLE "public"."automation_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."automation_templates" TO "service_role";



GRANT ALL ON TABLE "public"."component_tracking" TO "anon";
GRANT ALL ON TABLE "public"."component_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."component_tracking" TO "service_role";



GRANT ALL ON TABLE "public"."production_issues" TO "anon";
GRANT ALL ON TABLE "public"."production_issues" TO "authenticated";
GRANT ALL ON TABLE "public"."production_issues" TO "service_role";



GRANT ALL ON TABLE "public"."stage_transitions" TO "anon";
GRANT ALL ON TABLE "public"."stage_transitions" TO "authenticated";
GRANT ALL ON TABLE "public"."stage_transitions" TO "service_role";



GRANT ALL ON TABLE "public"."work_batches" TO "anon";
GRANT ALL ON TABLE "public"."work_batches" TO "authenticated";
GRANT ALL ON TABLE "public"."work_batches" TO "service_role";



GRANT ALL ON TABLE "public"."work_tasks" TO "anon";
GRANT ALL ON TABLE "public"."work_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."work_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."workers" TO "anon";
GRANT ALL ON TABLE "public"."workers" TO "authenticated";
GRANT ALL ON TABLE "public"."workers" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_templates" TO "anon";
GRANT ALL ON TABLE "public"."workflow_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_templates" TO "service_role";



GRANT ALL ON TABLE "public"."current_production_status" TO "anon";
GRANT ALL ON TABLE "public"."current_production_status" TO "authenticated";
GRANT ALL ON TABLE "public"."current_production_status" TO "service_role";



GRANT ALL ON TABLE "public"."custom_stages" TO "anon";
GRANT ALL ON TABLE "public"."custom_stages" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_stages" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."headphone_order_items" TO "anon";
GRANT ALL ON TABLE "public"."headphone_order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."headphone_order_items" TO "service_role";



GRANT ALL ON TABLE "public"."inspection_results" TO "anon";
GRANT ALL ON TABLE "public"."inspection_results" TO "authenticated";
GRANT ALL ON TABLE "public"."inspection_results" TO "service_role";



GRANT ALL ON TABLE "public"."log_analytics" TO "anon";
GRANT ALL ON TABLE "public"."log_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."log_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."notification_queue" TO "anon";
GRANT ALL ON TABLE "public"."notification_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_queue" TO "service_role";



GRANT ALL ON TABLE "public"."qc_results" TO "anon";
GRANT ALL ON TABLE "public"."qc_results" TO "authenticated";
GRANT ALL ON TABLE "public"."qc_results" TO "service_role";



GRANT ALL ON TABLE "public"."qc_templates" TO "anon";
GRANT ALL ON TABLE "public"."qc_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."qc_templates" TO "service_role";



GRANT ALL ON TABLE "public"."quality_checkpoint_templates" TO "anon";
GRANT ALL ON TABLE "public"."quality_checkpoint_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."quality_checkpoint_templates" TO "service_role";



GRANT ALL ON TABLE "public"."quality_checkpoints" TO "anon";
GRANT ALL ON TABLE "public"."quality_checkpoints" TO "authenticated";
GRANT ALL ON TABLE "public"."quality_checkpoints" TO "service_role";



GRANT ALL ON TABLE "public"."quality_holds" TO "anon";
GRANT ALL ON TABLE "public"."quality_holds" TO "authenticated";
GRANT ALL ON TABLE "public"."quality_holds" TO "service_role";



GRANT ALL ON TABLE "public"."quality_patterns" TO "anon";
GRANT ALL ON TABLE "public"."quality_patterns" TO "authenticated";
GRANT ALL ON TABLE "public"."quality_patterns" TO "service_role";



GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";



GRANT ALL ON TABLE "public"."slack_configurations" TO "anon";
GRANT ALL ON TABLE "public"."slack_configurations" TO "authenticated";
GRANT ALL ON TABLE "public"."slack_configurations" TO "service_role";



GRANT ALL ON TABLE "public"."slack_messages" TO "anon";
GRANT ALL ON TABLE "public"."slack_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."slack_messages" TO "service_role";



GRANT ALL ON TABLE "public"."stage_durations" TO "anon";
GRANT ALL ON TABLE "public"."stage_durations" TO "authenticated";
GRANT ALL ON TABLE "public"."stage_durations" TO "service_role";



GRANT ALL ON TABLE "public"."time_logs" TO "anon";
GRANT ALL ON TABLE "public"."time_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."time_logs" TO "service_role";



GRANT ALL ON TABLE "public"."user_management_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."user_management_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."user_management_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."work_logs" TO "anon";
GRANT ALL ON TABLE "public"."work_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."work_logs" TO "service_role";



GRANT ALL ON TABLE "public"."worker_invitations" TO "anon";
GRANT ALL ON TABLE "public"."worker_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."worker_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."worker_productivity_metrics" TO "anon";
GRANT ALL ON TABLE "public"."worker_productivity_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."worker_productivity_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."worker_stage_assignments" TO "anon";
GRANT ALL ON TABLE "public"."worker_stage_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."worker_stage_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_daily_metrics" TO "anon";
GRANT ALL ON TABLE "public"."workflow_daily_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_daily_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_bottlenecks" TO "anon";
GRANT ALL ON TABLE "public"."workflow_bottlenecks" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_bottlenecks" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_execution_log" TO "anon";
GRANT ALL ON TABLE "public"."workflow_execution_log" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_execution_log" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_performance_metrics" TO "anon";
GRANT ALL ON TABLE "public"."workflow_performance_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_performance_metrics" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
