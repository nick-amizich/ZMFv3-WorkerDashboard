-- Consolidated migrations for ZMF Worker Dashboard
-- Generated on 2025-05-25T18:33:53.720Z

-- ========================================
-- Migration: 20250123_create_settings_table.sql
-- ========================================

-- Create settings table for storing application configuration
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    encrypted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES public.workers(id)
);

-- Add RLS policies
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Only managers can view settings
CREATE POLICY "Managers can view settings"
    ON public.settings
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.workers
            WHERE workers.auth_user_id = auth.uid()
            AND workers.role IN ('manager', 'supervisor')
            AND workers.is_active = true
        )
    );

-- Only managers can update settings
CREATE POLICY "Managers can update settings"
    ON public.settings
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.workers
            WHERE workers.auth_user_id = auth.uid()
            AND workers.role = 'manager'
            AND workers.is_active = true
        )
    );

-- Only managers can insert settings
CREATE POLICY "Managers can insert settings"
    ON public.settings
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workers
            WHERE workers.auth_user_id = auth.uid()
            AND workers.role = 'manager'
            AND workers.is_active = true
        )
    );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON public.settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default Shopify settings
INSERT INTO public.settings (key, value, encrypted)
VALUES (
    'shopify_config',
    jsonb_build_object(
        'store_domain', '',
        'api_version', '2024-01',
        'webhook_secret', '',
        'sync_enabled', false,
        'sync_interval_minutes', 15
    ),
    false
)
ON CONFLICT (key) DO NOTHING;

-- ========================================
-- Migration: 20250130_v2_workflow_system.sql
-- ========================================

-- V2.0 Workflow System Migration
-- Extends existing schema without breaking v1.0 functionality

BEGIN;

-- 1. UPDATE work_tasks table (add new columns for v2.0)
ALTER TABLE work_tasks 
ADD COLUMN IF NOT EXISTS batch_id UUID,
ADD COLUMN IF NOT EXISTS stage TEXT,
ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS depends_on_task_ids UUID[],
ADD COLUMN IF NOT EXISTS manual_assignment BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS workflow_template_id UUID;

-- Remove strict task_type constraint to allow custom stages
ALTER TABLE work_tasks DROP CONSTRAINT IF EXISTS work_tasks_task_type_check;
ALTER TABLE work_tasks ADD CONSTRAINT work_tasks_stage_or_type_check 
CHECK (task_type IS NOT NULL OR stage IS NOT NULL);

-- 2. Workflow Templates table (Replaces production_templates)
CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_rules JSONB NOT NULL DEFAULT '{"manual_only": true}',
  stages JSONB NOT NULL,
  stage_transitions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_by_id UUID REFERENCES workers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Work Batches table
CREATE TABLE IF NOT EXISTS work_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  batch_type TEXT CHECK (batch_type IN ('model', 'wood_type', 'custom')) NOT NULL,
  criteria JSONB NOT NULL,
  order_item_ids UUID[] NOT NULL,
  workflow_template_id UUID REFERENCES workflow_templates(id),
  current_stage TEXT,
  status TEXT CHECK (status IN ('pending', 'active', 'completed', 'on_hold')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enhanced time tracking (rename work_logs to time_logs)
CREATE TABLE IF NOT EXISTS time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES workers(id) NOT NULL,
  task_id UUID REFERENCES work_tasks(id),
  batch_id UUID REFERENCES work_batches(id),
  stage TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN end_time IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (end_time - start_time)) / 60
      ELSE NULL
    END
  ) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT either_task_or_batch CHECK (
    (task_id IS NOT NULL AND batch_id IS NULL) OR 
    (task_id IS NULL AND batch_id IS NOT NULL)
  )
);

-- 5. Stage Transitions table
CREATE TABLE IF NOT EXISTS stage_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES work_batches(id),
  order_item_id UUID REFERENCES order_items(id),
  workflow_template_id UUID REFERENCES workflow_templates(id),
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  transition_type TEXT CHECK (transition_type IN ('auto', 'manual', 'conditional')) DEFAULT 'manual',
  transitioned_by_id UUID REFERENCES workers(id),
  notes TEXT,
  transition_time TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT either_batch_or_item CHECK (
    (batch_id IS NOT NULL AND order_item_id IS NULL) OR 
    (batch_id IS NULL AND order_item_id IS NOT NULL)
  )
);

-- 6. Production Issues table
CREATE TABLE IF NOT EXISTS production_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_by_id UUID REFERENCES workers(id) NOT NULL,
  task_id UUID REFERENCES work_tasks(id),
  batch_id UUID REFERENCES work_batches(id),
  order_item_id UUID REFERENCES order_items(id),
  stage TEXT NOT NULL,
  issue_type TEXT CHECK (issue_type IN ('defect', 'material', 'tooling', 'process', 'other')) NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_urls TEXT[],
  slack_thread_id TEXT,
  resolution_status TEXT CHECK (resolution_status IN ('open', 'investigating', 'resolved', 'wont_fix')) DEFAULT 'open',
  resolved_by_id UUID REFERENCES workers(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- 7. Worker Stage Assignments table
CREATE TABLE IF NOT EXISTS worker_stage_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES workers(id) NOT NULL,
  stage TEXT NOT NULL,
  skill_level TEXT CHECK (skill_level IN ('trainee', 'competent', 'expert')) DEFAULT 'competent',
  is_active BOOLEAN DEFAULT true,
  assigned_by_id UUID REFERENCES workers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(worker_id, stage)
);

-- 8. Workflow Execution Log (Track workflow automation)
CREATE TABLE IF NOT EXISTS workflow_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_template_id UUID REFERENCES workflow_templates(id),
  batch_id UUID REFERENCES work_batches(id),
  order_item_id UUID REFERENCES order_items(id),
  stage TEXT NOT NULL,
  action TEXT NOT NULL, -- 'task_created', 'task_assigned', 'stage_completed', etc.
  action_details JSONB,
  executed_by_id UUID REFERENCES workers(id),
  execution_type TEXT CHECK (execution_type IN ('auto', 'manual')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Custom Stage Definitions (Allow managers to create custom stages)
CREATE TABLE IF NOT EXISTS custom_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_code TEXT UNIQUE NOT NULL,
  stage_name TEXT NOT NULL,
  description TEXT,
  default_estimated_hours DECIMAL(5,2),
  required_skills TEXT[],
  created_by_id UUID REFERENCES workers(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign keys for work_tasks
ALTER TABLE work_tasks ADD CONSTRAINT IF NOT EXISTS work_tasks_batch_id_fkey 
FOREIGN KEY (batch_id) REFERENCES work_batches(id);

ALTER TABLE work_tasks ADD CONSTRAINT IF NOT EXISTS work_tasks_workflow_template_id_fkey 
FOREIGN KEY (workflow_template_id) REFERENCES workflow_templates(id);

-- Migrate existing work_logs data to time_logs
INSERT INTO time_logs (worker_id, task_id, stage, start_time, end_time, notes, created_at)
SELECT 
  worker_id, 
  task_id, 
  COALESCE(wt.stage, wt.task_type) as stage,
  wl.created_at as start_time,
  CASE 
    WHEN wl.log_type = 'complete' THEN wl.created_at + INTERVAL '1 minute' * COALESCE(wl.time_spent_minutes, 0)
    ELSE NULL
  END as end_time,
  wl.notes,
  wl.created_at
FROM work_logs wl
JOIN work_tasks wt ON wt.id = wl.task_id
WHERE NOT EXISTS (SELECT 1 FROM time_logs tl WHERE tl.task_id = wl.task_id AND tl.worker_id = wl.worker_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_work_batches_status ON work_batches(status);
CREATE INDEX IF NOT EXISTS idx_work_batches_stage ON work_batches(current_stage);
CREATE INDEX IF NOT EXISTS idx_work_batches_workflow ON work_batches(workflow_template_id);
CREATE INDEX IF NOT EXISTS idx_stage_transitions_batch ON stage_transitions(batch_id);
CREATE INDEX IF NOT EXISTS idx_stage_transitions_time ON stage_transitions(transition_time);
CREATE INDEX IF NOT EXISTS idx_time_logs_worker_date ON time_logs(worker_id, start_time);
CREATE INDEX IF NOT EXISTS idx_production_issues_status ON production_issues(resolution_status);
CREATE INDEX IF NOT EXISTS idx_worker_stage_assignments ON worker_stage_assignments(worker_id, stage) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_work_tasks_batch ON work_tasks(batch_id);
CREATE INDEX IF NOT EXISTS idx_work_tasks_stage ON work_tasks(stage);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_log_batch ON workflow_execution_log(batch_id);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_log_time ON workflow_execution_log(created_at);

-- Enable RLS on new tables
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_stage_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_execution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_stages ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Workflow Templates: Viewable by all, editable by managers
CREATE POLICY "workflow_templates_view_all" ON workflow_templates
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "workflow_templates_modify_managers" ON workflow_templates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('manager', 'supervisor')
    )
  );

-- Work Batches: Viewable by all, editable by managers
CREATE POLICY "batches_view_all" ON work_batches
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "batches_modify_managers" ON work_batches
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('manager', 'supervisor')
    )
  );

-- Time Logs: Workers see own logs, managers see all
CREATE POLICY "time_logs_own" ON time_logs
  FOR ALL TO authenticated
  USING (
    worker_id IN (
      SELECT id FROM workers WHERE auth_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM workers 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('manager', 'supervisor')
    )
  );

-- Production Issues: All can view and create
CREATE POLICY "issues_view_all" ON production_issues
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "issues_create_all" ON production_issues
  FOR INSERT TO authenticated
  WITH CHECK (
    reported_by_id IN (
      SELECT id FROM workers WHERE auth_user_id = auth.uid()
    )
  );

-- Stage Transitions: All can view, workers can create for own tasks/batches
CREATE POLICY "transitions_view_all" ON stage_transitions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "transitions_create" ON stage_transitions
  FOR INSERT TO authenticated
  WITH CHECK (
    transitioned_by_id IN (
      SELECT id FROM workers WHERE auth_user_id = auth.uid()
    )
  );

-- Worker Stage Assignments: Workers see own, managers see all
CREATE POLICY "stage_assignments_view" ON worker_stage_assignments
  FOR SELECT TO authenticated
  USING (
    worker_id IN (
      SELECT id FROM workers WHERE auth_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM workers 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('manager', 'supervisor')
    )
  );

-- Custom Stages: Managers only
CREATE POLICY "custom_stages_managers" ON custom_stages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('manager', 'supervisor')
    )
  );

-- Workflow Execution Log: Viewable by managers
CREATE POLICY "workflow_log_managers" ON workflow_execution_log
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('manager', 'supervisor')
    )
  );

