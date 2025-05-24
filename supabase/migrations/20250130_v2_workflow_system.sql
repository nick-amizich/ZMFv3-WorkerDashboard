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