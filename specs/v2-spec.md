# 🏭 Standalone Worker Management App v2.0 - Enhanced Production Flow Specification

> **Project Type**: Production-ready headphone manufacturing worker management system with customizable workflow automation  
> **Risk Level**: Low (building on stable v1.0 foundation)  
> **Development Mode**: Claude Code + MCP servers + Claude 4 memory

---

## 📋 **VERSION 2.0 OVERVIEW**

### New Mission Statement
Enhance the existing worker management system with **customizable** stage-based task assignment, allowing managers to build both automated and manual workflows. Enable time tracking by product groups, issue reporting with Slack integration, and comprehensive production flow tracking for headphone manufacturing.

### New Core Business Requirements
- **Customizable Workflows**: Managers can build workflows with automatic or manual task generation
- **Workflow Builder**: Visual interface for managers to create/edit production workflows
- **Batch Time Tracking**: Log time against groups of products (by model/wood type)
- **Issue Reporting**: Capture and escalate production issues to Slack
- **Flexible Stage Dependencies**: Support both sequential and parallel workflows
- **Production Analytics**: Track bottlenecks and efficiency by stage

### New Success Criteria
- Managers can create custom workflows without developer intervention
- Support for both automated and manual task assignment
- Workers can log time against batches of products
- Issues post to Slack with context and photos
- Managers see real-time production flow visualization
- Stage transitions are tracked with timestamps

---

## 🔄 **PRODUCTION WORKFLOW STAGES**

### Stage Definitions
```typescript
enum ProductionStage {
  SANDING = 'sanding',
  FINISHING = 'finishing',           // UV coat application
  SUB_ASSEMBLY = 'sub_assembly',     // Optional stage
  ASSEMBLY = 'assembly',             // Main build
  INITIAL_QC = 'initial_qc',         
  ACOUSTIC_TESTING = 'acoustic_testing',
  FINAL_QC = 'final_qc',
  PACKAGING = 'packaging',
  SHIPPING = 'shipping',
  CUSTOM = 'custom'                  // Allow custom stages
}

interface StageDefinition {
  stage: string                      // Can be enum value or custom
  name: string
  description: string
  estimated_hours: number
  required_skills: string[]
  is_optional: boolean
  is_automated: boolean              // NEW: Auto-create tasks or manual
  auto_assign_rule?: 'least_busy' | 'round_robin' | 'specific_worker' | 'manual'
  next_stages: string[]              // Can branch to multiple
  completion_criteria?: string[]
  custom_fields?: Record<string, any>
}

interface WorkflowTemplate {
  id: string
  name: string
  description: string
  created_by: string
  is_active: boolean
  trigger_rules: {
    product_matches?: {              // Which products use this workflow
      model?: string[]
      wood_type?: string[]
      sku_pattern?: string
      custom_rules?: any
    }
    manual_only?: boolean           // Only apply when manually selected
  }
  stages: StageDefinition[]
  stage_transitions: {
    from_stage: string
    to_stage: string[]
    condition?: 'all_complete' | 'any_complete' | 'manual_approval'
    auto_transition: boolean
  }[]
}
```

---

## 🗄️ **DATABASE SCHEMA UPDATES**

### Existing Tables to Modify

```sql
-- 1. UPDATE work_tasks table (add new columns for v2.0)
ALTER TABLE work_tasks 
ADD COLUMN batch_id UUID,
ADD COLUMN stage TEXT,
ADD COLUMN auto_generated BOOLEAN DEFAULT false,
ADD COLUMN depends_on_task_ids UUID[],
ADD COLUMN manual_assignment BOOLEAN DEFAULT false,
ADD COLUMN workflow_template_id UUID;

-- Remove strict task_type constraint to allow custom stages
ALTER TABLE work_tasks DROP CONSTRAINT work_tasks_task_type_check;
ALTER TABLE work_tasks ADD CONSTRAINT work_tasks_stage_or_type_check 
CHECK (task_type IS NOT NULL OR stage IS NOT NULL);

-- 2. ENHANCE work_logs table (rename to time_logs and add batch support)
CREATE TABLE time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES workers(id) NOT NULL,
  task_id UUID REFERENCES work_tasks(id),
  batch_id UUID,
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

-- Migrate existing work_logs data
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
JOIN work_tasks wt ON wt.id = wl.task_id;
```

