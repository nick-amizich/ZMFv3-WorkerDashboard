# 🏭 Standalone Worker Management App - Claude Code Development Spec

> **Project Type**: Production-ready headphone manufacturing worker management system  
> **Timeline**: 3 weeks to production deployment  
> **Risk Level**: Minimal (read-only Shopify, isolated database)  
> **Development Mode**: Claude Code + MCP servers + Claude 4 memory

---

## 📋 **PROJECT OVERVIEW**

### Mission Statement
Build a focused, production-ready worker task management system that safely integrates with Shopify orders (read-only) and provides real-time task assignment, tracking, and quality control workflows for a headphone manufacturing team.

### Core Business Requirements
- **Managers**: Assign Shopify orders to workers via drag-and-drop interface
- **Workers**: View assigned tasks, track time, complete QC workflows on mobile
- **System**: Sync orders from Shopify every 15 minutes, real-time updates
- **Security**: Read-only Shopify access, isolated database, role-based permissions

### Success Criteria
- Orders sync automatically from Shopify with 100% accuracy
- Workers can complete tasks with mobile-optimized interface
- Managers can assign and track work in real-time
- QC workflows prevent defects through template-based checklists
- System deployed and stable within 3 weeks

---

## 🛠️ **TECHNICAL STACK & CONSTRAINTS**

### Required Technologies
```typescript
// Core Stack (Non-negotiable)
Framework: "Next.js 15.3.2"
Database: "Supabase (new isolated project)"
Language: "TypeScript 5+ (strict mode)"
Styling: "Tailwind CSS v4 + shadcn/ui"
Auth: "Supabase Auth with RLS"
State: "TanStack Query + React state"
Forms: "React Hook Form + Zod validation"

// External Integrations
Shopify: "Admin API (read-only permissions only)"
Deployment: "Vercel"
Monitoring: "Supabase built-in analytics"
```

### Critical Security Constraints
- **NEVER** use `@supabase/auth-helpers-nextjs` (deprecated)
- **ALWAYS** use `@supabase/ssr` for auth
- **NEVER** use `getSession()` on server-side (use `getUser()`)
- **ALWAYS** enable RLS on every table
- **NEVER** expose service role keys client-side
- **ALWAYS** validate worker status on every request

### Development Environment
- **Claude Code**: Primary development tool with MCP servers
- **MCP Servers**: Supabase, Shopify (read-only), Memory
- **Memory System**: CLAUDE.md for persistent project context
- **Type Safety**: Generate types from Supabase schema

---

## 🗄️ **DATABASE SCHEMA SPECIFICATION**

### Core Tables (Create in this exact order)

```sql
-- 1. Workers table (Authentication + Roles)
CREATE TABLE workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('worker', 'supervisor', 'manager')) DEFAULT 'worker',
  skills TEXT[] DEFAULT '{}', -- ['sanding', 'assembly', 'qc', 'packaging']
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Orders table (Shopify sync target)
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_order_id BIGINT UNIQUE NOT NULL,
  order_number TEXT NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  total_price DECIMAL(10,2),
  order_date TIMESTAMPTZ,
  status TEXT CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'shipped')) DEFAULT 'pending',
  raw_data JSONB NOT NULL, -- Full Shopify order for reference
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Order Items table (Individual products to build)
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  shopify_line_item_id BIGINT,
  product_name TEXT NOT NULL,
  variant_title TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price DECIMAL(10,2),
  sku TEXT,
  product_data JSONB, -- Variant options, customizations
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Work Tasks table (Core workflow entity)
CREATE TABLE work_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('sanding', 'assembly', 'qc', 'packaging')),
  task_description TEXT,
  assigned_to_id UUID REFERENCES workers(id),
  assigned_by_id UUID REFERENCES workers(id),
  status TEXT CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'blocked')) DEFAULT 'pending',
  priority TEXT CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  due_date DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. QC Templates table (Quality control checklists)
CREATE TABLE qc_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type TEXT NOT NULL,
  name TEXT NOT NULL,
  checklist_items JSONB NOT NULL, -- [{"id": 1, "description": "Check finish quality", "required": true}]
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. QC Results table (Quality control outcomes)
CREATE TABLE qc_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES work_tasks(id) ON DELETE CASCADE,
  template_id UUID REFERENCES qc_templates(id),
  worker_id UUID REFERENCES workers(id),
  results JSONB NOT NULL, -- {"1": {"status": "pass", "notes": "Good finish"}}
  overall_status TEXT CHECK (overall_status IN ('pass', 'fail', 'rework')) NOT NULL,
  inspector_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Work Logs table (Time tracking)
CREATE TABLE work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES work_tasks(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES workers(id),
  log_type TEXT CHECK (log_type IN ('start', 'pause', 'resume', 'complete', 'note')) NOT NULL,
  time_spent_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Required Security Setup (Critical - Do First)

```sql
-- Enable RLS on ALL tables (MANDATORY)
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_logs ENABLE ROW LEVEL SECURITY;