-- Insert default workflow template
INSERT INTO workflow_templates (name, description, stages, stage_transitions, is_default, is_active)
VALUES (
  'Standard Headphone Build',
  'Default workflow for standard headphone production',
  '[
    {"stage": "sanding", "name": "Sanding", "description": "Sand wood components", "estimated_hours": 2, "is_automated": true, "auto_assign_rule": "least_busy", "is_optional": false, "required_skills": ["sanding"]},
    {"stage": "finishing", "name": "UV Coating", "description": "Apply UV coating finish", "estimated_hours": 1.5, "is_automated": true, "auto_assign_rule": "least_busy", "is_optional": false, "required_skills": ["finishing"]},
    {"stage": "assembly", "name": "Assembly", "description": "Main headphone assembly", "estimated_hours": 3, "is_automated": false, "auto_assign_rule": "manual", "is_optional": false, "required_skills": ["assembly"]},
    {"stage": "initial_qc", "name": "Initial QC", "description": "Initial quality control inspection", "estimated_hours": 0.5, "is_automated": true, "auto_assign_rule": "round_robin", "is_optional": false, "required_skills": ["qc"]},
    {"stage": "acoustic_testing", "name": "Acoustic Testing", "description": "Test audio quality and calibration", "estimated_hours": 1, "is_automated": false, "auto_assign_rule": "manual", "is_optional": false, "required_skills": ["acoustic_testing"]},
    {"stage": "final_qc", "name": "Final QC", "description": "Final quality control and packaging prep", "estimated_hours": 0.5, "is_automated": true, "auto_assign_rule": "round_robin", "is_optional": false, "required_skills": ["qc"]},
    {"stage": "packaging", "name": "Packaging", "description": "Package for shipping", "estimated_hours": 0.5, "is_automated": true, "auto_assign_rule": "least_busy", "is_optional": false, "required_skills": ["packaging"]},
    {"stage": "shipping", "name": "Shipping", "description": "Prepare shipping labels and dispatch", "estimated_hours": 0.25, "is_automated": true, "auto_assign_rule": "least_busy", "is_optional": false, "required_skills": ["shipping"]}
  ]'::jsonb,
  '[
    {"from_stage": "sanding", "to_stage": ["finishing"], "auto_transition": true, "condition": "all_complete"},
    {"from_stage": "finishing", "to_stage": ["assembly"], "auto_transition": false, "condition": "manual_approval"},
    {"from_stage": "assembly", "to_stage": ["initial_qc"], "auto_transition": true, "condition": "all_complete"},
    {"from_stage": "initial_qc", "to_stage": ["acoustic_testing"], "auto_transition": false, "condition": "manual_approval"},
    {"from_stage": "acoustic_testing", "to_stage": ["final_qc"], "auto_transition": false, "condition": "manual_approval"},
    {"from_stage": "final_qc", "to_stage": ["packaging"], "auto_transition": true, "condition": "all_complete"},
    {"from_stage": "packaging", "to_stage": ["shipping"], "auto_transition": true, "condition": "all_complete"}
  ]'::jsonb,
  true,
  true
);

-- Create default worker stage assignments based on existing skills
INSERT INTO worker_stage_assignments (worker_id, stage, skill_level)
SELECT 
  id as worker_id,
  unnest(skills) as stage,
  'competent' as skill_level
FROM workers
WHERE is_active = true AND skills IS NOT NULL
ON CONFLICT (worker_id, stage) DO NOTHING;

COMMIT; 

-- ========================================
-- Migration: 20250130_v3_automation_rules.sql
-- ========================================

-- Automation Rules for v3.0
-- This migration adds automation rules engine tables

-- 1. Automation Rules table
CREATE TABLE automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_template_id UUID REFERENCES workflow_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT CHECK (trigger_type IN ('stage_complete', 'time_elapsed', 'manual', 'schedule', 'condition_met')) NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}',
  conditions JSONB NOT NULL DEFAULT '{}', -- {all: [], any: []}
  actions JSONB NOT NULL DEFAULT '[]', -- Array of action configurations
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- Higher number = higher priority
  created_by_id UUID REFERENCES workers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Automation Execution Log
CREATE TABLE automation_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES automation_rules(id) ON DELETE CASCADE,
  workflow_instance_id UUID, -- Could be batch_id or order_item_id
  trigger_data JSONB,
  conditions_evaluated JSONB,
  actions_executed JSONB,
  execution_status TEXT CHECK (execution_status IN ('success', 'failed', 'partial')) NOT NULL,
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Workflow Performance Metrics (for analytics)
CREATE TABLE workflow_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_template_id UUID REFERENCES workflow_templates(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  metric_date DATE NOT NULL,
  avg_completion_time_minutes DECIMAL(10,2),
  total_tasks_completed INTEGER DEFAULT 0,
  automation_success_rate DECIMAL(5,2),
  manual_intervention_count INTEGER DEFAULT 0,
  bottleneck_incidents INTEGER DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workflow_template_id, stage, metric_date)
);

-- Indexes for performance
CREATE INDEX idx_automation_rules_workflow ON automation_rules(workflow_template_id);
CREATE INDEX idx_automation_rules_active ON automation_rules(is_active);
CREATE INDEX idx_automation_execution_log_rule ON automation_execution_log(rule_id);
CREATE INDEX idx_automation_execution_log_executed ON automation_execution_log(executed_at DESC);
CREATE INDEX idx_workflow_performance_metrics_workflow ON workflow_performance_metrics(workflow_template_id, metric_date);

-- Enable RLS
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_execution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Automation rules: Only managers can create/edit
CREATE POLICY "automation_rules_manager_all" ON automation_rules
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE auth_user_id = (SELECT auth.uid()) 
      AND role IN ('manager', 'supervisor')
      AND is_active = true
    )
  );

-- Automation execution log: Managers can view all
CREATE POLICY "automation_execution_log_manager_read" ON automation_execution_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE auth_user_id = (SELECT auth.uid()) 
      AND role IN ('manager', 'supervisor')
      AND is_active = true
    )
  );

-- Workflow metrics: Managers can view all
CREATE POLICY "workflow_performance_metrics_manager_read" ON workflow_performance_metrics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE auth_user_id = (SELECT auth.uid()) 
      AND role IN ('manager', 'supervisor')
      AND is_active = true
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE automation_execution_log;

-- Function to calculate daily workflow metrics
CREATE OR REPLACE FUNCTION calculate_workflow_metrics(p_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day')
RETURNS void AS $$
BEGIN
  -- Calculate metrics for each workflow and stage
  INSERT INTO workflow_performance_metrics (
    workflow_template_id,
    stage,
    metric_date,
    avg_completion_time_minutes,
    total_tasks_completed,
    automation_success_rate,
    manual_intervention_count,
    bottleneck_incidents
  )
  SELECT 
    wt.workflow_template_id,
    wt.stage,
    p_date,
    AVG(EXTRACT(EPOCH FROM (wt.completed_at - wt.started_at)) / 60)::DECIMAL(10,2) as avg_completion_time,
    COUNT(CASE WHEN wt.status = 'completed' THEN 1 END) as total_completed,
    (COUNT(CASE WHEN wt.auto_generated = true THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0) * 100)::DECIMAL(5,2) as automation_rate,
    COUNT(CASE WHEN wt.manual_assignment = true THEN 1 END) as manual_count,
    COUNT(DISTINCT CASE 
      WHEN EXTRACT(EPOCH FROM (wt.started_at - wt.created_at)) / 60 > 120 THEN wt.id 
    END) as bottleneck_count
  FROM work_tasks wt
  WHERE DATE(wt.created_at) = p_date
    AND wt.workflow_template_id IS NOT NULL
    AND wt.stage IS NOT NULL
  GROUP BY wt.workflow_template_id, wt.stage
  ON CONFLICT (workflow_template_id, stage, metric_date) 
  DO UPDATE SET
    avg_completion_time_minutes = EXCLUDED.avg_completion_time_minutes,
    total_tasks_completed = EXCLUDED.total_tasks_completed,
    automation_success_rate = EXCLUDED.automation_success_rate,
    manual_intervention_count = EXCLUDED.manual_intervention_count,
    bottleneck_incidents = EXCLUDED.bottleneck_incidents,
    calculated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Sample automation rules for default workflow
INSERT INTO automation_rules (
  workflow_template_id,
  name,
  description,
  trigger_type,
  trigger_config,
  conditions,
  actions,
  priority
)
SELECT 
  id,
  'Auto-assign high priority tasks',
  'Automatically assign high priority tasks to least busy worker',
  'stage_complete',
  '{"stage": "any"}'::jsonb,
  '{
    "any": [
      {"type": "task_priority", "operator": "equals", "value": "high"},
      {"type": "task_priority", "operator": "equals", "value": "urgent"}
    ]
  }'::jsonb,
  '[
    {
      "type": "assign_tasks",
      "config": {
        "assignment_rule": "least_busy",
        "notify": true
      }
    }
  ]'::jsonb,
  100
FROM workflow_templates
WHERE is_default = true
LIMIT 1;

-- Add another sample rule
INSERT INTO automation_rules (
  workflow_template_id,
  name,
  description,
  trigger_type,
  trigger_config,
  conditions,
  actions,
  priority
)
SELECT 
  id,
  'Bottleneck alert',
  'Alert managers when tasks wait more than 2 hours',
  'time_elapsed',
  '{"elapsed_minutes": 120}'::jsonb,
  '{
    "all": [
      {"type": "task_status", "operator": "equals", "value": "assigned"}
    ]
  }'::jsonb,
  '[
    {
      "type": "notify",
      "config": {
        "channel": "managers",
        "message_template": "Task {{task_id}} has been waiting for {{wait_time}} at stage {{stage}}"
      }
    }
  ]'::jsonb,
  90
FROM workflow_templates
WHERE is_default = true
LIMIT 1;

-- ========================================
-- Migration: 20250131_v3_quality_system.sql
-- ========================================

-- V3 Quality System: Component Tracking and Quality Intelligence
-- This migration adds comprehensive quality control features on top of the V2 workflow system

-- Component tracking table for individual headphone components
CREATE TABLE component_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cup_pair_id UUID NOT NULL UNIQUE, -- Unique ID for L/R pair
    left_cup_serial TEXT UNIQUE NOT NULL,
    right_cup_serial TEXT UNIQUE NOT NULL,
    wood_batch_id UUID,
    grade TEXT CHECK (grade IN ('A', 'B')) NOT NULL,
    source_tracking JSONB DEFAULT '{}', -- supplier, receipt_date, moisture_content, grain_photos
    specifications JSONB NOT NULL, -- model, wood_type, finish_type, customer_order_id, custom_requirements
    journey JSONB DEFAULT '[]', -- Array of stage history with timestamps, workers, checks
    final_metrics JSONB DEFAULT '{}', -- total_production_hours, rework_count, quality_score
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quality checkpoints configuration for each workflow stage
CREATE TABLE quality_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_template_id UUID REFERENCES workflow_templates(id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    checkpoint_type TEXT CHECK (checkpoint_type IN ('pre_work', 'in_process', 'post_work', 'gate')) NOT NULL,
    severity TEXT CHECK (severity IN ('critical', 'major', 'minor')) NOT NULL DEFAULT 'major',
    checks JSONB NOT NULL, -- Array of {id, description, requires_photo, requires_measurement, acceptance_criteria, common_failures}
    on_failure TEXT CHECK (on_failure IN ('block_progress', 'warn_continue', 'log_only')) NOT NULL DEFAULT 'block_progress',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workflow_template_id, stage, checkpoint_type)
);

