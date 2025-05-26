# 🏭 Standalone Worker Management App v2.0 - Enhanced Production Flow Specification

> **Project Type**: Production-ready headphone manufacturing worker management system with customizable workflow automation  
> **Risk Level**: Low (building on stable v1.0 foundation)  
> **Development Mode**: Claude Code + MCP servers + Claude 4 memory

---

## 📋 **VERSION 2.0 OVERVIEW**

### New Mission Statement
Enhance the existing worker management system with **customizable** stage-based task assignment, allowing managers to build both automated and manual workflows. Enable time tracking by product groups, issue reporting with Slack integration, and comprehensive production flow tracking for headphone manufacturing.

### App V2 Outline:
# 🚀 ZMF Worker Management App v2.0 - Implementation Vision & System Design

> **Mission**: Build our internal production management system that transforms how our headphone manufacturing team works together. This is our custom tool that will make production flow seamlessly from wood selection to shipping.

---

## 🎯 **THE BIG PICTURE**

### What We're Building for ZMF
Our production floor visualization where:
- **Our Managers** orchestrate production with real-time visibility, building custom workflows for each product line
- **Our Craftspeople** know exactly what to do next, track their time effortlessly, and communicate issues instantly
- **Our System** automatically flows work through stages, assigns tasks intelligently, and keeps everyone in sync

This is **OUR** system - built specifically for ZMF's unique production process. Every headphone's journey from raw wood to acoustic perfection is tracked and optimized.

---

## 🎨 **CORE USER EXPERIENCES**

### 🎼 Manager Experience: "The Production Orchestrator"

**Morning Dashboard View**
When our production manager logs in, they see:
- **Production Pipeline** - Live Kanban board showing every batch at every stage
- **Live Metrics** - Orders from Shopify, active workers, yesterday's stats
- **Alerts Panel** - "3 items in QC for 2+ days", "Walnut batch ready for finishing"
- **Quick Actions** - "Create Batch", "Assign Work", "Check Issues"

**Workflow Builder - Our Game Changer**
Creating a special workflow for limited edition models:
1. Click "Create Workflow" 
2. Drag stages: `Sanding → Custom Engraving → Finishing → Elite QC → Assembly`
3. Set "Custom Engraving" to manual (only specific workers)
4. Set "Elite QC" to require photo documentation
5. Save as "Limited Edition Workflow"
6. System automatically routes matching orders through this flow!

**Real-Time Production Control**
- **Drag & Drop Assignment**: See unassigned batches → drag to worker columns
- **Stage Transitions**: Click "Advance Stage" and tasks auto-generate
- **Bottleneck Alerts**: "Finishing station backing up - 5 batches waiting"
- **Smart Suggestions**: "Based on current pace, assign 2 more to assembly"

### 👷 Worker Experience: "The Craftsperson"

**Mobile-First Task View**
When our assembly specialist checks their phone:
- **Active Timer** - Big display showing "Walnut HD650 Batch - 1:34:22"
- **Current Task Card** - Batch details, stage, special instructions
- **Quick Actions** - Three big buttons: `Pause Timer` `Report Issue` `Complete Stage`
- **What's Next** - Preview of upcoming tasks

**Effortless Time Tracking**
- **One-Tap Start**: Tap batch card → timer starts → start working
- **Smart Batching**: System groups similar items - "5 Walnut HD650s"
- **Break Handling**: Tap pause for lunch, resume when back
- **Automatic Logs**: No manual timesheets

**Issue Reporting in 10 Seconds**
Spotting a wood defect:
1. Tap "Report Issue" 
2. Take photo with phone camera
3. Select "Material Defect" + "High Severity"
4. Voice note: "Large knot in walnut cup, might affect acoustics"
5. Send → Manager notified → Slack post created → Issue logged

### 🔄 The Workflow Engine: "Our Production Brain"

**How Our Automation Works**
1. **Order Arrives**: New Shopify order for "Walnut HD650"
2. **Template Matching**: System finds "Standard Headphone Workflow"
3. **Batch Creation**: Groups with other walnut orders
4. **Task Generation**: Creates sanding task, assigns to available sander
5. **Worker Notification**: Push notification to assigned worker
6. **Progress Tracking**: Completion triggers next stage
7. **Smart Routing**: Routes based on workflow rules
8. **Completion Chain**: Each stage triggers the next