### New Tables to Add

```sql
-- 1. Workflow Templates table (Replaces production_templates)
CREATE TABLE workflow_templates (
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

-- 2. Work Batches table
CREATE TABLE work_batches (
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

-- Add foreign keys
ALTER TABLE work_tasks ADD CONSTRAINT work_tasks_batch_id_fkey 
FOREIGN KEY (batch_id) REFERENCES work_batches(id);

ALTER TABLE work_tasks ADD CONSTRAINT work_tasks_workflow_template_id_fkey 
FOREIGN KEY (workflow_template_id) REFERENCES workflow_templates(id);

-- 3. Stage Transitions table
CREATE TABLE stage_transitions (
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

-- 4. Production Issues table
CREATE TABLE production_issues (
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

-- 5. Worker Stage Assignments table
CREATE TABLE worker_stage_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES workers(id) NOT NULL,
  stage TEXT NOT NULL,
  skill_level TEXT CHECK (skill_level IN ('trainee', 'competent', 'expert')) DEFAULT 'competent',
  is_active BOOLEAN DEFAULT true,
  assigned_by_id UUID REFERENCES workers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(worker_id, stage)
);

-- 6. Workflow Execution Log (Track workflow automation)
CREATE TABLE workflow_execution_log (
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

-- 7. Custom Stage Definitions (Allow managers to create custom stages)
CREATE TABLE custom_stages (
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

-- Add foreign key for time_logs batch reference
ALTER TABLE time_logs ADD CONSTRAINT time_logs_batch_id_fkey 
FOREIGN KEY (batch_id) REFERENCES work_batches(id);

-- Indexes for performance
CREATE INDEX idx_work_batches_status ON work_batches(status);
CREATE INDEX idx_work_batches_stage ON work_batches(current_stage);
CREATE INDEX idx_work_batches_workflow ON work_batches(workflow_template_id);
CREATE INDEX idx_stage_transitions_batch ON stage_transitions(batch_id);
CREATE INDEX idx_stage_transitions_time ON stage_transitions(transition_time);
CREATE INDEX idx_time_logs_worker_date ON time_logs(worker_id, start_time);
CREATE INDEX idx_production_issues_status ON production_issues(resolution_status);
CREATE INDEX idx_worker_stage_assignments ON worker_stage_assignments(worker_id, stage) WHERE is_active = true;
CREATE INDEX idx_work_tasks_batch ON work_tasks(batch_id);
CREATE INDEX idx_work_tasks_stage ON work_tasks(stage);
CREATE INDEX idx_workflow_execution_log_batch ON workflow_execution_log(batch_id);
CREATE INDEX idx_workflow_execution_log_time ON workflow_execution_log(created_at);

-- Enable real-time for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE work_batches;
ALTER PUBLICATION supabase_realtime ADD TABLE production_issues;
ALTER PUBLICATION supabase_realtime ADD TABLE stage_transitions;
ALTER PUBLICATION supabase_realtime ADD TABLE time_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_execution_log;
```

### RLS Policies for New Tables

```sql
-- Enable RLS on new tables
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_stage_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_execution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_stages ENABLE ROW LEVEL SECURITY;

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
```

---

## 🔧 **NEW API ENDPOINTS**

### Workflow Management Endpoints
```typescript
// GET /api/workflows
// List all workflow templates

// POST /api/workflows
// Create new workflow template
{
  name: string
  description: string
  trigger_rules: {
    product_matches?: {
      model?: string[]
      wood_type?: string[]
      sku_pattern?: string
    }
    manual_only?: boolean
  }
  stages: StageDefinition[]
  stage_transitions: StageTransition[]
}

// PUT /api/workflows/{id}
// Update workflow template

// POST /api/workflows/{id}/duplicate
// Clone a workflow template

// GET /api/workflows/{id}/preview
// Preview workflow with sample data
```