-- Enhanced inspection results with root cause analysis
CREATE TABLE inspection_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES work_tasks(id) ON DELETE CASCADE,
    checkpoint_id UUID REFERENCES quality_checkpoints(id),
    component_tracking_id UUID REFERENCES component_tracking(id),
    worker_id UUID REFERENCES workers(id) NOT NULL,
    passed BOOLEAN NOT NULL,
    failed_checks TEXT[], -- Array of check IDs that failed
    root_cause TEXT, -- Why did it fail?
    corrective_action TEXT, -- What was done to fix it?
    prevention_suggestion TEXT, -- How to prevent in the future
    time_to_resolve INTEGER, -- Minutes taken to fix the issue
    notes TEXT,
    photo_urls TEXT[], -- Array of photo URLs for evidence
    measurement_data JSONB, -- For acoustic tests, dimensional measurements
    inspected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quality patterns learning system
CREATE TABLE quality_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage TEXT NOT NULL,
    issue_type TEXT NOT NULL,
    occurrence_count INTEGER DEFAULT 1,
    common_causes TEXT[],
    effective_solutions TEXT[],
    prevention_tips TEXT[],
    affected_models TEXT[], -- Which headphone models see this issue
    affected_materials TEXT[], -- Which wood types/materials see this issue
    severity_trend TEXT CHECK (severity_trend IN ('increasing', 'stable', 'decreasing')),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stage, issue_type)
);

-- Quality hold management for batches with issues
CREATE TABLE quality_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES work_batches(id) ON DELETE CASCADE,
    component_tracking_id UUID REFERENCES component_tracking(id),
    hold_reason TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('critical', 'major', 'minor')) NOT NULL,
    reported_by UUID REFERENCES workers(id) NOT NULL,
    assigned_to UUID REFERENCES workers(id),
    status TEXT CHECK (status IN ('active', 'investigating', 'resolved', 'escalated')) NOT NULL DEFAULT 'active',
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    escalated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-populated quality checkpoint templates for common stages
CREATE TABLE quality_checkpoint_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_name TEXT NOT NULL,
    checkpoint_type TEXT CHECK (checkpoint_type IN ('pre_work', 'in_process', 'post_work', 'gate')) NOT NULL,
    template_name TEXT NOT NULL,
    checks JSONB NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stage_name, checkpoint_type, template_name)
);

-- Add quality-related fields to existing tables
ALTER TABLE work_tasks 
ADD COLUMN IF NOT EXISTS component_tracking_id UUID REFERENCES component_tracking(id),
ADD COLUMN IF NOT EXISTS quality_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS rework_count INTEGER DEFAULT 0;

ALTER TABLE work_batches
ADD COLUMN IF NOT EXISTS quality_hold_id UUID REFERENCES quality_holds(id),
ADD COLUMN IF NOT EXISTS first_pass_yield DECIMAL(5,2);

-- Indexes for performance
CREATE INDEX idx_component_tracking_cup_pair ON component_tracking(cup_pair_id);
CREATE INDEX idx_component_tracking_grade ON component_tracking(grade);
CREATE INDEX idx_component_tracking_wood_batch ON component_tracking(wood_batch_id);
CREATE INDEX idx_quality_checkpoints_workflow ON quality_checkpoints(workflow_template_id);
CREATE INDEX idx_quality_checkpoints_stage ON quality_checkpoints(stage);
CREATE INDEX idx_inspection_results_task ON inspection_results(task_id);
CREATE INDEX idx_inspection_results_component ON inspection_results(component_tracking_id);
CREATE INDEX idx_inspection_results_passed ON inspection_results(passed);
CREATE INDEX idx_quality_patterns_stage ON quality_patterns(stage);
CREATE INDEX idx_quality_patterns_issue ON quality_patterns(issue_type);
CREATE INDEX idx_quality_holds_batch ON quality_holds(batch_id);
CREATE INDEX idx_quality_holds_status ON quality_holds(status);

-- Row Level Security (RLS) policies
ALTER TABLE component_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_checkpoint_templates ENABLE ROW LEVEL SECURITY;

-- Component tracking: workers can view all, managers can modify
CREATE POLICY "Workers can view component tracking" ON component_tracking
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.auth_user_id = auth.uid() 
            AND e.active = true
        )
    );

CREATE POLICY "Managers can modify component tracking" ON component_tracking
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.auth_user_id = auth.uid() 
            AND e.role IN ('manager', 'supervisor')
            AND e.active = true
        )
    );

-- Quality checkpoints: all authenticated users can view
CREATE POLICY "All employees can view quality checkpoints" ON quality_checkpoints
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.auth_user_id = auth.uid() 
            AND e.active = true
        )
    );

CREATE POLICY "Managers can modify quality checkpoints" ON quality_checkpoints
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.auth_user_id = auth.uid() 
            AND e.role = 'manager'
            AND e.active = true
        )
    );

-- Inspection results: workers can create their own, view all
CREATE POLICY "Workers can create inspection results" ON inspection_results
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.auth_user_id = auth.uid() 
            AND e.id = worker_id
            AND e.active = true
        )
    );

CREATE POLICY "All employees can view inspection results" ON inspection_results
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.auth_user_id = auth.uid() 
            AND e.active = true
        )
    );

-- Quality patterns: all can view, managers can modify
CREATE POLICY "All employees can view quality patterns" ON quality_patterns
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.auth_user_id = auth.uid() 
            AND e.active = true
        )
    );

CREATE POLICY "Managers can modify quality patterns" ON quality_patterns
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.auth_user_id = auth.uid() 
            AND e.role = 'manager'
            AND e.active = true
        )
    );

-- Quality holds: workers can create, managers can modify all
CREATE POLICY "Workers can create quality holds" ON quality_holds
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.auth_user_id = auth.uid() 
            AND e.id = reported_by
            AND e.active = true
        )
    );

CREATE POLICY "All employees can view quality holds" ON quality_holds
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.auth_user_id = auth.uid() 
            AND e.active = true
        )
    );

CREATE POLICY "Managers can modify quality holds" ON quality_holds
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.auth_user_id = auth.uid() 
            AND e.role IN ('manager', 'supervisor')
            AND e.active = true
        )
    );

-- Quality checkpoint templates: all can view
CREATE POLICY "All employees can view checkpoint templates" ON quality_checkpoint_templates
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.auth_user_id = auth.uid() 
            AND e.active = true
        )
    );

CREATE POLICY "Managers can modify checkpoint templates" ON quality_checkpoint_templates
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.auth_user_id = auth.uid() 
            AND e.role = 'manager'
            AND e.active = true
        )
    );

-- Insert default quality checkpoint templates based on common ZMF production stages
INSERT INTO quality_checkpoint_templates (stage_name, checkpoint_type, template_name, checks, is_default) VALUES
-- Sanding pre-work checks
('sanding', 'pre_work', 'Standard Sanding Pre-Check', 
 '[{"id": "sand-pre-1", "description": "Verify cup grade matches work order", "requires_photo": false, "requires_measurement": false, "acceptance_criteria": "Grade stamp clearly visible and matches", "common_failures": ["Wrong grade selected", "Grade stamp unclear"]},
   {"id": "sand-pre-2", "description": "Check L/R pairs are matched", "requires_photo": true, "requires_measurement": false, "acceptance_criteria": "Wood grain patterns complement each other", "common_failures": ["Mismatched grain", "Color variation too high"]},
   {"id": "sand-pre-3", "description": "Inspect for existing defects", "requires_photo": true, "requires_measurement": false, "acceptance_criteria": "No cracks, voids, or damage", "common_failures": ["Hairline cracks missed", "Internal voids"]}]', 
 true),

-- Sanding post-work checks
('sanding', 'post_work', 'Standard Sanding Post-Check',
 '[{"id": "sand-post-1", "description": "Surface smoothness check", "requires_photo": false, "requires_measurement": false, "acceptance_criteria": "No roughness felt when running hand across surface", "common_failures": ["Missed spots", "Uneven sanding"]},
   {"id": "sand-post-2", "description": "Grille fit test", "requires_photo": true, "requires_measurement": false, "acceptance_criteria": "Grille sits flush without forcing", "common_failures": ["Over-sanded opening", "Tight fit"]},
   {"id": "sand-post-3", "description": "Final dimension check", "requires_photo": false, "requires_measurement": true, "acceptance_criteria": "Within 0.5mm of spec", "common_failures": ["Over-sanded thickness", "Uneven removal"]}]',
 true),

-- Finishing pre-work checks
('finishing', 'pre_work', 'Standard Finishing Pre-Check',
 '[{"id": "fin-pre-1", "description": "Surface preparation verified", "requires_photo": false, "requires_measurement": false, "acceptance_criteria": "Surface clean and dust-free", "common_failures": ["Dust particles", "Oil contamination"]},
   {"id": "fin-pre-2", "description": "Spray booth ready", "requires_photo": false, "requires_measurement": false, "acceptance_criteria": "Booth clean, filters checked", "common_failures": ["Dirty filters", "Overspray buildup"]},
   {"id": "fin-pre-3", "description": "Material temperature check", "requires_photo": false, "requires_measurement": true, "acceptance_criteria": "Room temp 65-75°F", "common_failures": ["Too cold", "Too humid"]}]',
 true),

-- Finishing post-work checks  
('finishing', 'post_work', 'Standard Finishing Post-Check',
 '[{"id": "fin-post-1", "description": "No niblets or imperfections", "requires_photo": true, "requires_measurement": false, "acceptance_criteria": "Surface completely smooth", "common_failures": ["Dust niblets", "Orange peel", "Runs"]},
   {"id": "fin-post-2", "description": "Even coverage check", "requires_photo": true, "requires_measurement": false, "acceptance_criteria": "Consistent sheen across surface", "common_failures": ["Thin spots", "Overlap marks"]},
   {"id": "fin-post-3", "description": "Cure state verification", "requires_photo": false, "requires_measurement": false, "acceptance_criteria": "Tack-free to touch", "common_failures": ["Under-cured", "Fingerprints"]}]',
 true),

-- Assembly critical gate check
('assembly', 'gate', 'Final Assembly Gate',
 '[{"id": "asm-gate-1", "description": "Gimbal tension test", "requires_photo": false, "requires_measurement": true, "acceptance_criteria": "3-5 lbs force to rotate", "common_failures": ["Too loose", "Too tight", "Uneven L/R"]},
   {"id": "asm-gate-2", "description": "Driver alignment check", "requires_photo": true, "requires_measurement": false, "acceptance_criteria": "Drivers centered in cups", "common_failures": ["Off-center", "Tilted"]},
   {"id": "asm-gate-3", "description": "Cable routing verification", "requires_photo": true, "requires_measurement": false, "acceptance_criteria": "No strain on connections", "common_failures": ["Pinched wire", "Strain relief missing"]}]',
 true),