**Manual Override Power**
- Managers can intervene: "Route this to premium QC"
- Workers can flag: "Needs manager review"
- Workflows can pause: "Wait for customer approval"

---

## 💡 **KEY SYSTEM BEHAVIORS**

### Intelligent Task Assignment
```
Our Assignment Logic:
1. Check worker skills for stage
2. Calculate current workload
3. Consider historical performance
4. Apply assignment rule:
   - Least Busy: Lightest current load
   - Round Robin: Fair distribution
   - Specialized: Only certified workers
   - Manual: Manager decides
```

### Batch Intelligence
```
Our Batching Rules:
- Same model + same wood = automatic batch
- Custom: "All cable orders together"
- Priority: "Rush orders process individually"
- Smart splitting: "Batch of 20 splits into 4x5"
```

### Real-Time Synchronization
```
What Updates Live:
- Worker starts task → Status changes everywhere
- Issue reported → Manager dashboard alert
- Stage completed → Next worker notified
- Shopify order → Appears in queue
```

---

## 🎭 **CRITICAL USER FLOWS**

### Flow 1: Order to Shipment
```
1. Shopify → Order syncs → "New Orders" queue
2. Manager → Reviews → Creates batch or individual
3. System → Matches workflow → Generates tasks
4. Worker → Sees task → Starts timer → Completes
5. System → Auto-transitions → Next stage
6. Repeat → Through all stages → Final QC
7. Manager → Marks shipped → Shopify updated
```

### Flow 2: Custom Workflow Creation
```
1. Manager → "New Workflow" → Visual builder
2. Drag stages → Connect → Configure each
3. Set triggers → "Use for: Ebony + Auteur"
4. Test run → Preview with sample
5. Activate → System routes matching orders
6. Monitor → Dashboard shows performance
```

### Flow 3: Issue Resolution
```
1. Worker → Spots defect → Photo + description
2. System → Slack post → Database log → Alert
3. Manager → Reviews → Assigns specialist
4. Specialist → Fixes → Logs resolution
5. System → Updates → Notifies worker
6. Work continues → Full audit trail
```

---

## 🎨 **UI/UX EXCELLENCE**

### Our Design Principles
1. **Mobile-First Workers**: Every worker screen phone-optimized
2. **Data-Rich Manager Views**: Dense info without clutter
3. **Progressive Disclosure**: Basic obvious, advanced discoverable
4. **Consistent Patterns**: Same actions everywhere
5. **Delightful Details**: Smooth animations, satisfying feedback

### Key Interfaces

**Manager Dashboard**
- **Header**: Live stats (Orders: 47 | Workers: 12 | Complete: 23)
- **Main**: Kanban board with workflow swimlanes
- **Sidebar**: Filters, worker list, recent issues
- **Footer**: Bulk actions toolbar

**Worker Mobile**
- **Top**: Timer display (always visible)
- **Main**: Current task with context
- **Actions**: 3-4 primary actions max
- **Gesture**: Pull to refresh assignments

**Workflow Builder**
- **Left**: Stage library (drag source)
- **Canvas**: Visual workflow diagram
- **Right**: Selected stage properties
- **Top**: Save, Test, Publish

---

## 🔥 **WHAT MAKES THIS PERFECT FOR US**

### For Our Managers
- **Complete Visibility**: See every order, worker, bottleneck
- **Build Any Workflow**: Handle special editions, custom orders
- **Smart Automation**: Routine tasks handled, control maintained
- **Prevent Problems**: Spot issues before they delay orders

### For Our Workers  
- **Clear Direction**: Always know what's next
- **Natural Time Tracking**: Integrated into work, not separate
- **Quick Communication**: Report issues in seconds
- **See Progress**: Track completions, contributions

### For ZMF Business
- **Scale Smoothly**: Handle growth without chaos
- **Data-Driven**: Know where time goes, what works
- **Quality Built-In**: QC steps, tracking, audit trails
- **Happy Team**: Less frustration, more craft focus

