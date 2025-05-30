# ZMF Repair System Implementation Guide - CLAUDE Rules

You are implementing a comprehensive repair tracking system for ZMF headphones TODAY. This is an internal system that needs to be built, tested, and deployed by end of day. You have full access to create database tables, API routes, and UI components.

## CRITICAL: Today's Implementation Timeline

**Morning (4 hours)**
1. Database schema creation and migrations
2. Core API routes for CRUD operations
3. Basic repair intake and listing

**Afternoon (4 hours)**
1. Worker repair interface with timer
2. Integration with existing systems
3. Testing and deployment

## Core Technology Stack (EXISTING)

**Frontend & Framework:**
- Next.js 15.3.2 with App Router (NEVER use Pages Router)
- TypeScript 5 for all code
- Tailwind CSS v4 with shadcn/ui components
- React 18.2.0 with Server Components by default

**Backend & Database:**
- Supabase with PostgreSQL + Row Level Security (RLS)
- Existing auth system with workers table
- Existing time_logs, notifications, orders tables
- Application logging system already in place

**Key Patterns to Follow:**
- Authentication: `await createClient()` then `getUser()` (NEVER getSession)
- Always check worker.active status
- Log all API operations with ApiLogger
- Use existing UI components from shadcn/ui

## Implementation Order (FOLLOW EXACTLY)

### Phase 1: Database Setup (1 hour)

Create these tables in order:

```sql
-- 1. Main repair orders table
CREATE TABLE repair_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_number TEXT UNIQUE NOT NULL, -- REP-YYYY-####
  
  -- Source tracking
  repair_source TEXT CHECK (repair_source IN ('customer', 'internal')) NOT NULL,
  order_type TEXT CHECK (order_type IN ('customer_return', 'warranty', 'internal_qc')) NOT NULL,
  original_order_id UUID REFERENCES orders(id),
  original_order_number TEXT,
  
  -- Customer info
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  
  -- Product details
  model TEXT NOT NULL,
  serial_number TEXT,
  wood_type TEXT,
  
  -- Status and workflow
  status TEXT CHECK (status IN ('intake', 'diagnosed', 'approved', 'in_progress', 'testing', 'completed', 'shipped')) DEFAULT 'intake',
  priority TEXT CHECK (priority IN ('standard', 'rush')) DEFAULT 'standard',
  repair_type TEXT CHECK (repair_type IN ('production', 'finishing', 'sonic')) NOT NULL,
  location TEXT, -- Physical location
  
  -- Assignment and dates
  assigned_to UUID REFERENCES workers(id),
  received_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_date TIMESTAMPTZ,
  
  -- Notes
  customer_note TEXT,
  internal_notes TEXT,
  
  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES workers(id) NOT NULL
);

-- 2. Issues tracking
CREATE TABLE repair_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_order_id UUID REFERENCES repair_orders(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  specific_issue TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('cosmetic', 'functional', 'critical')),
  discovered_by UUID REFERENCES workers(id),
  discovered_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Actions taken
CREATE TABLE repair_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_order_id UUID REFERENCES repair_orders(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_description TEXT NOT NULL,
  performed_by UUID REFERENCES workers(id),
  time_spent_minutes INTEGER,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Parts used
CREATE TABLE repair_parts_used (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_action_id UUID REFERENCES repair_actions(id) ON DELETE CASCADE,
  part_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_cost DECIMAL(10,2)
);

-- 5. Time tracking
CREATE TABLE repair_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_order_id UUID REFERENCES repair_orders(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES workers(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  work_description TEXT
);

-- 6. Photos
CREATE TABLE repair_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_order_id UUID REFERENCES repair_orders(id) ON DELETE CASCADE,
  photo_type TEXT CHECK (photo_type IN ('intake', 'diagnosis', 'before', 'after', 'completed')),
  storage_path TEXT NOT NULL,
  caption TEXT,
  uploaded_by UUID REFERENCES workers(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Knowledge base
CREATE TABLE repair_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_order_id UUID REFERENCES repair_orders(id),
  model TEXT NOT NULL,
  issue_category TEXT NOT NULL,
  issue_description TEXT NOT NULL,
  solution_description TEXT NOT NULL,
  technician_name TEXT,
  time_to_repair_minutes INTEGER,
  success_rate DECIMAL(3,2),
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_repair_orders_status ON repair_orders(status);
CREATE INDEX idx_repair_orders_assigned_to ON repair_orders(assigned_to);
CREATE INDEX idx_repair_orders_repair_number ON repair_orders(repair_number);
CREATE INDEX idx_repair_knowledge_base_model_category ON repair_knowledge_base(model, issue_category);

-- Enable RLS
ALTER TABLE repair_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_parts_used ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_knowledge_base ENABLE ROW LEVEL SECURITY;

-- RLS Policies (workers can see/edit all repairs)
CREATE POLICY "Workers can view all repairs" ON repair_orders
  FOR SELECT USING (auth.uid() IN (SELECT auth_user_id FROM workers WHERE active = true));

CREATE POLICY "Workers can create repairs" ON repair_orders
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT auth_user_id FROM workers WHERE active = true));

CREATE POLICY "Workers can update repairs" ON repair_orders
  FOR UPDATE USING (auth.uid() IN (SELECT auth_user_id FROM workers WHERE active = true));

-- Similar policies for other tables...

-- Function to generate repair numbers
CREATE OR REPLACE FUNCTION generate_repair_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  sequence_number INTEGER;
  new_repair_number TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(repair_number FROM 10) AS INTEGER)), 0) + 1
  INTO sequence_number
  FROM repair_orders
  WHERE repair_number LIKE 'REP-' || year_part || '-%';
  
  new_repair_number := 'REP-' || year_part || '-' || LPAD(sequence_number::TEXT, 4, '0');
  
  RETURN new_repair_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_repair_orders_updated_at BEFORE UPDATE ON repair_orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Phase 2: Core API Routes (1.5 hours)

Create these API routes in order:

1. **POST /api/repairs** - Create new repair
```typescript
// src/app/api/repairs/route.ts
import { createClient } from '@/lib/supabase/server'
import { ApiLogger } from '@/lib/api-logger'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const CreateRepairSchema = z.object({
  orderNumber: z.string().optional(),
  customerName: z.string(),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  model: z.string(),
  serialNumber: z.string().optional(),
  woodType: z.string().optional(),
  repairType: z.enum(['production', 'finishing', 'sonic']),
  priority: z.enum(['standard', 'rush']).default('standard'),
  repairSource: z.enum(['customer', 'internal']),
  orderType: z.enum(['customer_return', 'warranty', 'internal_qc']),
  customerNote: z.string().optional(),
  issues: z.array(z.object({
    category: z.string(),
    specificIssue: z.string(),
    severity: z.enum(['cosmetic', 'functional', 'critical'])
  }))
})