-- Final QC gate
('quality_control', 'gate', 'Final Quality Gate',
 '[{"id": "qc-gate-1", "description": "Full visual inspection", "requires_photo": true, "requires_measurement": false, "acceptance_criteria": "No visible defects from 12 inches", "common_failures": ["Minor scratches", "Fingerprints"]},
   {"id": "qc-gate-2", "description": "Acoustic test", "requires_photo": false, "requires_measurement": true, "acceptance_criteria": "Within 3dB of reference", "common_failures": ["Driver mismatch", "Air leak"]},
   {"id": "qc-gate-3", "description": "Serial number verification", "requires_photo": true, "requires_measurement": false, "acceptance_criteria": "Numbers match order and are legible", "common_failures": ["Wrong serial", "Poor engraving"]}]',
 true);

-- Insert common quality patterns based on historical data
INSERT INTO quality_patterns (stage, issue_type, occurrence_count, common_causes, effective_solutions, prevention_tips, affected_models, affected_materials) VALUES
('finishing', 'niblets', 1, 
 ARRAY['Dirty spray booth filters', 'Dust in environment', 'Contaminated finish'],
 ARRAY['Clean booth thoroughly', 'Replace filters', 'Filter finish before use'],
 ARRAY['Check filters before each session', 'Use tack cloth between coats', 'Control room air flow'],
 ARRAY['HD650', 'Atticus', 'Eikon'],
 ARRAY['walnut', 'cherry']),

('assembly', 'gimbal_tension', 1,
 ARRAY['Over-tightening', 'Incorrect spacer', 'Worn tools'],
 ARRAY['Use torque wrench', 'Verify spacer thickness', 'Replace worn bits'],
 ARRAY['Follow torque spec exactly', 'Check tool calibration weekly', 'Use fresh threadlocker'],
 ARRAY['Verite', 'Auteur'],
 NULL),

('sanding', 'grille_fit', 1,
 ARRAY['Over-sanding', 'Wrong grit sequence', 'Rushing'],
 ARRAY['Test fit frequently', 'Follow grit progression', 'Take breaks'],
 ARRAY['Mark depth limits', 'Use go/no-go gauge', 'Sand in stages'],
 ARRAY['HD800', 'Aeolus'],
 ARRAY['zebrawood', 'ebony']);

-- Function to generate unique serial numbers
CREATE OR REPLACE FUNCTION generate_serial_number(model TEXT, year INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER)
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

-- Function to update quality pattern statistics
CREATE OR REPLACE FUNCTION update_quality_pattern_stats()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger to update quality patterns on new inspection results
CREATE TRIGGER update_quality_patterns_on_inspection
AFTER INSERT ON inspection_results
FOR EACH ROW
EXECUTE FUNCTION update_quality_pattern_stats();

-- Function to calculate first pass yield for a batch
CREATE OR REPLACE FUNCTION calculate_first_pass_yield(batch_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    total_inspections INTEGER;
    passed_inspections INTEGER;
    yield DECIMAL;
BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE passed = true)
    INTO total_inspections, passed_inspections
    FROM inspection_results ir
    JOIN work_tasks wt ON ir.task_id = wt.id
    WHERE wt.batch_id = calculate_first_pass_yield.batch_id;
    
    IF total_inspections = 0 THEN
        RETURN NULL;
    END IF;
    
    yield := (passed_inspections::DECIMAL / total_inspections::DECIMAL) * 100;
    
    -- Update the batch record
    UPDATE work_batches
    SET first_pass_yield = yield
    WHERE id = calculate_first_pass_yield.batch_id;
    
    RETURN yield;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger for new tables
CREATE TRIGGER update_component_tracking_updated_at BEFORE UPDATE ON component_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quality_checkpoints_updated_at BEFORE UPDATE ON quality_checkpoints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quality_patterns_updated_at BEFORE UPDATE ON quality_patterns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quality_holds_updated_at BEFORE UPDATE ON quality_holds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Migration: 20250131_v3_quality_system_corrected.sql
-- ========================================

-- V3 Quality System: Component Tracking and Quality Intelligence
-- This migration adds comprehensive quality control features on top of the V2 workflow system
-- CORRECTED VERSION: Uses 'workers' table instead of 'employees'

-- Component tracking table for individual headphone components
CREATE TABLE component_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cup_pair_id UUID NOT NULL UNIQUE, -- Unique ID for L/R pair
    left_cup_serial TEXT UNIQUE NOT NULL,
    right_cup_serial TEXT UNIQUE NOT NULL,
    wood_batch_id UUID,
    grade TEXT CHECK (grade IN ('A', 'B')) NOT NULL,
    source_tracking JSONB DEFAULT '{}', -- supplier, receipt_date, moisture_content, grain_photos
    specifications JSONB NOT NULL, -- model, wood_type, finish_type, customer_order_id, custom_requirements
    journey JSONB DEFAULT '[]', -- Array of stage history with timestamps, workers, checks
    final_metrics JSONB DEFAULT '{}', -- total_production_hours, rework_count, quality_score
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quality checkpoints configuration for each workflow stage
CREATE TABLE quality_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_template_id UUID REFERENCES workflow_templates(id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    checkpoint_type TEXT CHECK (checkpoint_type IN ('pre_work', 'in_process', 'post_work', 'gate')) NOT NULL,
    severity TEXT CHECK (severity IN ('critical', 'major', 'minor')) NOT NULL DEFAULT 'major',
    checks JSONB NOT NULL, -- Array of {id, description, requires_photo, requires_measurement, acceptance_criteria, common_failures}
    on_failure TEXT CHECK (on_failure IN ('block_progress', 'warn_continue', 'log_only')) NOT NULL DEFAULT 'block_progress',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workflow_template_id, stage, checkpoint_type)
);

-- Enhanced inspection results with root cause analysis
CREATE TABLE inspection_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES work_tasks(id) ON DELETE CASCADE,
    checkpoint_id UUID REFERENCES quality_checkpoints(id),
    component_tracking_id UUID REFERENCES component_tracking(id),
    worker_id UUID REFERENCES workers(id) NOT NULL,
    passed BOOLEAN NOT NULL,
    failed_checks TEXT[], -- Array of check IDs that failed
    root_cause TEXT, -- Why did it fail?
    corrective_action TEXT, -- What was done to fix it?
    prevention_suggestion TEXT, -- How to prevent in the future
    time_to_resolve INTEGER, -- Minutes taken to fix the issue
    notes TEXT,
    photo_urls TEXT[], -- Array of photo URLs for evidence
    measurement_data JSONB, -- For acoustic tests, dimensional measurements
    inspected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quality patterns learning system
CREATE TABLE quality_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage TEXT NOT NULL,
    issue_type TEXT NOT NULL,
    occurrence_count INTEGER DEFAULT 1,
    common_causes TEXT[],
    effective_solutions TEXT[],
    prevention_tips TEXT[],
    affected_models TEXT[], -- Which headphone models see this issue
    affected_materials TEXT[], -- Which wood types/materials see this issue
    severity_trend TEXT CHECK (severity_trend IN ('increasing', 'stable', 'decreasing')),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stage, issue_type)
);

-- Quality hold management for batches with issues
CREATE TABLE quality_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES work_batches(id) ON DELETE CASCADE,
    component_tracking_id UUID REFERENCES component_tracking(id),
    hold_reason TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('critical', 'major', 'minor')) NOT NULL,
    reported_by UUID REFERENCES workers(id) NOT NULL,
    assigned_to UUID REFERENCES workers(id),
    status TEXT CHECK (status IN ('active', 'investigating', 'resolved', 'escalated')) NOT NULL DEFAULT 'active',
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    escalated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-populated quality checkpoint templates for common stages
CREATE TABLE quality_checkpoint_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_name TEXT NOT NULL,
    checkpoint_type TEXT CHECK (checkpoint_type IN ('pre_work', 'in_process', 'post_work', 'gate')) NOT NULL,
    template_name TEXT NOT NULL,
    checks JSONB NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stage_name, checkpoint_type, template_name)
);

-- Add quality-related fields to existing tables
ALTER TABLE work_tasks 
ADD COLUMN IF NOT EXISTS component_tracking_id UUID REFERENCES component_tracking(id),
ADD COLUMN IF NOT EXISTS quality_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS rework_count INTEGER DEFAULT 0;

ALTER TABLE work_batches
ADD COLUMN IF NOT EXISTS quality_hold_id UUID REFERENCES quality_holds(id),
ADD COLUMN IF NOT EXISTS first_pass_yield DECIMAL(5,2);

-- Indexes for performance
CREATE INDEX idx_component_tracking_cup_pair ON component_tracking(cup_pair_id);
CREATE INDEX idx_component_tracking_grade ON component_tracking(grade);
CREATE INDEX idx_component_tracking_wood_batch ON component_tracking(wood_batch_id);
CREATE INDEX idx_quality_checkpoints_workflow ON quality_checkpoints(workflow_template_id);
CREATE INDEX idx_quality_checkpoints_stage ON quality_checkpoints(stage);
CREATE INDEX idx_inspection_results_task ON inspection_results(task_id);
CREATE INDEX idx_inspection_results_component ON inspection_results(component_tracking_id);
CREATE INDEX idx_inspection_results_passed ON inspection_results(passed);
CREATE INDEX idx_quality_patterns_stage ON quality_patterns(stage);
CREATE INDEX idx_quality_patterns_issue ON quality_patterns(issue_type);
CREATE INDEX idx_quality_holds_batch ON quality_holds(batch_id);
CREATE INDEX idx_quality_holds_status ON quality_holds(status);

-- Row Level Security (RLS) policies
ALTER TABLE component_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_checkpoint_templates ENABLE ROW LEVEL SECURITY;

-- Component tracking: workers can view all, managers can modify
CREATE POLICY "Workers can view component tracking" ON component_tracking
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workers w 
            WHERE w.auth_user_id = auth.uid() 
            AND w.is_active = true
        )
    );

CREATE POLICY "Managers can modify component tracking" ON component_tracking
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workers w 
            WHERE w.auth_user_id = auth.uid() 
            AND w.role IN ('manager', 'supervisor')
            AND w.is_active = true
        )
    );

-- Quality checkpoints: all authenticated users can view
CREATE POLICY "All workers can view quality checkpoints" ON quality_checkpoints
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workers w 
            WHERE w.auth_user_id = auth.uid() 
            AND w.is_active = true
        )
    );

CREATE POLICY "Managers can modify quality checkpoints" ON quality_checkpoints
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workers w 
            WHERE w.auth_user_id = auth.uid() 
            AND w.role = 'manager'
            AND w.is_active = true
        )
    );