---

## 🚀 **IMPLEMENTATION PRIORITIES**

### Phase 1: Core Flow (Make it Work)
1. Worker task view with timer
2. Basic manager dashboard  
3. Simple workflow (standard headphones)
4. Manual task assignment
5. Basic issue reporting

### Phase 2: Intelligence (Make it Smart)
1. Automated assignment rules
2. Workflow builder UI
3. Batch management
4. Slack integration
5. Real-time updates

### Phase 3: Excellence (Make it Shine)
1. Production analytics
2. Mobile optimization
3. Custom stages for special processes
4. Predictive insights
5. Extended integrations

---

## 💭 **DEVELOPMENT PHILOSOPHY**

This system is about **our people**, not just tasks. Every feature should:
- Remove friction from daily work
- Provide clarity in complex production  
- Automate routine so we focus on craft
- Build trust through transparency

When implementing, always ask:
1. "Will our workers find this intuitive?"
2. "Does this give our managers needed control?"
3. "Will this scale as we grow?"
4. "Does this make work more rewarding?"

---

## 🎸 **ZMF SPECIFIC FEATURES**

### Our Unique Needs
- **Wood Tracking**: Group by wood type for finishing efficiency
- **Acoustic Testing Stage**: Special handling for measurements
- **Customer Communications**: Some orders need approval checkpoints
- **Limited Editions**: Special workflows for unique builds
- **Quality Photos**: Document special finishes and custom work

### Our Workflow Examples

**Standard Headphone**
`Sanding → Finishing → Assembly → Initial QC → Acoustic Testing → Final QC → Packaging → Shipping`


**Cable/Accessory**
`Preparation → Assembly → Testing → Packaging → Shipping`

---


### New Core Business Requirements
- **Customizable Workflows**: Managers can build workflows with automatic or manual task generation ✅
- **Workflow Builder**: Visual interface for managers to create/edit production workflows 🔄
- **Batch Time Tracking**: Log time against groups of products (by model/wood type) ✅
- **Issue Reporting**: Capture and escalate production issues to Slack ✅
- **Flexible Stage Dependencies**: Support both sequential and parallel workflows ✅
- **Production Analytics**: Track bottlenecks and efficiency by stage 🔄

### New Success Criteria
- Managers can create custom workflows without developer intervention ✅
- Support for both automated and manual task assignment ✅
- Workers can log time against batches of products ✅
- Issues post to Slack with context and photos ✅ (API ready, Slack integration pending)
- Managers see real-time production flow visualization 🔄
- Stage transitions are tracked with timestamps ✅

---

## 🎯 **IMPLEMENTATION STATUS**

### ✅ **COMPLETED (v2.0)**

#### Database Schema
- **Extended work_tasks table** with v2.0 columns (batch_id, stage, auto_generated, etc.)
- **New tables created**: workflow_templates, work_batches, time_logs, stage_transitions, production_issues, worker_stage_assignments, workflow_execution_log, custom_stages
- **RLS enabled on all tables** (critical security fix)
- **Comprehensive RLS policies** for role-based access control
- **Performance indexes** added for optimal query performance
- **Data migration** from existing work_logs to enhanced time_logs table
- **Default workflow template** created: "Standard Headphone Build"
- **Worker stage assignments** populated from existing skills
- **Realtime subscriptions** enabled for new tables

#### API Endpoints
- **GET/POST /api/workflows** - List and create workflow templates
- **GET/POST /api/batches** - List and create work batches
- **POST /api/batches/[id]/transition** - Move batches between stages
- **POST/POST /api/time/start** - Start time tracking for tasks/batches
- **POST /api/time/stop** - Stop active timers
- **GET /api/time/current/[workerId]** - Get worker's active timer
- **GET /api/time/batch/[batchId]** - Get time logs for a batch
- **GET/POST /api/stages/custom** - Manage custom stages
- **GET /api/stages/all** - Get all available stages (standard + custom)
- **POST /api/issues/report** - Create and report production issues
- **POST /api/issues/[id]/resolve** - Resolve production issues  
- **GET /api/issues/by-stage/[stage]** - Get issues filtered by stage