### Batch Management Endpoints
```typescript
// POST /api/batches/create
// Create batch with workflow selection
{
  name: string
  batch_type: 'model' | 'wood_type' | 'custom'
  order_item_ids: string[]
  workflow_template_id?: string  // Optional - can be selected later
  criteria: {
    model?: string
    wood_type?: string
    custom_rules?: any
  }
}

// POST /api/batches/{id}/assign-workflow
// Assign or change workflow for batch
{
  workflow_template_id: string
  start_at_stage?: string  // Optional - start at specific stage
}

// POST /api/batches/{id}/transition
// Move batch to next stage (manual or auto)
{
  to_stage: string
  notes?: string
  transition_type: 'auto' | 'manual'
  create_tasks?: boolean
  auto_assign?: boolean
}

// POST /api/batches/{id}/generate-tasks
// Manually generate tasks for current stage
{
  auto_assign: boolean
  assignment_rule?: 'least_busy' | 'round_robin' | 'specific_worker'
  specific_worker_id?: string
}
```

### Time Tracking Endpoints
```typescript
// POST /api/time/start
// Start timing for task or batch
{
  task_id?: string
  batch_id?: string
  stage: string
}

// POST /api/time/stop
// Stop current timer
{
  time_log_id: string
  notes?: string
}

// GET /api/time/current/{worker_id}
// Get worker's active timer

// GET /api/time/batch/{batch_id}
// Get all time logs for a batch
```

### Issue Reporting Endpoints
```typescript
// POST /api/issues/report
// Create issue and post to Slack
{
  task_id?: string
  batch_id?: string
  order_item_id?: string
  stage: string
  issue_type: string
  severity: string
  title: string
  description: string
  image_urls?: string[]
  slack_channel?: string
}

// POST /api/issues/{id}/resolve
// Mark issue as resolved
{
  resolution_notes: string
  resolution_status: 'resolved' | 'wont_fix'
}

// GET /api/issues/by-stage/{stage}
// Get issues for specific stage
```

### Custom Stage Management
```typescript
// GET /api/stages/custom
// List all custom stages

// POST /api/stages/custom
// Create custom stage
{
  stage_code: string
  stage_name: string
  description: string
  default_estimated_hours: number
  required_skills: string[]
}

// GET /api/stages/all
// Get both standard and custom stages
```

---

## 📱 **NEW UI COMPONENTS**

### Manager: Workflow Builder
```typescript
interface WorkflowBuilderProps {
  // Visual workflow designer
  // Drag-and-drop stage arrangement
  // Configure automation rules
}

features:
- Visual flow chart editor
- Stage library (standard + custom)
- Drag stages to create workflow
- Connect stages with transitions
- Configure each stage:
  - Automation settings (auto/manual)
  - Assignment rules
  - Estimated time
  - Required skills
  - Completion criteria
- Test workflow with sample data
- Save as template
- Import/export workflows
```

### Manager: Production Flow Board
```typescript
interface ProductionFlowBoardProps {
  // Enhanced with workflow visibility
}

features:
- Workflow selector dropdown
- View by workflow or "all items"
- Stage columns based on active workflow
- Batch cards showing:
  - Current workflow name
  - Automation status (auto/manual)
  - Progress through workflow
  - Manual intervention indicators
- Override automation controls
- Bulk operations menu
```

### Manager: Workflow Analytics
```typescript
interface WorkflowAnalyticsProps {
  // Compare workflow performance
}

features:
- Workflow comparison charts
- Stage bottleneck analysis
- Automation success rates
- Manual intervention frequency
- Average time per workflow
- Cost analysis by workflow
```