-- Inspection results: workers can create their own, view all
CREATE POLICY "Workers can create inspection results" ON inspection_results
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workers w 
            WHERE w.auth_user_id = auth.uid() 
            AND w.id = worker_id
            AND w.is_active = true
        )
    );

CREATE POLICY "All workers can view inspection results" ON inspection_results
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workers w 
            WHERE w.auth_user_id = auth.uid() 
            AND w.is_active = true
        )
    );

-- Quality patterns: all can view, managers can modify
CREATE POLICY "All workers can view quality patterns" ON quality_patterns
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workers w 
            WHERE w.auth_user_id = auth.uid() 
            AND w.is_active = true
        )
    );

CREATE POLICY "Managers can modify quality patterns" ON quality_patterns
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workers w 
            WHERE w.auth_user_id = auth.uid() 
            AND w.role = 'manager'
            AND w.is_active = true
        )
    );

-- Quality holds: workers can create, managers can modify all
CREATE POLICY "Workers can create quality holds" ON quality_holds
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workers w 
            WHERE w.auth_user_id = auth.uid() 
            AND w.id = reported_by
            AND w.is_active = true
        )
    );

CREATE POLICY "All workers can view quality holds" ON quality_holds
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workers w 
            WHERE w.auth_user_id = auth.uid() 
            AND w.is_active = true
        )
    );

CREATE POLICY "Managers can modify quality holds" ON quality_holds
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workers w 
            WHERE w.auth_user_id = auth.uid() 
            AND w.role IN ('manager', 'supervisor')
            AND w.is_active = true
        )
    );

-- Quality checkpoint templates: all can view
CREATE POLICY "All workers can view checkpoint templates" ON quality_checkpoint_templates
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workers w 
            WHERE w.auth_user_id = auth.uid() 
            AND w.is_active = true
        )
    );

CREATE POLICY "Managers can modify checkpoint templates" ON quality_checkpoint_templates
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workers w 
            WHERE w.auth_user_id = auth.uid() 
            AND w.role = 'manager'
            AND w.is_active = true
        )
    );

-- Insert default quality checkpoint templates based on common ZMF production stages
INSERT INTO quality_checkpoint_templates (stage_name, checkpoint_type, template_name, checks, is_default) VALUES
-- Sanding pre-work checks
('sanding', 'pre_work', 'Standard Sanding Pre-Check', 
 '[{"id": "sand-pre-1", "description": "Verify cup grade matches work order", "requires_photo": false, "requires_measurement": false, "acceptance_criteria": "Grade stamp clearly visible and matches", "common_failures": ["Wrong grade selected", "Grade stamp unclear"]},
   {"id": "sand-pre-2", "description": "Check L/R pairs are matched", "requires_photo": true, "requires_measurement": false, "acceptance_criteria": "Wood grain patterns complement each other", "common_failures": ["Mismatched grain", "Color variation too high"]},
   {"id": "sand-pre-3", "description": "Inspect for existing defects", "requires_photo": true, "requires_measurement": false, "acceptance_criteria": "No cracks, voids, or damage", "common_failures": ["Hairline cracks missed", "Internal voids"]}]', 
 true),

-- Sanding post-work checks
('sanding', 'post_work', 'Standard Sanding Post-Check',
 '[{"id": "sand-post-1", "description": "Surface smoothness check", "requires_photo": false, "requires_measurement": false, "acceptance_criteria": "No roughness felt when running hand across surface", "common_failures": ["Missed spots", "Uneven sanding"]},
   {"id": "sand-post-2", "description": "Grille fit test", "requires_photo": true, "requires_measurement": false, "acceptance_criteria": "Grille sits flush without forcing", "common_failures": ["Over-sanded opening", "Tight fit"]},
   {"id": "sand-post-3", "description": "Final dimension check", "requires_photo": false, "requires_measurement": true, "acceptance_criteria": "Within 0.5mm of spec", "common_failures": ["Over-sanded thickness", "Uneven removal"]}]',
 true),

-- Finishing pre-work checks
('finishing', 'pre_work', 'Standard Finishing Pre-Check',
 '[{"id": "fin-pre-1", "description": "Surface preparation verified", "requires_photo": false, "requires_measurement": false, "acceptance_criteria": "Surface clean and dust-free", "common_failures": ["Dust particles", "Oil contamination"]},
   {"id": "fin-pre-2", "description": "Spray booth ready", "requires_photo": false, "requires_measurement": false, "acceptance_criteria": "Booth clean, filters checked", "common_failures": ["Dirty filters", "Overspray buildup"]},
   {"id": "fin-pre-3", "description": "Material temperature check", "requires_photo": false, "requires_measurement": true, "acceptance_criteria": "Room temp 65-75°F", "common_failures": ["Too cold", "Too humid"]}]',
 true),

-- Finishing post-work checks  
('finishing', 'post_work', 'Standard Finishing Post-Check',
 '[{"id": "fin-post-1", "description": "No niblets or imperfections", "requires_photo": true, "requires_measurement": false, "acceptance_criteria": "Surface completely smooth", "common_failures": ["Dust niblets", "Orange peel", "Runs"]},
   {"id": "fin-post-2", "description": "Even coverage check", "requires_photo": true, "requires_measurement": false, "acceptance_criteria": "Consistent sheen across surface", "common_failures": ["Thin spots", "Overlap marks"]},
   {"id": "fin-post-3", "description": "Cure state verification", "requires_photo": false, "requires_measurement": false, "acceptance_criteria": "Tack-free to touch", "common_failures": ["Under-cured", "Fingerprints"]}]',
 true),

-- Assembly critical gate check
('assembly', 'gate', 'Final Assembly Gate',
 '[{"id": "asm-gate-1", "description": "Gimbal tension test", "requires_photo": false, "requires_measurement": true, "acceptance_criteria": "3-5 lbs force to rotate", "common_failures": ["Too loose", "Too tight", "Uneven L/R"]},
   {"id": "asm-gate-2", "description": "Driver alignment check", "requires_photo": true, "requires_measurement": false, "acceptance_criteria": "Drivers centered in cups", "common_failures": ["Off-center", "Tilted"]},
   {"id": "asm-gate-3", "description": "Cable routing verification", "requires_photo": true, "requires_measurement": false, "acceptance_criteria": "No strain on connections", "common_failures": ["Pinched wire", "Strain relief missing"]}]',
 true),

-- Final QC gate
('quality_control', 'gate', 'Final Quality Gate',
 '[{"id": "qc-gate-1", "description": "Full visual inspection", "requires_photo": true, "requires_measurement": false, "acceptance_criteria": "No visible defects from 12 inches", "common_failures": ["Minor scratches", "Fingerprints"]},
   {"id": "qc-gate-2", "description": "Acoustic test", "requires_photo": false, "requires_measurement": true, "acceptance_criteria": "Within 3dB of reference", "common_failures": ["Driver mismatch", "Air leak"]},
   {"id": "qc-gate-3", "description": "Serial number verification", "requires_photo": true, "requires_measurement": false, "acceptance_criteria": "Numbers match order and are legible", "common_failures": ["Wrong serial", "Poor engraving"]}]',
 true);

-- Insert common quality patterns based on historical data
INSERT INTO quality_patterns (stage, issue_type, occurrence_count, common_causes, effective_solutions, prevention_tips, affected_models, affected_materials) VALUES
('finishing', 'niblets', 1, 
 ARRAY['Dirty spray booth filters', 'Dust in environment', 'Contaminated finish'],
 ARRAY['Clean booth thoroughly', 'Replace filters', 'Filter finish before use'],
 ARRAY['Check filters before each session', 'Use tack cloth between coats', 'Control room air flow'],
 ARRAY['HD650', 'Atticus', 'Eikon'],
 ARRAY['walnut', 'cherry']),

('assembly', 'gimbal_tension', 1,
 ARRAY['Over-tightening', 'Incorrect spacer', 'Worn tools'],
 ARRAY['Use torque wrench', 'Verify spacer thickness', 'Replace worn bits'],
 ARRAY['Follow torque spec exactly', 'Check tool calibration weekly', 'Use fresh threadlocker'],
 ARRAY['Verite', 'Auteur'],
 NULL),

('sanding', 'grille_fit', 1,
 ARRAY['Over-sanding', 'Wrong grit sequence', 'Rushing'],
 ARRAY['Test fit frequently', 'Follow grit progression', 'Take breaks'],
 ARRAY['Mark depth limits', 'Use go/no-go gauge', 'Sand in stages'],
 ARRAY['HD800', 'Aeolus'],
 ARRAY['zebrawood', 'ebony']);

-- Function to generate unique serial numbers
CREATE OR REPLACE FUNCTION generate_serial_number(model TEXT, year INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER)
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

-- Function to update quality pattern statistics
CREATE OR REPLACE FUNCTION update_quality_pattern_stats()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger to update quality patterns on new inspection results
CREATE TRIGGER update_quality_patterns_on_inspection
AFTER INSERT ON inspection_results
FOR EACH ROW
EXECUTE FUNCTION update_quality_pattern_stats();

-- Function to calculate first pass yield for a batch
CREATE OR REPLACE FUNCTION calculate_first_pass_yield(batch_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    total_inspections INTEGER;
    passed_inspections INTEGER;
    yield DECIMAL;
BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE passed = true)
    INTO total_inspections, passed_inspections
    FROM inspection_results ir
    JOIN work_tasks wt ON ir.task_id = wt.id
    WHERE wt.batch_id = calculate_first_pass_yield.batch_id;
    
    IF total_inspections = 0 THEN
        RETURN NULL;
    END IF;
    
    yield := (passed_inspections::DECIMAL / total_inspections::DECIMAL) * 100;
    
    -- Update the batch record
    UPDATE work_batches
    SET first_pass_yield = yield
    WHERE id = calculate_first_pass_yield.batch_id;
    
    RETURN yield;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger for new tables
CREATE TRIGGER update_component_tracking_updated_at BEFORE UPDATE ON component_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quality_checkpoints_updated_at BEFORE UPDATE ON quality_checkpoints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quality_patterns_updated_at BEFORE UPDATE ON quality_patterns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quality_holds_updated_at BEFORE UPDATE ON quality_holds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Migration: 20250132_fix_employees_to_workers.sql
-- ========================================

-- Fix V3 Quality System migration to use 'workers' instead of 'employees'