#### Features
- **Workflow system** with customizable stage definitions
- **Batch management** for grouping order items
- **Enhanced time tracking** supporting both task and batch-level timing
- **Production issue reporting** with severity levels and stage context
- **Custom stage creation** for managers
- **Stage transition tracking** with audit trails
- **Role-based permissions** (workers, supervisors, managers)

### 🔄 **IN PROGRESS**

#### API Endpoints (Remaining)
- **PUT /api/workflows/[id]** - Update existing workflows
- **POST /api/workflows/[id]/duplicate** - Clone workflow templates
- **GET /api/workflows/[id]/preview** - Preview workflow with sample data
- **POST /api/batches/[id]/assign-workflow** - Assign workflow to existing batch
- **POST /api/batches/[id]/generate-tasks** - Manually generate tasks for current stage

#### UI Components (Not Started)
- **Manager: Workflow Builder** - Visual workflow designer with drag-and-drop
- **Manager: Production Flow Board** - Enhanced with workflow visibility
- **Manager: Workflow Analytics** - Performance comparison and bottleneck analysis
- **Worker: Enhanced Task View** - Shows workflow context and progress
- **Worker: Issue Reporting Modal** - Enhanced with workflow context

#### Integrations (Not Started)
- **Slack Integration** - Auto-posting issues with workflow context
- **Automation Rules Engine** - Conditional workflow automation
- **Workflow Analytics Dashboard** - Real-time performance metrics

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
  CUSTOM = 'custom'                  // Allow custom stages ✅
}

interface StageDefinition {
  stage: string                      // Can be enum value or custom ✅
  name: string                       // ✅
  description: string                // ✅
  estimated_hours: number           // ✅
  required_skills: string[]         // ✅
  is_optional: boolean              // ✅
  is_automated: boolean             // ✅ Auto-create tasks or manual
  auto_assign_rule?: 'least_busy' | 'round_robin' | 'specific_worker' | 'manual' // 🔄
  next_stages: string[]             // ✅ Can branch to multiple
  completion_criteria?: string[]    // 🔄
  custom_fields?: Record<string, any> // 🔄
}

interface WorkflowTemplate {         // ✅ Implemented
  id: string
  name: string
  description: string
  created_by: string
  is_active: boolean
  trigger_rules: {
    product_matches?: {              // 🔄 Which products use this workflow
      model?: string[]
      wood_type?: string[]
      sku_pattern?: string
      custom_rules?: any
    }
    manual_only?: boolean           // ✅ Only apply when manually selected
  }
  stages: StageDefinition[]         // ✅
  stage_transitions: {              // ✅
    from_stage: string
    to_stage: string[]
    condition?: 'all_complete' | 'any_complete' | 'manual_approval'
    auto_transition: boolean
  }[]
}
```

---

## 🗄️ **DATABASE SCHEMA UPDATES** ✅

### Existing Tables Modified ✅

```sql
-- 1. UPDATE work_tasks table (add new columns for v2.0) ✅
ALTER TABLE work_tasks 
ADD COLUMN batch_id UUID,
ADD COLUMN stage TEXT,
ADD COLUMN auto_generated BOOLEAN DEFAULT false,
ADD COLUMN depends_on_task_ids UUID[],
ADD COLUMN manual_assignment BOOLEAN DEFAULT false,
ADD COLUMN workflow_template_id UUID;

-- Remove strict task_type constraint to allow custom stages ✅
ALTER TABLE work_tasks DROP CONSTRAINT work_tasks_task_type_check;
ALTER TABLE work_tasks ADD CONSTRAINT work_tasks_stage_or_type_check 
CHECK (task_type IS NOT NULL OR stage IS NOT NULL);

-- 2. ENHANCE work_logs table (rename to time_logs and add batch support) ✅
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

-- Migrate existing work_logs data ✅
-- (Data migration completed successfully)
```

### New Tables Added ✅

```sql
-- 1. Workflow Templates table ✅
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

-- 2. Work Batches table ✅
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

-- 3. Stage Transitions table ✅
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

-- 4. Production Issues table ✅
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

-- 5. Worker Stage Assignments table ✅
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

