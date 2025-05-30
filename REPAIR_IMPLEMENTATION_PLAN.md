# ZMF Repair System Implementation Plan

## Overview
This plan outlines the integration of the v0 repair system into the existing ZMF Worker Dashboard. The repair system will leverage existing infrastructure while adding new repair-specific functionality.

**NOTE:** There are already some basic repair components in the codebase (repair-intake.tsx, repair-detail.tsx, technician-interface.tsx) with a dark theme. The v0 system has a more comprehensive feature set with better UX. We'll need to either:
- Replace the existing components entirely with the v0 system
- Merge the best features from both systems
- Keep both and use the v0 system as "Repair System v2"

## Current System Analysis

### Existing Infrastructure We Can Leverage:
- **Authentication**: Workers table with role-based access
- **Orders System**: Orders and order_items tables for repair source tracking
- **Time Tracking**: Existing time_logs table and patterns
- **Notifications**: notification_queue and preferences
- **Quality System**: Quality patterns and QC workflows
- **Logging**: Application logs with context tracking
- **UI Components**: Existing shadcn/ui components
- **Navigation**: Worker and manager navigation systems

### What's Missing:
- Repair-specific database tables
- Repair tracking workflows
- Customer communication features
- Repair knowledge database
- Repair-specific AI assistant

## Database Schema Design

### New Tables Required:

```sql
-- 1. repair_orders - Main repair tracking table
CREATE TABLE repair_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_number TEXT UNIQUE NOT NULL, -- REP-YYYY-####
  repair_source TEXT CHECK (repair_source IN ('customer', 'internal')),
  order_type TEXT CHECK (order_type IN ('customer_return', 'warranty', 'internal_qc')),
  original_order_id UUID REFERENCES orders(id),
  original_order_number TEXT,
  
  -- Customer info
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  
  -- Product info
  model TEXT NOT NULL,
  serial_number TEXT,
  wood_type TEXT,
  
  -- Status tracking
  status TEXT CHECK (status IN ('intake', 'diagnosed', 'approved', 'in_progress', 'testing', 'completed', 'shipped')),
  priority TEXT CHECK (priority IN ('standard', 'rush')) DEFAULT 'standard',
  repair_type TEXT CHECK (repair_type IN ('production', 'finishing', 'sonic')),
  location TEXT, -- Physical location of item
  
  -- Financials
  estimated_cost DECIMAL(10,2),
  final_cost DECIMAL(10,2),
  customer_approved BOOLEAN DEFAULT false,
  
  -- Assignment and timing
  assigned_to UUID REFERENCES workers(id),
  received_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  diagnosed_date TIMESTAMPTZ,
  approved_date TIMESTAMPTZ,
  started_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  shipped_date TIMESTAMPTZ,
  
  -- Metadata
  customer_note TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES workers(id)
);

-- 2. repair_issues - Specific issues found
CREATE TABLE repair_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_order_id UUID REFERENCES repair_orders(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  specific_issue TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('cosmetic', 'functional', 'critical')),
  discovered_by UUID REFERENCES workers(id),
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. repair_actions - Work performed
CREATE TABLE repair_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_order_id UUID REFERENCES repair_orders(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_description TEXT NOT NULL,
  performed_by UUID REFERENCES workers(id),
  time_spent_minutes INTEGER,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. repair_parts_used - Parts tracking
CREATE TABLE repair_parts_used (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_action_id UUID REFERENCES repair_actions(id) ON DELETE CASCADE,
  part_name TEXT NOT NULL,
  part_number TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. repair_photos - Photo storage references
CREATE TABLE repair_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_order_id UUID REFERENCES repair_orders(id) ON DELETE CASCADE,
  photo_type TEXT CHECK (photo_type IN ('intake', 'diagnosis', 'before', 'after', 'completed')),
  storage_path TEXT NOT NULL,
  caption TEXT,
  uploaded_by UUID REFERENCES workers(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. repair_time_logs - Detailed time tracking
CREATE TABLE repair_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_order_id UUID REFERENCES repair_orders(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES workers(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  work_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. repair_knowledge_base - AI knowledge database
CREATE TABLE repair_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_order_id UUID REFERENCES repair_orders(id),
  model TEXT NOT NULL,
  issue_category TEXT NOT NULL,
  issue_description TEXT NOT NULL,
  solution_description TEXT NOT NULL,
  technician_id UUID REFERENCES workers(id),
  technician_name TEXT,
  time_to_repair_minutes INTEGER,
  parts_used JSONB,
  success_rate DECIMAL(3,2), -- 0.00 to 1.00
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. repair_notifications - Customer communication log
CREATE TABLE repair_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_order_id UUID REFERENCES repair_orders(id) ON DELETE CASCADE,
  notification_type TEXT CHECK (notification_type IN ('intake_confirmation', 'diagnosis_complete', 'approval_required', 'work_started', 'completed', 'shipped')),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes:
```sql
CREATE INDEX idx_repair_orders_status ON repair_orders(status);
CREATE INDEX idx_repair_orders_assigned_to ON repair_orders(assigned_to);
CREATE INDEX idx_repair_orders_repair_number ON repair_orders(repair_number);
CREATE INDEX idx_repair_orders_customer_email ON repair_orders(customer_email);
CREATE INDEX idx_repair_issues_repair_order_id ON repair_issues(repair_order_id);
CREATE INDEX idx_repair_actions_repair_order_id ON repair_actions(repair_order_id);
CREATE INDEX idx_repair_knowledge_base_model_category ON repair_knowledge_base(model, issue_category);
```

### RLS Policies:
```sql
-- Workers can see all repairs
CREATE POLICY "Workers can view all repairs" ON repair_orders
  FOR SELECT USING (auth.uid() IN (SELECT auth_user_id FROM workers WHERE active = true));