-- Drop existing policies that reference 'employees'
DROP POLICY IF EXISTS "Workers can view component tracking" ON component_tracking;
DROP POLICY IF EXISTS "Managers can modify component tracking" ON component_tracking;
DROP POLICY IF EXISTS "All employees can view quality checkpoints" ON quality_checkpoints;
DROP POLICY IF EXISTS "Managers can modify quality checkpoints" ON quality_checkpoints;
DROP POLICY IF EXISTS "Workers can create inspection results" ON inspection_results;
DROP POLICY IF EXISTS "All employees can view inspection results" ON inspection_results;
DROP POLICY IF EXISTS "All employees can view quality patterns" ON quality_patterns;
DROP POLICY IF EXISTS "Managers can modify quality patterns" ON quality_patterns;
DROP POLICY IF EXISTS "Workers can create quality holds" ON quality_holds;
DROP POLICY IF EXISTS "All employees can view quality holds" ON quality_holds;
DROP POLICY IF EXISTS "Managers can modify quality holds" ON quality_holds;
DROP POLICY IF EXISTS "All employees can view checkpoint templates" ON quality_checkpoint_templates;
DROP POLICY IF EXISTS "Managers can modify checkpoint templates" ON quality_checkpoint_templates;

-- Recreate policies with correct 'workers' table reference

-- Component tracking: workers can view all, managers can modify
CREATE POLICY "Workers can view component tracking" ON component_tracking
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workers w 
            WHERE w.auth_user_id = auth.uid() 
            AND w.is_active = true
        )
    );

CREATE POLICY "Managers can modify component tracking" ON component_tracking
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workers w 
            WHERE w.auth_user_id = auth.uid() 
            AND w.role IN ('manager', 'supervisor')
            AND w.is_active = true
        )
    );

-- Quality checkpoints: all authenticated users can view
CREATE POLICY "All workers can view quality checkpoints" ON quality_checkpoints
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workers w 
            WHERE w.auth_user_id = auth.uid() 
            AND w.is_active = true
        )
    );

CREATE POLICY "Managers can modify quality checkpoints" ON quality_checkpoints
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workers w 
            WHERE w.auth_user_id = auth.uid() 
            AND w.role = 'manager'
            AND w.is_active = true
        )
    );

-- Inspection results: workers can create their own, view all
CREATE POLICY "Workers can create inspection results" ON inspection_results
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workers w 
            WHERE w.auth_user_id = auth.uid() 
            AND w.id = worker_id
            AND w.is_active = true
        )
    );

CREATE POLICY "All workers can view inspection results" ON inspection_results
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workers w 
            WHERE w.auth_user_id = auth.uid() 
            AND w.is_active = true
        )
    );

-- Quality patterns: all can view, managers can modify
CREATE POLICY "All workers can view quality patterns" ON quality_patterns
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workers w 
            WHERE w.auth_user_id = auth.uid() 
            AND w.is_active = true
        )
    );

CREATE POLICY "Managers can modify quality patterns" ON quality_patterns
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workers w 
            WHERE w.auth_user_id = auth.uid() 
            AND w.role = 'manager'
            AND w.is_active = true
        )
    );

-- Quality holds: workers can create, managers can modify all
CREATE POLICY "Workers can create quality holds" ON quality_holds
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workers w 
            WHERE w.auth_user_id = auth.uid() 
            AND w.id = reported_by
            AND w.is_active = true
        )
    );

CREATE POLICY "All workers can view quality holds" ON quality_holds
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workers w 
            WHERE w.auth_user_id = auth.uid() 
            AND w.is_active = true
        )
    );

CREATE POLICY "Managers can modify quality holds" ON quality_holds
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workers w 
            WHERE w.auth_user_id = auth.uid() 
            AND w.role IN ('manager', 'supervisor')
            AND w.is_active = true
        )
    );

-- Quality checkpoint templates: all can view
CREATE POLICY "All workers can view checkpoint templates" ON quality_checkpoint_templates
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workers w 
            WHERE w.auth_user_id = auth.uid() 
            AND w.is_active = true
        )
    );

CREATE POLICY "Managers can modify checkpoint templates" ON quality_checkpoint_templates
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workers w 
            WHERE w.auth_user_id = auth.uid() 
            AND w.role = 'manager'
            AND w.is_active = true
        )
    );

-- ========================================
-- Migration: 20250133_user_management_system.sql
-- ========================================

-- User Management System for V3.1
-- Adds approval workflow and worker management features

-- Add approval and management columns to workers table
ALTER TABLE workers 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' 
  CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended')),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES workers(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_workers_approval_status ON workers(approval_status);
CREATE INDEX IF NOT EXISTS idx_workers_approved_by ON workers(approved_by);

-- Create worker invitations table
CREATE TABLE IF NOT EXISTS worker_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('worker', 'supervisor', 'manager')) NOT NULL,
  invited_by UUID REFERENCES workers(id) NOT NULL,
  invitation_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for invitations
CREATE INDEX IF NOT EXISTS idx_invitations_email ON worker_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON worker_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_invitations_expires ON worker_invitations(expires_at);

-- Create audit log for user management actions
CREATE TABLE IF NOT EXISTS user_management_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT CHECK (action_type IN ('approve', 'reject', 'suspend', 'reactivate', 'role_change', 'invite_sent', 'invite_accepted')) NOT NULL,
  actor_id UUID REFERENCES workers(id) NOT NULL,
  target_worker_id UUID REFERENCES workers(id),
  target_email TEXT,
  previous_value JSONB,
  new_value JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON user_management_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON user_management_audit_log(target_worker_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON user_management_audit_log(created_at DESC);

-- Enable RLS on new tables
ALTER TABLE worker_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_management_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invitations
CREATE POLICY "Managers can create invitations" ON worker_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workers w 
      WHERE w.auth_user_id = auth.uid() 
      AND w.role = 'manager'
      AND w.is_active = true
      AND w.approval_status = 'approved'
    )
  );

CREATE POLICY "Managers can view invitations" ON worker_invitations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workers w 
      WHERE w.auth_user_id = auth.uid() 
      AND w.role = 'manager'
      AND w.is_active = true
      AND w.approval_status = 'approved'
    )
  );

CREATE POLICY "Anyone can accept invitation with valid token" ON worker_invitations
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (accepted_at IS NULL AND expires_at > NOW());

-- RLS Policies for audit log
CREATE POLICY "Managers can view audit log" ON user_management_audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workers w 
      WHERE w.auth_user_id = auth.uid() 
      AND w.role = 'manager'
      AND w.is_active = true
      AND w.approval_status = 'approved'
    )
  );

CREATE POLICY "System can create audit log entries" ON user_management_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workers w 
      WHERE w.auth_user_id = auth.uid() 
      AND w.role IN ('manager', 'supervisor')
      AND w.is_active = true
      AND w.approval_status = 'approved'
    )
  );

-- Update existing workers RLS policies to check approval status
DROP POLICY IF EXISTS "Workers can view own record" ON workers;
DROP POLICY IF EXISTS "Managers can view all workers" ON workers;
DROP POLICY IF EXISTS "Workers can update own record" ON workers;

-- Recreate with approval status checks
CREATE POLICY "Workers can view own record" ON workers
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "Approved workers can view other approved workers" ON workers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workers w 
      WHERE w.auth_user_id = auth.uid() 
      AND w.is_active = true
      AND w.approval_status = 'approved'
    )
    AND (approval_status = 'approved' OR auth_user_id = auth.uid())
  );

CREATE POLICY "Workers can update own non-critical fields" ON workers
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (
    auth_user_id = auth.uid() 
    AND (
      -- Can't change these fields
      approval_status = OLD.approval_status
      AND role = OLD.role
      AND is_active = OLD.is_active
    )
  );

CREATE POLICY "Managers can update all worker fields" ON workers
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workers w 
      WHERE w.auth_user_id = auth.uid() 
      AND w.role = 'manager'
      AND w.is_active = true
      AND w.approval_status = 'approved'
    )
  );

-- Function to approve a worker
CREATE OR REPLACE FUNCTION approve_worker(
  p_worker_id UUID,
  p_approved_by_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update worker status
  UPDATE workers
  SET 
    approval_status = 'approved',
    approved_by = p_approved_by_id,
    approved_at = NOW()
  WHERE id = p_worker_id
  AND approval_status = 'pending';

  -- Log the action
  INSERT INTO user_management_audit_log (
    action_type,
    actor_id,
    target_worker_id,
    previous_value,
    new_value
  ) VALUES (
    'approve',
    p_approved_by_id,
    p_worker_id,
    jsonb_build_object('approval_status', 'pending'),
    jsonb_build_object('approval_status', 'approved')
  );

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject a worker
CREATE OR REPLACE FUNCTION reject_worker(
  p_worker_id UUID,
  p_rejected_by_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update worker status
  UPDATE workers
  SET 
    approval_status = 'rejected',
    rejection_reason = p_reason,
    approved_by = p_rejected_by_id,
    approved_at = NOW()
  WHERE id = p_worker_id
  AND approval_status = 'pending';

  -- Log the action
  INSERT INTO user_management_audit_log (
    action_type,
    actor_id,
    target_worker_id,
    reason,
    previous_value,
    new_value
  ) VALUES (
    'reject',
    p_rejected_by_id,
    p_worker_id,
    p_reason,
    jsonb_build_object('approval_status', 'pending'),
    jsonb_build_object('approval_status', 'rejected')
  );

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to suspend a worker
CREATE OR REPLACE FUNCTION suspend_worker(
  p_worker_id UUID,
  p_suspended_by_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_previous_status TEXT;
BEGIN
  -- Get current status
  SELECT approval_status INTO v_previous_status
  FROM workers
  WHERE id = p_worker_id;

  -- Update worker status
  UPDATE workers
  SET 
    approval_status = 'suspended',
    suspension_reason = p_reason,
    suspended_at = NOW(),
    is_active = false
  WHERE id = p_worker_id
  AND approval_status = 'approved';

  -- Log the action
  INSERT INTO user_management_audit_log (
    action_type,
    actor_id,
    target_worker_id,
    reason,
    previous_value,
    new_value
  ) VALUES (
    'suspend',
    p_suspended_by_id,
    p_worker_id,
    p_reason,
    jsonb_build_object('approval_status', v_previous_status, 'is_active', true),
    jsonb_build_object('approval_status', 'suspended', 'is_active', false)
  );

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reactivate a worker
CREATE OR REPLACE FUNCTION reactivate_worker(
  p_worker_id UUID,
  p_reactivated_by_id UUID
)
RETURNS BOOLEAN AS $$
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

  -- Log the action
  INSERT INTO user_management_audit_log (
    action_type,
    actor_id,
    target_worker_id,
    previous_value,
    new_value
  ) VALUES (
    'reactivate',
    p_reactivated_by_id,
    p_worker_id,
    jsonb_build_object('approval_status', 'suspended', 'is_active', false),
    jsonb_build_object('approval_status', 'approved', 'is_active', true)
  );

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing approved workers to have the correct status
-- (Only run this once during migration)
UPDATE workers 
SET approval_status = 'approved', 
    approved_at = created_at
WHERE is_active = true 
AND approval_status = 'pending';

-- Create a default manager account if none exists
-- (This ensures there's at least one approved manager who can approve others)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM workers 
    WHERE role = 'manager' 
    AND approval_status = 'approved'
  ) THEN
    UPDATE workers 
    SET 
      role = 'manager',
      approval_status = 'approved',
      approved_at = NOW()
    WHERE id = (
      SELECT id FROM workers 
      ORDER BY created_at ASC 
      LIMIT 1
    );
  END IF;
END $$;

-- ========================================
-- Migration: 20250134_fix_quality_rls_policies.sql
-- ========================================

-- Fix RLS policies for quality system tables
-- These policies failed to apply due to incorrect table references

-- Enable RLS on all quality tables
ALTER TABLE component_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_holds ENABLE ROW LEVEL SECURITY;

-- Component Tracking policies
CREATE POLICY "Workers view all components" ON component_tracking
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workers
            WHERE workers.auth_user_id = auth.uid()
            AND workers.active = true
        )
    );

CREATE POLICY "Workers update components" ON component_tracking
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM workers
            WHERE workers.auth_user_id = auth.uid()
            AND workers.active = true
        )
    );