-- 6. Workflow Execution Log ✅
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

-- 7. Custom Stage Definitions ✅
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

-- Indexes for performance ✅
-- (All indexes created successfully)

-- Enable real-time for new tables ✅
-- (Realtime enabled for all new tables)
```

### RLS Policies for New Tables ✅

```sql
-- Enable RLS on new tables ✅
-- (All RLS policies implemented successfully)
```

---

## 🔧 **API ENDPOINTS**

### ✅ Workflow Management Endpoints (Implemented)
```typescript
// GET /api/workflows ✅
// List all workflow templates

// POST /api/workflows ✅
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

// 🔄 PUT /api/workflows/{id}
// Update workflow template

// 🔄 POST /api/workflows/{id}/duplicate
// Clone a workflow template

// 🔄 GET /api/workflows/{id}/preview
// Preview workflow with sample data
```

### ✅ Batch Management Endpoints (Implemented)
```typescript
// POST /api/batches ✅
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

// 🔄 POST /api/batches/{id}/assign-workflow
// Assign or change workflow for batch
{
  workflow_template_id: string
  start_at_stage?: string  // Optional - start at specific stage
}

// POST /api/batches/{id}/transition ✅
// Move batch to next stage (manual or auto)
{
  to_stage: string
  notes?: string
  transition_type: 'auto' | 'manual'
  create_tasks?: boolean
  auto_assign?: boolean
}

// 🔄 POST /api/batches/{id}/generate-tasks
// Manually generate tasks for current stage
{
  auto_assign: boolean
  assignment_rule?: 'least_busy' | 'round_robin' | 'specific_worker'
  specific_worker_id?: string
}
```

### ✅ Time Tracking Endpoints (Implemented)
```typescript
// POST /api/time/start ✅
// Start timing for task or batch
{
  task_id?: string
  batch_id?: string
  stage: string
}

// POST /api/time/stop ✅
// Stop current timer
{
  time_log_id: string
  notes?: string
}

// GET /api/time/current/{worker_id} ✅
// Get worker's active timer

// GET /api/time/batch/{batch_id} ✅
// Get all time logs for a batch
```

### ✅ Issue Reporting Endpoints (Implemented)
```typescript
// POST /api/issues/report ✅
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

// POST /api/issues/{id}/resolve ✅
// Mark issue as resolved
{
  resolution_notes: string
  resolution_status: 'resolved' | 'wont_fix'
}

// GET /api/issues/by-stage/{stage} ✅
// Get issues for specific stage
```

### ✅ Custom Stage Management (Implemented)
```typescript
// GET /api/stages/custom ✅
// List all custom stages

// POST /api/stages/custom ✅
// Create custom stage
{
  stage_code: string
  stage_name: string
  description: string
  default_estimated_hours: number
  required_skills: string[]
}

// GET /api/stages/all ✅
// Get both standard and custom stages
```

---

## 📱 **UI COMPONENTS** 🔄

### 🔄 Manager: Workflow Builder (Not Started)
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

### 🔄 Manager: Production Flow Board (Not Started)
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

### 🔄 Manager: Workflow Analytics (Not Started)
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

### 🔄 Worker: Enhanced Task View (Not Started)
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

### 🔄 Worker: Issue Reporting Modal (Not Started)
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

## 🔌 **SLACK INTEGRATION** 🔄

### Enhanced Slack Features (API Ready, Integration Pending)
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

// Issue posting includes workflow context ✅ (API ready)
// Workflow completion notifications 🔄
// Stage bottleneck alerts 🔄
```

---

## 🤖 **AUTOMATION RULES ENGINE** 🔄

### Workflow Automation Configuration (Design Complete, Implementation Pending)
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

### Default Automation Behaviors ✅
1. **Flexible Stage Completion**: Configurable per workflow ✅
2. **Smart Assignment**: Based on workload, skills, and availability 🔄
3. **Conditional Branching**: Different paths based on product attributes 🔄
4. **Manual Override**: Any automation can be paused or overridden ✅
5. **Notification Rules**: Customizable alerts and escalations 🔄

---

## 🏃 **MIGRATION STRATEGY** ✅