-- Workers can only see their own data
CREATE POLICY "workers_own_access" ON workers
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = auth_user_id);

-- Tasks: Workers see assigned tasks, Managers see all
CREATE POLICY "tasks_worker_access" ON work_tasks
  FOR SELECT TO authenticated
  USING (
    assigned_to_id IN (
      SELECT id FROM workers 
      WHERE auth_user_id = (SELECT auth.uid())
    )
    OR 
    EXISTS (
      SELECT 1 FROM workers 
      WHERE auth_user_id = (SELECT auth.uid()) 
      AND role IN ('manager', 'supervisor')
    )
  );

-- Tasks: Only managers can assign/modify
CREATE POLICY "tasks_manager_modify" ON work_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE auth_user_id = (SELECT auth.uid()) 
      AND role IN ('manager', 'supervisor')
    )
  );

-- Orders: Managers can see all, workers see assigned orders
CREATE POLICY "orders_access" ON orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE auth_user_id = (SELECT auth.uid()) 
      AND role IN ('manager', 'supervisor')
    )
    OR
    id IN (
      SELECT DISTINCT o.id FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN work_tasks wt ON wt.order_item_id = oi.id
      JOIN workers w ON w.id = wt.assigned_to_id
      WHERE w.auth_user_id = (SELECT auth.uid())
    )
  );