CREATE POLICY "Supervisors insert components" ON component_tracking
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM workers
            WHERE workers.auth_user_id = auth.uid()
            AND workers.role IN ('supervisor', 'manager')
            AND workers.active = true
        )
    );

-- Quality Checkpoints policies
CREATE POLICY "Workers view checkpoints" ON quality_checkpoints
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workers
            WHERE workers.auth_user_id = auth.uid()
            AND workers.active = true
        )
    );

CREATE POLICY "Managers manage checkpoints" ON quality_checkpoints
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM workers
            WHERE workers.auth_user_id = auth.uid()
            AND workers.role = 'manager'
            AND workers.active = true
        )
    );

-- Inspection Results policies
CREATE POLICY "Workers view inspections" ON inspection_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workers
            WHERE workers.auth_user_id = auth.uid()
            AND workers.active = true
        )
    );

CREATE POLICY "Workers create inspections" ON inspection_results
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM workers
            WHERE workers.auth_user_id = auth.uid()
            AND workers.active = true
            AND workers.id = inspected_by
        )
    );

-- Quality Patterns policies
CREATE POLICY "Workers view patterns" ON quality_patterns
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workers
            WHERE workers.auth_user_id = auth.uid()
            AND workers.active = true
        )
    );

CREATE POLICY "System manages patterns" ON quality_patterns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM workers
            WHERE workers.auth_user_id = auth.uid()
            AND workers.role = 'manager'
            AND workers.active = true
        )
    );

-- Quality Holds policies
CREATE POLICY "Workers view holds" ON quality_holds
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workers
            WHERE workers.auth_user_id = auth.uid()
            AND workers.active = true
        )
    );

CREATE POLICY "Supervisors manage holds" ON quality_holds
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM workers
            WHERE workers.auth_user_id = auth.uid()
            AND workers.role IN ('supervisor', 'manager')
            AND workers.active = true
        )
    );

-- ========================================
-- Migration: 20250135_default_quality_checkpoints.sql
-- ========================================

-- Insert default quality checkpoint templates for headphone production

-- Get the first manager to use as creator
DO $$
DECLARE
    manager_id UUID;
BEGIN
    -- Try to get a manager, or create a system user if none exists
    SELECT id INTO manager_id FROM workers WHERE role = 'manager' LIMIT 1;
    
    IF manager_id IS NULL THEN
        -- Create a system user if no manager exists
        INSERT INTO workers (
            auth_user_id,
            email,
            name,
            role,
            active,
            approval_status,
            approved_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000'::uuid,
            'system@zmf.com',
            'System',
            'manager',
            true,
            'approved',
            NOW()
        ) RETURNING id INTO manager_id;
    END IF;

    -- Insert default quality checkpoints for different stages
    INSERT INTO quality_checkpoints (name, type, stage, checkpoint_data, created_by, required_for_products) VALUES
    -- Assembly checkpoints
    ('Driver Installation Check', 'assembly_verification', 'assembly', 
     '{"checks": ["driver_alignment", "driver_secure", "no_visible_damage", "correct_orientation"], 
       "requirements": {"tools": ["alignment_gauge"], "time_minutes": 5}}',
     manager_id, ARRAY['HD650', 'HD600', 'HD800']),
    
    ('Cable Connection Test', 'assembly_verification', 'assembly',
     '{"checks": ["cable_secure", "no_exposed_wires", "connector_tight", "strain_relief_proper"],
       "requirements": {"tools": ["multimeter"], "time_minutes": 3}}',
     manager_id, NULL),
    
    ('Housing Assembly Check', 'assembly_verification', 'assembly',
     '{"checks": ["housing_aligned", "no_gaps", "screws_tight", "padding_secure"],
       "requirements": {"tools": ["torque_screwdriver"], "time_minutes": 5}}',
     manager_id, NULL),

    -- Testing checkpoints
    ('Frequency Response Test', 'electronic_test', 'testing',
     '{"checks": ["20hz_to_20khz_response", "channel_balance", "distortion_levels"],
       "requirements": {"tools": ["audio_analyzer", "test_rig"], "time_minutes": 10},
       "pass_criteria": {"frequency_deviation": "±3dB", "channel_imbalance": "<1dB"}}',
     manager_id, NULL),
    
    ('Impedance Measurement', 'electronic_test', 'testing',
     '{"checks": ["nominal_impedance", "impedance_curve"],
       "requirements": {"tools": ["impedance_meter"], "time_minutes": 5},
       "pass_criteria": {"tolerance": "±10%"}}',
     manager_id, ARRAY['HD650', 'HD600']),
    
    ('Listening Test', 'audio_quality', 'testing',
     '{"checks": ["no_rattles", "no_distortion", "proper_bass", "clear_highs", "stereo_imaging"],
       "requirements": {"tools": ["test_amplifier", "test_tracks"], "time_minutes": 15}}',
     manager_id, NULL),

    -- Final QC checkpoints
    ('Visual Inspection', 'visual_inspection', 'final_qc',
     '{"checks": ["finish_quality", "logo_placement", "color_consistency", "no_scratches"],
       "requirements": {"tools": ["inspection_light", "magnifying_glass"], "time_minutes": 5}}',
     manager_id, NULL),
    
    ('Packaging Verification', 'packaging_check', 'final_qc',
     '{"checks": ["all_accessories_included", "manual_present", "warranty_card", "proper_cushioning"],
       "requirements": {"tools": ["checklist"], "time_minutes": 3}}',
     manager_id, NULL),
    
    ('Final Functional Test', 'final_test', 'final_qc',
     '{"checks": ["power_on_test", "all_features_working", "burn_in_complete"],
       "requirements": {"tools": ["test_station"], "time_minutes": 10}}',
     manager_id, NULL);

    -- Insert QC templates for different product types
    INSERT INTO qc_templates (name, product_type, template_data, created_by) VALUES
    ('Standard Headphone QC', 'standard',
     '{"visual": {"checks": ["housing_condition", "cable_condition", "connector_condition"], "weight": 0.2},
       "audio": {"checks": ["frequency_response", "channel_balance", "distortion"], "weight": 0.5},
       "mechanical": {"checks": ["adjustment_mechanism", "swivel_joints", "headband_tension"], "weight": 0.3}}',
     manager_id),
    
    ('Premium Headphone QC', 'premium',
     '{"visual": {"checks": ["finish_perfection", "logo_alignment", "color_match", "packaging"], "weight": 0.3},
       "audio": {"checks": ["extended_frequency_response", "soundstage", "detail_retrieval", "dynamics"], "weight": 0.5},
       "mechanical": {"checks": ["smooth_adjustments", "premium_feel", "cable_flexibility"], "weight": 0.2}}',
     manager_id),
    
    ('Wireless Headphone QC', 'wireless',
     '{"visual": {"checks": ["led_indicators", "button_alignment", "charging_port"], "weight": 0.2},
       "audio": {"checks": ["bluetooth_pairing", "latency_test", "codec_verification"], "weight": 0.4},
       "electronic": {"checks": ["battery_life", "charging_test", "firmware_version"], "weight": 0.4}}',
     manager_id);

END $$;

-- ========================================
-- Migration: 20250201_create_logs_table.sql
-- ========================================

-- Create logs table for application logging
CREATE TABLE IF NOT EXISTS application_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Core log data
  level INTEGER NOT NULL, -- 0=ERROR, 1=WARN, 2=INFO, 3=DEBUG
  message TEXT NOT NULL,
  context TEXT NOT NULL DEFAULT 'APP',
  
  -- Request tracing
  correlation_id UUID,
  request_id UUID,
  user_id UUID,
  session_id TEXT,
  
  -- API specific data
  api_method TEXT,
  api_url TEXT,
  api_status_code INTEGER,
  api_duration INTEGER, -- milliseconds
  api_user_agent TEXT,
  api_ip TEXT,
  
  -- Database query data
  db_query TEXT,
  db_duration INTEGER, -- milliseconds
  db_row_count INTEGER,
  
  -- Error data
  error_name TEXT,
  error_message TEXT,
  error_stack TEXT,
  error_code TEXT,
  
  -- Performance data
  performance_duration INTEGER, -- milliseconds
  memory_usage DECIMAL,
  
  -- Additional metadata (JSON)
  metadata JSONB DEFAULT '{}',
  
  -- Indexing
  CONSTRAINT chk_log_level CHECK (level IN (0, 1, 2, 3))
);

-- Create indexes for efficient querying
CREATE INDEX idx_application_logs_created_at ON application_logs(created_at DESC);
CREATE INDEX idx_application_logs_level ON application_logs(level);
CREATE INDEX idx_application_logs_context ON application_logs(context);
CREATE INDEX idx_application_logs_correlation_id ON application_logs(correlation_id);
CREATE INDEX idx_application_logs_user_id ON application_logs(user_id);
CREATE INDEX idx_application_logs_api_url ON application_logs(api_url);
CREATE INDEX idx_application_logs_error_name ON application_logs(error_name);

-- Create GIN index for metadata JSON queries
CREATE INDEX idx_application_logs_metadata ON application_logs USING GIN(metadata);

-- Enable RLS
ALTER TABLE application_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Only managers and supervisors can view logs
CREATE POLICY "Managers can view all logs" ON application_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE workers.auth_user_id = (SELECT auth.uid()) 
      AND workers.role IN ('manager', 'supervisor')
      AND workers.is_active = true
    )
  );

-- System can insert logs (using service role)
CREATE POLICY "System can insert logs" ON application_logs
  FOR INSERT TO service_role
  WITH CHECK (true);

-- Create a view for easier log analysis
CREATE OR REPLACE VIEW log_analytics AS
SELECT 
  DATE(created_at) as log_date,
  context,
  level,
  COUNT(*) as total_logs,
  COUNT(*) FILTER (WHERE level = 0) as error_count,
  COUNT(*) FILTER (WHERE level = 1) as warn_count,
  COUNT(*) FILTER (WHERE level = 2) as info_count,
  COUNT(*) FILTER (WHERE level = 3) as debug_count,
  AVG(api_duration) FILTER (WHERE api_duration IS NOT NULL) as avg_api_duration,
  MAX(api_duration) FILTER (WHERE api_duration IS NOT NULL) as max_api_duration,
  AVG(db_duration) FILTER (WHERE db_duration IS NOT NULL) as avg_db_duration,
  MAX(db_duration) FILTER (WHERE db_duration IS NOT NULL) as max_db_duration