export async function POST(request: NextRequest) {
  const logContext = ApiLogger.logRequest(request)
  
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      ApiLogger.logResponse(logContext, response, 'Unauthorized attempt')
      return response
    }
    
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.active) {
      const response = NextResponse.json({ error: 'Worker not active' }, { status: 403 })
      ApiLogger.logResponse(logContext, response, 'Inactive worker')
      return response
    }
    
    const body = await request.json()
    const validatedData = CreateRepairSchema.parse(body)
    
    // Generate repair number
    const { data: repairNumber } = await supabase
      .rpc('generate_repair_number')
      .single()
    
    // Create repair order
    const { data: repair, error: repairError } = await supabase
      .from('repair_orders')
      .insert({
        repair_number: repairNumber,
        repair_source: validatedData.repairSource,
        order_type: validatedData.orderType,
        original_order_number: validatedData.orderNumber,
        customer_name: validatedData.customerName,
        customer_email: validatedData.customerEmail,
        customer_phone: validatedData.customerPhone,
        model: validatedData.model,
        serial_number: validatedData.serialNumber,
        wood_type: validatedData.woodType,
        repair_type: validatedData.repairType,
        priority: validatedData.priority,
        customer_note: validatedData.customerNote,
        created_by: worker.id
      })
      .select()
      .single()
    
    if (repairError) throw repairError
    
    // Create issues
    if (validatedData.issues.length > 0) {
      const { error: issuesError } = await supabase
        .from('repair_issues')
        .insert(
          validatedData.issues.map(issue => ({
            repair_order_id: repair.id,
            category: issue.category,
            specific_issue: issue.specificIssue,
            severity: issue.severity,
            discovered_by: worker.id
          }))
        )
      
      if (issuesError) throw issuesError
    }
    
    const response = NextResponse.json({ success: true, repair })
    ApiLogger.logResponse(logContext, response, `Created repair ${repair.repair_number}`)
    return response
    
  } catch (error) {
    const response = NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create repair' },
      { status: 500 }
    )
    ApiLogger.logResponse(logContext, response, 'Failed to create repair')
    return response
  }
}
```

2. **GET /api/repairs** - List repairs with filters
3. **GET /api/repairs/[id]** - Get repair details
4. **PATCH /api/repairs/[id]** - Update repair status
5. **POST /api/repairs/[id]/time/start** - Start timer
6. **POST /api/repairs/[id]/time/stop** - Stop timer
7. **POST /api/repairs/[id]/actions** - Add repair action
8. **POST /api/repairs/[id]/photos** - Upload photos

### Phase 3: UI Implementation (3 hours)

1. **Manager Dashboard** (`/manager/repairs/page.tsx`)
   - Use the v0 repair-dashboard.tsx as base
   - Connect to real API endpoints
   - Add to manager navigation

2. **Repair Intake** (`/manager/repairs/new/page.tsx`)
   - Use the v0 repair-intake-form.tsx
   - Add form validation with Zod
   - Connect to POST /api/repairs

3. **Worker Repair Page** (`/worker/repairs/[id]/page.tsx`)
   - Use the v0 repair-work-page.tsx
   - Implement real timer functionality
   - Connect to time tracking APIs

4. **Navigation Updates**
   - Add "Repairs" to manager navigation
   - Add "Repairs" to worker navigation (when show all is enabled)

### Phase 4: Integration & Testing (1.5 hours)

1. **Integrate with existing systems:**
   - Link repairs to orders table
   - Use existing time_logs patterns
   - Connect to notification system
   - Add repair events to application_logs

2. **Test critical flows:**
   - Create repair from manager
   - Assign to worker
   - Start/stop timer
   - Complete repair
   - View repair history

3. **Deploy:**
   - Run migrations in production
   - Deploy to Vercel
   - Test in production

## Code Patterns to Follow

### API Route Pattern
```typescript
export async function POST(request: NextRequest) {
  const logContext = ApiLogger.logRequest(request)
  
  try {
    // 1. Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return unauthorized()
    
    // 2. Worker validation
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.active) return forbidden()
    
    // 3. Input validation
    const body = await request.json()
    const validated = Schema.parse(body)
    
    // 4. Business logic
    const result = await performOperation(validated)
    
    // 5. Success response
    const response = NextResponse.json(result)
    ApiLogger.logResponse(logContext, response, 'Success message')
    return response
    
  } catch (error) {
    // 6. Error handling
    logError(error as Error, 'REPAIR_SYSTEM', { request })
    const response = NextResponse.json({ error: 'Failed' }, { status: 500 })
    ApiLogger.logResponse(logContext, response, 'Error message')
    return response
  }
}
```

### Component Pattern
```typescript
// Server Component (default)
export default async function RepairDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')
  
  const { data: repairs } = await supabase
    .from('repair_orders')
    .select(`
      *,
      assigned_to:workers(name),
      issues:repair_issues(*)
    `)
    .order('created_at', { ascending: false })
  
  return <RepairDashboardClient repairs={repairs} />
}