-- Workers can create repairs
CREATE POLICY "Workers can create repairs" ON repair_orders
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT auth_user_id FROM workers WHERE active = true));

-- Workers can update repairs
CREATE POLICY "Workers can update repairs" ON repair_orders
  FOR UPDATE USING (auth.uid() IN (SELECT auth_user_id FROM workers WHERE active = true));

-- Similar policies for other tables...
```

## Implementation Phases

### Phase 1: Database & API Layer (Week 1)
1. **Create database migrations**
   - [ ] Create all repair tables with proper relationships
   - [ ] Add indexes and RLS policies
   - [ ] Create database functions for repair number generation
   - [ ] Add triggers for updated_at timestamps

2. **Build API routes**
   - [ ] `/api/repairs` - CRUD operations for repairs
   - [ ] `/api/repairs/[id]/issues` - Manage repair issues
   - [ ] `/api/repairs/[id]/actions` - Track repair actions
   - [ ] `/api/repairs/[id]/photos` - Photo upload/management
   - [ ] `/api/repairs/[id]/time` - Time tracking
   - [ ] `/api/repairs/knowledge` - Knowledge base queries
   - [ ] `/api/repairs/stats` - Repair analytics

### Phase 2: Core UI Components (Week 2)
1. **Adapt v0 components to existing patterns**
   - [ ] Update imports to use existing UI components
   - [ ] Replace mock context with real Supabase queries
   - [ ] Integrate with existing auth/worker system
   - [ ] Add proper error handling and loading states
   - [ ] Implement proper form validation with Zod

2. **Key components to implement**
   - [ ] RepairDashboard (manager view)
   - [ ] RepairIntakeForm
   - [ ] RepairWorkPage (worker view)
   - [ ] RepairDetail
   - [ ] QCSection integration
   - [ ] RepairKnowledgeSearch

### Phase 3: Navigation & Routing (Week 2)
1. **Manager side**
   - [ ] Add "Repairs" section to manager navigation
   - [ ] Create `/manager/repairs` dashboard
   - [ ] Add `/manager/repairs/new` for intake
   - [ ] Add `/manager/repairs/[id]` for details

2. **Worker side**
   - [ ] Add "Repairs" to worker navigation
   - [ ] Create `/worker/repairs` for assigned repairs
   - [ ] Add `/worker/repairs/[id]` for work page

### Phase 4: Integration Features (Week 3)
1. **Connect to existing systems**
   - [ ] Link repairs to original orders
   - [ ] Integrate with existing time tracking
   - [ ] Use notification system for customer emails
   - [ ] Add repair events to application logs
   - [ ] Integrate with quality checkpoint system

2. **Photo management**
   - [ ] Implement photo upload to Supabase storage
   - [ ] Create photo gallery component
   - [ ] Add photo compression/optimization

3. **AI Knowledge Base**
   - [ ] Build knowledge base search API
   - [ ] Implement AI query interface
   - [ ] Create knowledge contribution flow

### Phase 5: Advanced Features (Week 4)
1. **Slack integration**
   - [ ] Use existing slack_configurations table
   - [ ] Implement repair question posting
   - [ ] Add repair notifications to Slack

2. **Customer communication**
   - [ ] Email templates for each repair stage
   - [ ] Customer portal for repair tracking
   - [ ] SMS notification option

3. **Analytics & Reporting**
   - [ ] Repair turnaround time metrics
   - [ ] Common issue analysis
   - [ ] Technician performance metrics
   - [ ] Cost analysis reports

## Migration Strategy

### Step 1: Start with new repairs only
- Deploy repair system for new repairs
- Don't migrate historical data initially
- Test with internal repairs first

### Step 2: Gradual rollout
1. Week 1-2: Internal QC repairs only
2. Week 3-4: Warranty repairs
3. Week 5+: All customer repairs

### Step 3: Training
- Create repair workflow documentation
- Train repair technicians on new system
- Create video tutorials for common tasks

## Technical Considerations

### State Management
- Use React Query for server state
- Keep repair context minimal (current repair only)
- Leverage existing query patterns from production system

### Performance
- Implement pagination for repair lists
- Use virtual scrolling for large lists
- Optimize photo loading with lazy loading
- Cache knowledge base queries

### Security
- All repairs require authenticated worker
- Managers can see all repairs
- Workers can only edit assigned repairs
- Customer data encrypted at rest

### Monitoring
- Log all repair state transitions
- Track API performance
- Monitor photo storage usage
- Alert on stuck repairs (>X days in status)

## File Structure
```
src/
├── app/
│   ├── api/
│   │   └── repairs/
│   │       ├── route.ts
│   │       ├── [id]/
│   │       │   ├── route.ts
│   │       │   ├── issues/route.ts
│   │       │   ├── actions/route.ts
│   │       │   ├── photos/route.ts
│   │       │   └── time/route.ts
│   │       ├── knowledge/route.ts
│   │       └── stats/route.ts
│   ├── manager/
│   │   └── repairs/
│   │       ├── page.tsx
│   │       ├── new/page.tsx
│   │       └── [id]/page.tsx
│   └── worker/
│       └── repairs/
│           ├── page.tsx
│           └── [id]/page.tsx
├── components/
│   └── repairs/
│       ├── repair-dashboard.tsx
│       ├── repair-intake-form.tsx
│       ├── repair-work-page.tsx
│       ├── repair-detail.tsx
│       ├── repair-knowledge-search.tsx
│       └── repair-photo-gallery.tsx
└── lib/
    └── repairs/
        ├── queries.ts
        ├── mutations.ts
        └── utils.ts
```

## Success Metrics
- Average repair turnaround time < 5 days
- First-time fix rate > 90%
- Customer satisfaction > 4.5/5
- Knowledge base hit rate > 70%
- Photo documentation rate = 100%

## Next Steps
1. Review plan with team
2. Create Supabase migrations
3. Start with Phase 1 implementation
4. Set up development testing environment
5. Create initial API routes

## Key Advantages of v0 System
The v0 repair system offers several improvements over the existing basic repair components:

1. **Comprehensive Workflow**: Complete repair lifecycle from intake to completion
2. **AI Integration**: Knowledge base with repair solutions and AI assistant
3. **Better Time Tracking**: Integrated timer with pause/resume functionality
4. **Enhanced Communication**: Customer notes, Slack integration, email templates
5. **Photo Management**: Organized photo upload with categories (before/after/diagnosis)
6. **Location Tracking**: Physical location management for repair items
7. **Analytics Ready**: Built with metrics and reporting in mind
8. **Worker Experience**: Fun touches like the flexing man animation and zen completion
9. **Repair Types**: Support for production, finishing, and sonic repairs
10. **Priority System**: Rush vs standard priority with visual indicators