### Database Migration Steps ✅
```sql
-- 1. Create workflow_templates from any existing patterns ✅
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

-- 2. Migrate existing data ✅
UPDATE work_tasks 
SET stage = COALESCE(stage, task_type),
    manual_assignment = true
WHERE stage IS NULL;

-- 3. Create worker stage assignments from skills ✅
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

## 📊 **PERFORMANCE CONSIDERATIONS** ✅

### Query Optimization ✅
```sql
-- Workflow execution metrics view 🔄
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

## 🔐 **SECURITY ENHANCEMENTS** ✅

### Workflow Security ✅
- Only managers can create/edit workflows ✅
- Workflow changes are audit logged ✅
- Workers cannot override automation rules ✅
- Sensitive workflows can be restricted to specific managers ✅

### API Rate Limiting 🔄
- Workflow creation: 10 per hour per manager
- Batch operations: 100 per minute
- Issue reporting: 5 per minute per worker
- Automation triggers: 1000 per hour total

---

## 📈 **SUCCESS METRICS** 🔄

### Key Performance Indicators
- **Workflow Efficiency**: Time reduction per workflow type
- **Automation Rate**: % of tasks auto-assigned vs manual
- **Workflow Adoption**: Number of custom workflows created
- **Manual Intervention**: Frequency and duration
- **Error Rates**: Failed automations by workflow

### Monitoring Dashboard 🔄
- Workflow performance comparison
- Automation success/failure rates
- Manual intervention patterns
- Custom stage usage statistics
- Workflow modification history

---

## 🔄 **BACKWARD COMPATIBILITY** ✅

### Maintaining v1.0 Functionality ✅
- All existing endpoints continue to work ✅
- Default workflow created for existing data ✅
- Manual assignment remains available ✅
- Progressive enhancement approach ✅

### Feature Flags 🔄
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

## 🎯 **NEXT DEVELOPMENT PRIORITIES**

### ✅ Phase 1: Complete API Layer (COMPLETED!)
1. **Workflow API endpoints** ✅:
   - PUT /api/workflows/[id] (update workflows) ✅
   - POST /api/workflows/[id]/duplicate (clone workflows) ✅
   - GET /api/workflows/[id]/preview (preview with sample data) ✅

2. **Batch API endpoints** ✅:
   - POST /api/batches/[id]/assign-workflow ✅
   - POST /api/batches/[id]/generate-tasks ✅

**Total: 18 API endpoints completed!** 🚀

### Phase 2: UI Components 🔄
1. **Manager Workflow Builder** - Visual workflow designer ✅ COMPLETED!
   - ✅ Drag-and-drop stage library with 8 standard stages
   - ✅ Visual workflow canvas with horizontal flow design
   - ✅ Stage configuration dialog (automation, timing, skills)
   - ✅ Real-time workflow statistics (automation %, total hours)
   - ✅ Workflow preview with sample data and recommendations
   - ✅ Full CRUD operations (create, edit, duplicate, activate/deactivate)
   - ✅ Beautiful modern UI with cards, badges, and smooth animations

2. **Enhanced Production Flow Board** - With workflow context 🔄
3. **Worker Task View Enhancement** - Show workflow progress 🔄
4. **Issue Reporting Modal** - With workflow context 🔄

### Phase 3: Advanced Features 🔄  
1. **Slack Integration** - Auto-post issues and notifications
2. **Automation Rules Engine** - Conditional workflow automation
3. **Workflow Analytics Dashboard** - Performance metrics and bottlenecks
4. **Advanced Assignment Logic** - Load balancing and skill-based routing

### Phase 4: Polish & Optimization 🔄
1. **Performance monitoring** - Query optimization and caching
2. **Advanced workflows** - Parallel processing and conditional branches
3. **Mobile responsiveness** - Touch-optimized workflow interfaces
4. **Comprehensive testing** - End-to-end workflow validation

---

**This specification documents the current implementation status of v2.0 with a flexible workflow system that supports both automated and manual processes, allowing managers to build custom workflows without developer intervention. The foundation is solid with comprehensive API coverage and database schema complete. UI development is the next major milestone.**

**Let's build our perfect production system! 🎸🎨✨**