-- Performance indexes (REQUIRED for RLS efficiency)
CREATE INDEX idx_workers_auth_user_id ON workers(auth_user_id);
CREATE INDEX idx_workers_role ON workers(role);
CREATE INDEX idx_work_tasks_assigned_to ON work_tasks(assigned_to_id);
CREATE INDEX idx_work_tasks_status ON work_tasks(status);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_shopify_id ON orders(shopify_order_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE work_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE work_logs;
```

---

## 📁 **PROJECT STRUCTURE**

### Required Directory Structure
```
standalone-worker-app/
├── src/
│   ├── app/                    # Next.js 15 App Router
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── manager/            # Manager dashboard
│   │   │   ├── dashboard/
│   │   │   ├── workers/
│   │   │   └── orders/
│   │   ├── worker/             # Worker interface
│   │   │   ├── dashboard/
│   │   │   ├── tasks/
│   │   │   └── qc/
│   │   ├── api/                # API routes
│   │   │   ├── orders/
│   │   │   ├── tasks/
│   │   │   └── shopify/
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── manager/            # Manager-specific components
│   │   ├── worker/             # Worker-specific components
│   │   └── shared/             # Shared components
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts       # Client-side Supabase
│   │   │   ├── server.ts       # Server-side Supabase
│   │   │   └── middleware.ts   # Auth middleware
│   │   ├── shopify/
│   │   │   ├── client.ts       # Read-only Shopify client
│   │   │   └── sync.ts         # Order sync logic
│   │   ├── utils.ts            # Utility functions
│   │   └── validations.ts      # Zod schemas
│   ├── hooks/                  # Custom React hooks
│   ├── types/
│   │   ├── database.types.ts   # Generated Supabase types
│   │   └── index.ts            # App-specific types
│   └── middleware.ts           # Next.js middleware
├── supabase/
│   ├── functions/              # Edge Functions
│   │   └── shopify-sync/
│   └── migrations/             # Database migrations
├── .env.local.example
├── .env.local                  # Environment variables
├── CLAUDE.md                   # Claude Code memory file
├── package.json
├── tailwind.config.js
└── next.config.js
```

---

## 🔧 **DEVELOPMENT PHASES**

### Phase 1: Foundation (Days 1-7)

**Day 1-2: Project Setup**
```bash
# Create Next.js app
npx create-next-app@latest standalone-worker-app --typescript --tailwind --app

# Install required dependencies
npm install @supabase/ssr @supabase/supabase-js
npm install @tanstack/react-query
npm install react-hook-form @hookform/resolvers zod
npm install @hello-pangea/dnd  # For drag-and-drop
npm install lucide-react
npm install recharts  # For simple charts

# Install shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button card input label form badge toast tabs
```

**Day 3-4: Database & Auth Setup**
- Deploy database schema via MCP server
- Set up Supabase auth configuration
- Create auth middleware
- Test RLS policies in Supabase dashboard

**Day 5-7: Shopify Integration**
- Set up read-only Shopify API client
- Build order sync mechanism
- Create Supabase Edge Function for scheduled sync
- Test order import pipeline

### Phase 2: Core Features (Days 8-14)

**Day 8-10: Manager Dashboard**
- Task assignment interface with drag-and-drop
- Worker management (CRUD operations)
- Order list with filtering
- Real-time status updates

**Day 11-12: Worker Interface**
- Mobile-responsive task list
- Time tracking functionality
- Task status updates
- Basic navigation

**Day 13-14: QC System**
- QC template management
- Checklist workflows
- Results capture
- Pass/fail tracking

### Phase 3: Polish & Deploy (Days 15-21)

**Day 15-17: Testing & Optimization**
- End-to-end testing
- Performance optimization
- Error handling
- Mobile responsiveness

**Day 18-19: Production Deployment**
- Vercel deployment
- Environment configuration
- Domain setup
- SSL configuration

**Day 20-21: Monitoring & Training**
- Analytics setup
- Error monitoring
- User training materials
- Documentation

---

## 🛡️ **AUTHENTICATION PATTERNS**

### Server Component Auth (Default Pattern)
```typescript
// app/manager/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ManagerDashboard() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/login')
  }
  
  // ALWAYS validate worker status
  const { data: worker } = await supabase
    .from('workers')
    .select('id, name, role, is_active')
    .eq('auth_user_id', user.id)
    .single()
    
  if (!worker?.is_active || !['manager', 'supervisor'].includes(worker.role)) {
    redirect('/unauthorized')
  }

  // Fetch data with automatic RLS filtering
  const { data: tasks } = await supabase
    .from('work_tasks')
    .select(`
      *,
      order_item:order_items(
        product_name,
        order:orders(order_number, customer_name)
      ),
      assigned_to:workers(name)
    `)
    .order('created_at', { ascending: false })

  return <ManagerDashboardUI tasks={tasks} worker={worker} />
}
```

### API Route Auth Pattern
```typescript
// app/api/tasks/assign/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const assignTaskSchema = z.object({
  taskId: z.string().uuid(),
  workerId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate manager role
    const { data: manager } = await supabase
      .from('workers')
      .select('role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!manager?.is_active || !['manager', 'supervisor'].includes(manager.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Validate request body
    const body = await request.json()
    const { taskId, workerId } = assignTaskSchema.parse(body)
    
    // Update task assignment (RLS will handle permissions)
    const { data, error: updateError } = await supabase
      .from('work_tasks')
      .update({ 
        assigned_to_id: workerId,
        status: 'assigned',
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single()
    
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }
    
    return NextResponse.json({ task: data })
    
  } catch (error) {
    console.error('Task assignment error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
```

---

## 📱 **UI COMPONENT PATTERNS**

### Manager: Drag-and-Drop Task Assignment
```typescript
// components/manager/task-assignment-board.tsx
'use client'

import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'

interface Task {
  id: string
  task_type: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  order_item: {
    product_name: string
    order: {
      order_number: string
      customer_name: string
    }
  }
  assigned_to?: {
    name: string
  }
}

export function TaskAssignmentBoard() {
  const queryClient = useQueryClient()
  
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const response = await fetch('/api/tasks')
      if (!response.ok) throw new Error('Failed to fetch tasks')
      return response.json()
    },
    refetchInterval: 30000 // Auto-refresh every 30 seconds
  })

  const { data: workers = [] } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const response = await fetch('/api/workers')
      if (!response.ok) throw new Error('Failed to fetch workers')
      return response.json()
    }
  })

  const assignTask = useMutation({
    mutationFn: async ({ taskId, workerId }: { taskId: string; workerId: string }) => {
      const response = await fetch('/api/tasks/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, workerId })
      })
      if (!response.ok) throw new Error('Failed to assign task')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast({ title: 'Task assigned successfully' })
    },
    onError: (error) => {
      toast({ 
        title: 'Assignment failed', 
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  const handleDragEnd = (result: any) => {
    if (!result.destination) return
    
    const taskId = result.draggableId
    const workerId = result.destination.droppableId === 'unassigned' 
      ? null 
      : result.destination.droppableId
    
    if (workerId) {
      assignTask.mutate({ taskId, workerId })
    }
  }

  const pendingTasks = tasks.filter((task: Task) => !task.assigned_to)
  
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Unassigned Tasks Column */}
        <Droppable droppableId="unassigned">
          {(provided) => (
            <Card>
              <CardHeader>
                <CardTitle>Pending Orders ({pendingTasks.length})</CardTitle>
              </CardHeader>
              <CardContent 
                ref={provided.innerRef} 
                {...provided.droppableProps}
                className="space-y-2 min-h-96"
              >
                {pendingTasks.map((task: Task, index: number) => (
                  <Draggable key={task.id} draggableId={task.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="p-3 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="font-medium text-sm">
                          {task.order_item.product_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Order: {task.order_item.order.order_number}
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <Badge variant="outline">{task.task_type}</Badge>
                          <Badge 
                            variant={
                              task.priority === 'urgent' ? 'destructive' :
                              task.priority === 'high' ? 'default' : 'secondary'
                            }
                          >
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </CardContent>
            </Card>
          )}
        </Droppable>

        {/* Worker Columns */}
        {workers.slice(0, 3).map((worker: any) => {
          const workerTasks = tasks.filter((task: Task) => 
            task.assigned_to?.name === worker.name
          )
          
          return (
            <Droppable key={worker.id} droppableId={worker.id}>
              {(provided) => (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      {worker.name} ({workerTasks.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-2 min-h-96"
                  >
                    {workerTasks.map((task: Task, index: number) => (
                      <div key={task.id} className="p-2 bg-blue-50 border border-blue-200 rounded">
                        <div className="font-medium text-xs">
                          {task.order_item.product_name}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {task.task_type}
                        </Badge>
                      </div>
                    ))}
                    {provided.placeholder}
                  </CardContent>
                </Card>
              )}
            </Droppable>
          )
        })}
      </div>
    </DragDropContext>
  )
}
```

### Worker: Mobile Task Interface
```typescript
// components/worker/task-list.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Play, Pause, CheckCircle } from 'lucide-react'

export function WorkerTaskList({ workerId }: { workerId: string }) {
  const { data: tasks = [] } = useQuery({
    queryKey: ['worker-tasks', workerId],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/worker/${workerId}`)
      return response.json()
    },
    refetchInterval: 10000 // Real-time updates
  })

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-xl font-semibold">My Tasks ({tasks.length})</h2>
      
      {tasks.map((task: any) => (
        <Card key={task.id} className="touch-manipulation">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-medium">{task.order_item.product_name}</h3>
                <p className="text-sm text-gray-600">
                  Order: {task.order_item.order.order_number}
                </p>
              </div>
              <Badge 
                variant={
                  task.status === 'completed' ? 'default' :
                  task.status === 'in_progress' ? 'secondary' : 'outline'
                }
              >
                {task.status.replace('_', ' ')}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="w-4 h-4 mr-1" />
                {task.estimated_hours ? `${task.estimated_hours}h estimated` : 'No estimate'}
              </div>
              
              <div className="flex space-x-2">
                {task.status === 'assigned' && (
                  <Button size="sm" className="touch-manipulation min-h-10">
                    <Play className="w-4 h-4 mr-1" />
                    Start
                  </Button>
                )}
                
                {task.status === 'in_progress' && (
                  <>
                    <Button variant="outline" size="sm" className="touch-manipulation min-h-10">
                      <Pause className="w-4 h-4 mr-1" />
                      Pause
                    </Button>
                    <Button size="sm" className="touch-manipulation min-h-10">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Complete
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            {task.notes && (
              <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                <strong>Notes:</strong> {task.notes}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

---

## 🔐 **SHOPIFY INTEGRATION SPECIFICATION**

### Read-Only API Client
```typescript
// lib/shopify/client.ts
interface ShopifyConfig {
  shop: string
  accessToken: string // READ-ONLY token only
}

export class ShopifyClient {
  private config: ShopifyConfig
  
  constructor(config: ShopifyConfig) {
    this.config = config
  }
  
  async fetchOrders(since?: string) {
    const url = new URL(`https://${this.config.shop}.myshopify.com/admin/api/2023-10/orders.json`)
    
    if (since) {
      url.searchParams.set('updated_at_min', since)
    }
    
    const response = await fetch(url.toString(), {
      headers: {
        'X-Shopify-Access-Token': this.config.accessToken
      }
    })
    
    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.statusText}`)
    }
    
    return response.json()
  }
  
  // NEVER implement write operations in this client
  // All methods should be read-only
}
```

### Order Sync Edge Function
```typescript
// supabase/functions/shopify-sync/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Fetch orders from Shopify
    const shopifyResponse = await fetch(
      `https://${Deno.env.get('SHOPIFY_SHOP')}.myshopify.com/admin/api/2023-10/orders.json`,
      {
        headers: {
          'X-Shopify-Access-Token': Deno.env.get('SHOPIFY_ACCESS_TOKEN') ?? ''
        }
      }
    )
    
    const { orders } = await shopifyResponse.json()
    
    // Process each order
    for (const order of orders) {
      // Upsert order
      const { data: upsertedOrder } = await supabase
        .from('orders')
        .upsert({
          shopify_order_id: order.id,
          order_number: order.name,
          customer_name: `${order.customer?.first_name} ${order.customer?.last_name}`,
          customer_email: order.customer?.email,
          total_price: parseFloat(order.total_price),
          order_date: order.created_at,
          raw_data: order,
          synced_at: new Date().toISOString()
        })
        .select()
        .single()
      
      // Process line items
      for (const lineItem of order.line_items) {
        const { data: orderItem } = await supabase
          .from('order_items')
          .upsert({
            order_id: upsertedOrder.id,
            shopify_line_item_id: lineItem.id,
            product_name: lineItem.title,
            variant_title: lineItem.variant_title,
            quantity: lineItem.quantity,
            price: parseFloat(lineItem.price),
            sku: lineItem.sku,
            product_data: lineItem.properties
          })
          .select()
          .single()
        
        // Create tasks for new order items
        const taskTypes = ['sanding', 'assembly', 'qc', 'packaging']
        
        for (const taskType of taskTypes) {
          await supabase
            .from('work_tasks')
            .upsert({
              order_item_id: orderItem.id,
              task_type: taskType,
              status: 'pending',
              priority: 'normal'
            })
        }
      }
    }
    
    return new Response(
      JSON.stringify({ success: true, processed: orders.length }),
      { headers: { 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Sync error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

---

## 🧪 **TESTING REQUIREMENTS**

### Security Testing (Critical)
```typescript
// __tests__/security.test.ts
describe('RLS Security', () => {
  test('workers can only access their own tasks', async () => {
    // Test that worker A cannot see worker B's tasks
  })
  
  test('managers can assign tasks', async () => {
    // Test manager role permissions
  })
  
  test('unauthenticated users are rejected', async () => {
    // Test auth middleware
  })
})
```

### API Route Testing
```typescript
// __tests__/api/tasks.test.ts
describe('/api/tasks', () => {
  test('GET returns worker tasks with auth', async () => {
    // Test authenticated task retrieval
  })
  
  test('POST assignment requires manager role', async () => {
    // Test role-based assignment
  })
})
```

---

## 🚀 **DEPLOYMENT SPECIFICATION**

### Environment Variables
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

SHOPIFY_SHOP=your-shop-name
SHOPIFY_ACCESS_TOKEN=your-read-only-token
SHOPIFY_WEBHOOK_SECRET=your-webhook-secret

NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
```

### Vercel Deployment
```json
// vercel.json
{
  "functions": {
    "app/api/**": {
      "maxDuration": 30
    }
  },
  "crons": [
    {
      "path": "/api/shopify/sync",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

---

## 📝 **CLAUDE CODE INSTRUCTIONS**

### Development Commands
```bash
# Start development
npm run dev

# Generate Supabase types
npx supabase gen types typescript --project-id your-project > src/types/database.types.ts

# Run tests
npm test

# Build for production
npm run build

# Deploy to Vercel
vercel --prod
```

### Development Priorities
1. **Security First**: Always implement RLS and auth validation
2. **Mobile Responsive**: Worker interface must work on phones
3. **Real-time Updates**: Use Supabase subscriptions for live data
4. **Error Handling**: Comprehensive error boundaries and validation
5. **Type Safety**: Use generated Supabase types everywhere
6. **Performance**: Optimize queries and use proper indexing

### Key Success Metrics
- Orders sync automatically from Shopify (100% accuracy)
- Workers can complete tasks on mobile devices
- Managers can assign work via drag-and-drop
- Real-time updates work reliably
- System deploys successfully to production

**This specification provides everything needed to build the standalone worker management app. Use it as your primary reference throughout development.**