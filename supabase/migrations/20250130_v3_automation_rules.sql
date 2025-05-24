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