// Client Component (only when needed)
'use client'
export function RepairDashboardClient({ repairs }: Props) {
  // Interactive UI here
}
```

## Critical Requirements

1. **Use existing infrastructure** - Don't recreate auth, workers, logging
2. **Follow existing patterns** - Match the codebase style exactly
3. **Log everything** - Use ApiLogger for all API routes
4. **Test as you go** - Don't wait until the end
5. **Deploy incrementally** - Get basics working first

## Testing Checklist

- [ ] Can create a repair from manager dashboard
- [ ] Repair gets unique number (REP-2025-0001)
- [ ] Can view all repairs in dashboard
- [ ] Can assign repair to worker
- [ ] Worker can see assigned repairs
- [ ] Timer starts/stops correctly
- [ ] Time is saved to database
- [ ] Can complete repair
- [ ] Status updates work
- [ ] Photos can be uploaded

## Common Issues & Solutions

**Issue**: "Worker not found"
**Solution**: Ensure worker is active and has auth_user_id set

**Issue**: "RLS policy violation"
**Solution**: Check that policies allow workers to access repairs

**Issue**: "Timer not saving"
**Solution**: Ensure repair_time_logs table has proper permissions

## Remember

- This is for TODAY - focus on core functionality
- Use the v0 components as templates but connect to real data
- Test each feature as you build it
- Deploy early and often
- The existing codebase has good patterns - follow them