### Worker: Enhanced Task View
```typescript
interface WorkerTaskViewProps {
  // Shows workflow context
}

features:
- Current workflow indicator
- Stage progress visualization
- "My Tasks" and "My Batches" tabs
- For each task/batch:
  - Stage name and description
  - Workflow path visualization
  - Next stages preview
  - Automation indicator
- Quick actions remain the same
```

### Worker: Issue Reporting Modal
```typescript
interface IssueReportingModalProps {
  // Enhanced with workflow context
}

features:
- Auto-populate workflow and stage
- Suggest common issues by stage
- Workflow-specific issue templates
- Previous issues at this stage
- All other features from v2.0
```

---

## 🔌 **SLACK INTEGRATION**

### Enhanced Slack Features
```typescript
// Workflow notifications
interface SlackWorkflowNotification {
  channel: string
  text: string
  blocks: [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `Workflow *${workflow_name}* requires manual intervention at stage *${stage_name}*`
      }
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'View in Dashboard' },
          url: `${app_url}/manager/workflows/${workflow_id}`
        }
      ]
    }
  ]
}

// Issue posting includes workflow context
// Workflow completion notifications
// Stage bottleneck alerts
```

---

## 🤖 **AUTOMATION RULES ENGINE**

### Workflow Automation Configuration
```typescript
interface WorkflowAutomation {
  workflow_template_id: string
  rules: AutomationRule[]
}

interface AutomationRule {
  id: string
  name: string
  trigger: {
    type: 'stage_complete' | 'time_elapsed' | 'manual' | 'schedule'
    stage?: string
    elapsed_hours?: number
    schedule?: string  // Cron expression
  }
  conditions: {
    all?: Condition[]  // AND conditions
    any?: Condition[]  // OR conditions
  }
  actions: Action[]
  is_active: boolean
}

interface Condition {
  type: 'batch_size' | 'product_type' | 'worker_available' | 'time_of_day' | 'custom'
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'between'
  value: any
}

interface Action {
  type: 'create_tasks' | 'assign_tasks' | 'notify' | 'transition_stage' | 'pause_workflow'
  config: {
    stage?: string
    assignment_rule?: string
    notification_channel?: string
    message_template?: string
  }
}
```

### Default Automation Behaviors
1. **Flexible Stage Completion**: Configurable per workflow
2. **Smart Assignment**: Based on workload, skills, and availability
3. **Conditional Branching**: Different paths based on product attributes
4. **Manual Override**: Any automation can be paused or overridden
5. **Notification Rules**: Customizable alerts and escalations

---

## 🏃 **MIGRATION STRATEGY**

### Database Migration Steps
```sql
-- 1. Create workflow_templates from any existing patterns
INSERT INTO workflow_templates (name, description, stages, stage_transitions, is_default)
VALUES (
  'Standard Headphone Build',
  'Default workflow for standard headphone production',
  '[
    {"stage": "sanding", "name": "Sanding", "is_automated": true, "auto_assign_rule": "least_busy"},
    {"stage": "finishing", "name": "UV Coating", "is_automated": true, "auto_assign_rule": "least_busy"},
    {"stage": "assembly", "name": "Assembly", "is_automated": false, "auto_assign_rule": "manual"},
    {"stage": "initial_qc", "name": "Initial QC", "is_automated": true, "auto_assign_rule": "round_robin"},
    {"stage": "acoustic_testing", "name": "Acoustic Testing", "is_automated": false, "auto_assign_rule": "manual"},
    {"stage": "final_qc", "name": "Final QC", "is_automated": true, "auto_assign_rule": "round_robin"},
    {"stage": "packaging", "name": "Packaging", "is_automated": true, "auto_assign_rule": "least_busy"},
    {"stage": "shipping", "name": "Shipping", "is_automated": true, "auto_assign_rule": "least_busy"}
  ]'::jsonb,
  '[
    {"from_stage": "sanding", "to_stage": ["finishing"], "auto_transition": true},
    {"from_stage": "finishing", "to_stage": ["assembly"], "auto_transition": false},
    {"from_stage": "assembly", "to_stage": ["initial_qc"], "auto_transition": true},
    {"from_stage": "initial_qc", "to_stage": ["acoustic_testing"], "auto_transition": false},
    {"from_stage": "acoustic_testing", "to_stage": ["final_qc"], "auto_transition": false},
    {"from_stage": "final_qc", "to_stage": ["packaging"], "auto_transition": true},
    {"from_stage": "packaging", "to_stage": ["shipping"], "auto_transition": true}
  ]'::jsonb,
  true
);

-- 2. Migrate existing data
UPDATE work_tasks 
SET stage = COALESCE(stage, task_type),
    manual_assignment = true
WHERE stage IS NULL;

-- 3. Create worker stage assignments from skills
INSERT INTO worker_stage_assignments (worker_id, stage, skill_level)
SELECT 
  id as worker_id,
  unnest(skills) as stage,
  'competent' as skill_level
FROM workers
WHERE is_active = true
ON CONFLICT (worker_id, stage) DO NOTHING;
```