FROM application_logs
GROUP BY DATE(created_at), context, level
ORDER BY log_date DESC, context, level;

-- Grant permissions on the view
GRANT SELECT ON log_analytics TO authenticated;

-- Create function for log cleanup (optional, for production)
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete logs older than 30 days (adjust as needed)
  DELETE FROM application_logs 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get error patterns for AI analysis
CREATE OR REPLACE FUNCTION get_error_patterns(days INTEGER DEFAULT 7)
RETURNS TABLE(
  error_pattern TEXT,
  occurrences BIGINT,
  first_seen TIMESTAMPTZ,
  last_seen TIMESTAMPTZ,
  contexts TEXT[],
  sample_correlation_id UUID
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION cleanup_old_logs() TO service_role;
GRANT EXECUTE ON FUNCTION get_error_patterns(INTEGER) TO authenticated;

-- Comment on table
COMMENT ON TABLE application_logs IS 'Centralized application logging for debugging and monitoring';
COMMENT ON COLUMN application_logs.level IS 'Log level: 0=ERROR, 1=WARN, 2=INFO, 3=DEBUG';
COMMENT ON COLUMN application_logs.correlation_id IS 'Used for tracing requests across multiple operations';
COMMENT ON COLUMN application_logs.metadata IS 'Additional context-specific data stored as JSON'; 

-- ========================================
-- Migration: 20250201_user_management_tables.sql
-- ========================================

-- User Management Enhancement Tables

-- Worker invitations table
CREATE TABLE IF NOT EXISTS worker_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_by UUID REFERENCES workers(id) NOT NULL,
    used_at TIMESTAMPTZ,
    used_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User management audit log
CREATE TABLE IF NOT EXISTS user_management_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL, -- 'approved', 'rejected', 'suspended', 'reactivated', 'invited', 'role_changed'
    target_worker_id UUID REFERENCES workers(id),
    target_email TEXT,
    performed_by UUID REFERENCES workers(id),
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Worker sessions table for tracking login history
CREATE TABLE IF NOT EXISTS worker_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID REFERENCES workers(id) NOT NULL,
    auth_user_id UUID REFERENCES auth.users(id) NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

-- Worker skills catalog
CREATE TABLE IF NOT EXISTS skill_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL, -- 'production', 'quality', 'technical', 'soft'
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Worker skill assignments with proficiency
CREATE TABLE IF NOT EXISTS worker_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID REFERENCES workers(id) NOT NULL,
    skill_id UUID REFERENCES skill_catalog(id) NOT NULL,
    proficiency_level INTEGER CHECK (proficiency_level BETWEEN 1 AND 5), -- 1=Beginner, 5=Expert
    certified_at TIMESTAMPTZ,
    certified_by UUID REFERENCES workers(id),
    expires_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(worker_id, skill_id)
);

-- Worker achievements/badges
CREATE TABLE IF NOT EXISTS worker_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID REFERENCES workers(id) NOT NULL,
    achievement_type TEXT NOT NULL, -- 'quality_champion', 'speed_demon', 'perfect_month', etc.
    achievement_data JSONB DEFAULT '{}',
    earned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_worker_invitations_email ON worker_invitations(email);
CREATE INDEX idx_worker_invitations_token ON worker_invitations(token);
CREATE INDEX idx_worker_invitations_expires_at ON worker_invitations(expires_at);
CREATE INDEX idx_audit_log_target_worker ON user_management_audit_log(target_worker_id);
CREATE INDEX idx_audit_log_performed_by ON user_management_audit_log(performed_by);
CREATE INDEX idx_audit_log_created_at ON user_management_audit_log(created_at);
CREATE INDEX idx_worker_sessions_worker ON worker_sessions(worker_id);
CREATE INDEX idx_worker_sessions_active ON worker_sessions(ended_at) WHERE ended_at IS NULL;
CREATE INDEX idx_worker_skills_worker ON worker_skills(worker_id);
CREATE INDEX idx_worker_achievements_worker ON worker_achievements(worker_id);

-- RLS Policies

-- Worker invitations (managers only)
ALTER TABLE worker_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view all invitations" ON worker_invitations
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workers
            WHERE workers.auth_user_id = auth.uid()
            AND workers.role = 'manager'
            AND workers.is_active = true
        )
    );

CREATE POLICY "Managers can create invitations" ON worker_invitations
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workers
            WHERE workers.auth_user_id = auth.uid()
            AND workers.role = 'manager'
            AND workers.is_active = true
        )
    );

-- Audit log (managers only view)
ALTER TABLE user_management_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view audit log" ON user_management_audit_log
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workers
            WHERE workers.auth_user_id = auth.uid()
            AND workers.role = 'manager'
            AND workers.is_active = true
        )
    );

CREATE POLICY "System can insert audit log" ON user_management_audit_log
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Worker sessions (workers see own, managers see all)
ALTER TABLE worker_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers can view own sessions" ON worker_sessions
    FOR SELECT TO authenticated
    USING (
        auth_user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM workers
            WHERE workers.auth_user_id = auth.uid()
            AND workers.role = 'manager'
            AND workers.is_active = true
        )
    );

-- Skills (everyone can view)
ALTER TABLE skill_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view skills" ON skill_catalog
    FOR SELECT TO authenticated
    USING (is_active = true);

CREATE POLICY "Managers can manage skills" ON skill_catalog
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workers
            WHERE workers.auth_user_id = auth.uid()
            AND workers.role = 'manager'
            AND workers.is_active = true
        )
    );

-- Worker skills (workers see own, managers see all)
ALTER TABLE worker_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers can view own skills" ON worker_skills
    FOR SELECT TO authenticated
    USING (
        worker_id IN (
            SELECT id FROM workers WHERE auth_user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM workers
            WHERE workers.auth_user_id = auth.uid()
            AND workers.role IN ('manager', 'supervisor')
            AND workers.is_active = true
        )
    );

CREATE POLICY "Managers can manage worker skills" ON worker_skills
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workers
            WHERE workers.auth_user_id = auth.uid()
            AND workers.role = 'manager'
            AND workers.is_active = true
        )
    );

-- Achievements (workers see own, everyone can see others)
ALTER TABLE worker_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view achievements" ON worker_achievements
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "System can insert achievements" ON worker_achievements
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Add some default skills
INSERT INTO skill_catalog (name, category, description) VALUES
    ('Wood Sanding', 'production', 'Proficiency in various wood sanding techniques'),
    ('Finishing Application', 'production', 'Expertise in applying finishes and coatings'),
    ('Assembly', 'production', 'Component assembly and fitting skills'),
    ('Quality Inspection', 'quality', 'Ability to identify defects and quality issues'),
    ('Precision Measurement', 'quality', 'Accurate measurement and calibration skills'),
    ('CNC Operation', 'technical', 'Operating and programming CNC machines'),
    ('Tool Maintenance', 'technical', 'Maintaining and calibrating production tools'),
    ('Team Collaboration', 'soft', 'Working effectively in team environments'),
    ('Problem Solving', 'soft', 'Identifying and resolving production issues'),
    ('Time Management', 'soft', 'Efficient task completion and scheduling');

-- Add triggers
CREATE TRIGGER update_worker_skills_updated_at BEFORE UPDATE ON worker_skills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Migration: 20250205_add_worker_approval_functions.sql
-- ========================================

-- Function to approve a worker
CREATE OR REPLACE FUNCTION approve_worker(
  p_worker_id UUID,
  p_approved_by_id UUID
)
RETURNS BOOLEAN AS $$
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

  -- Log the action if audit log table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_management_audit_log') THEN
    INSERT INTO user_management_audit_log (
      action_type,
      actor_id,
      target_worker_id,
      previous_value,
      new_value
    ) VALUES (
      'approve',
      p_approved_by_id,
      p_worker_id,
      jsonb_build_object('approval_status', 'pending'),
      jsonb_build_object('approval_status', 'approved')
    );
  END IF;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject a worker
CREATE OR REPLACE FUNCTION reject_worker(
  p_worker_id UUID,
  p_rejected_by_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN AS $$
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

  -- Log the action if audit log table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_management_audit_log') THEN
    INSERT INTO user_management_audit_log (
      action_type,
      actor_id,
      target_worker_id,
      reason,
      previous_value,
      new_value
    ) VALUES (
      'reject',
      p_rejected_by_id,
      p_worker_id,
      p_reason,
      jsonb_build_object('approval_status', 'pending'),
      jsonb_build_object('approval_status', 'rejected', 'reason', p_reason)
    );
  END IF;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to suspend a worker
CREATE OR REPLACE FUNCTION suspend_worker(
  p_worker_id UUID,
  p_suspended_by_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_previous_status TEXT;
BEGIN
  -- Get current status
  SELECT approval_status INTO v_previous_status
  FROM workers
  WHERE id = p_worker_id;

  -- Update worker status
  UPDATE workers
  SET 
    approval_status = 'suspended',
    suspension_reason = p_reason,
    suspended_at = NOW(),
    is_active = false
  WHERE id = p_worker_id
  AND approval_status = 'approved';

  -- Log the action if audit log table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_management_audit_log') THEN
    INSERT INTO user_management_audit_log (
      action_type,
      actor_id,
      target_worker_id,
      reason,
      previous_value,
      new_value
    ) VALUES (
      'suspend',
      p_suspended_by_id,
      p_worker_id,
      p_reason,
      jsonb_build_object('approval_status', v_previous_status, 'is_active', true),
      jsonb_build_object('approval_status', 'suspended', 'is_active', false, 'reason', p_reason)
    );
  END IF;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reactivate a worker
CREATE OR REPLACE FUNCTION reactivate_worker(
  p_worker_id UUID,
  p_reactivated_by_id UUID
)
RETURNS BOOLEAN AS $$
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

  -- Log the action if audit log table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_management_audit_log') THEN
    INSERT INTO user_management_audit_log (
      action_type,
      actor_id,
      target_worker_id,
      previous_value,
      new_value
    ) VALUES (
      'reactivate',
      p_reactivated_by_id,
      p_worker_id,
      jsonb_build_object('approval_status', 'suspended', 'is_active', false),
      jsonb_build_object('approval_status', 'approved', 'is_active', true)
    );
  END IF;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION approve_worker TO authenticated;
GRANT EXECUTE ON FUNCTION reject_worker TO authenticated;
GRANT EXECUTE ON FUNCTION suspend_worker TO authenticated;
GRANT EXECUTE ON FUNCTION reactivate_worker TO authenticated;