---

## 📊 **PERFORMANCE CONSIDERATIONS**

### Query Optimization
```sql
-- Workflow execution metrics view
CREATE MATERIALIZED VIEW workflow_metrics AS
SELECT 
  wt.id as workflow_template_id,
  wt.name as workflow_name,
  st.stage,
  DATE(st.transition_time) as date,
  COUNT(DISTINCT st.batch_id) as batches_processed,
  COUNT(DISTINCT st.order_item_id) as items_processed,
  AVG(
    EXTRACT(EPOCH FROM (
      lead(st.transition_time) OVER (
        PARTITION BY COALESCE(st.batch_id, st.order_item_id) 
        ORDER BY st.transition_time
      ) - st.transition_time
    ))/3600
  ) as avg_hours_in_stage,
  SUM(CASE WHEN st.transition_type = 'auto' THEN 1 ELSE 0 END) as auto_transitions,
  SUM(CASE WHEN st.transition_type = 'manual' THEN 1 ELSE 0 END) as manual_transitions
FROM stage_transitions st
JOIN workflow_templates wt ON wt.id = st.workflow_template_id
GROUP BY wt.id, wt.name, st.stage, DATE(st.transition_time);

CREATE INDEX idx_workflow_metrics ON workflow_metrics(workflow_template_id, date, stage);
```

---

## 🔐 **SECURITY ENHANCEMENTS**

### Workflow Security
- Only managers can create/edit workflows
- Workflow changes are audit logged
- Workers cannot override automation rules
- Sensitive workflows can be restricted to specific managers

### API Rate Limiting
- Workflow creation: 10 per hour per manager
- Batch operations: 100 per minute
- Issue reporting: 5 per minute per worker
- Automation triggers: 1000 per hour total

---

## 📈 **SUCCESS METRICS**

### Key Performance Indicators
- **Workflow Efficiency**: Time reduction per workflow type
- **Automation Rate**: % of tasks auto-assigned vs manual
- **Workflow Adoption**: Number of custom workflows created
- **Manual Intervention**: Frequency and duration
- **Error Rates**: Failed automations by workflow

### Monitoring Dashboard
- Workflow performance comparison
- Automation success/failure rates
- Manual intervention patterns
- Custom stage usage statistics
- Workflow modification history

---

## 🔄 **BACKWARD COMPATIBILITY**

### Maintaining v1.0 Functionality
- All existing endpoints continue to work
- Default workflow created for existing data
- Manual assignment remains available
- Progressive enhancement approach

### Feature Flags
```typescript
// Enable workflow features gradually
const FEATURE_FLAGS = {
  WORKFLOW_BUILDER: true,
  AUTOMATED_WORKFLOWS: true,
  CUSTOM_STAGES: true,
  WORKFLOW_ANALYTICS: false  // Can be enabled later
}
```

---

**This specification extends v2.0 with a flexible workflow system that supports both automated and manual processes, allowing managers to build custom workflows without developer intervention.**