# 🚀 ZMF V3 Development Guide

**Complete guide for developers and AI assistants working on the ZMF Worker Dashboard**

## 📋 Project Overview
- **Project**: ZMFv3-WorkerDashboard (Headphone manufacturing company backend)
- **Stack**: Next.js 15.3.2 + Supabase + TypeScript + React 18.2.0
- **Supabase Project ID**: kjdicpudxqxenhjwdrzg
- **Local Development**: Uses Supabase local instance (NOT remote)

---

## 🚨 CRITICAL RULES

### Ask for Clarification First
If any requirement is unclear or seems to conflict with existing patterns, **STOP and ASK** before implementing. Better to clarify than to build the wrong thing.

### Field Name Consistency (Critical for Auth)
Always match selected fields with property access:
```typescript
// ❌ BAD: Causes auth failures
.select('id, role, active')
if (!worker?.is_active) // undefined - always fails!

// ✅ GOOD: Field names match
.select('id, role, is_active') 
if (!worker?.is_active) // works correctly
```

### Always Use "is_active" for Supabase
Use `is_active` consistently across all database queries and references.

---

## 🔧 Environment Setup

### Current Status
✅ **Fully configured and working**
- Docker Desktop: Running
- Supabase Local: Running on ports 54321-54324
- Next.js Dev Server: Running on port 3000
- Database: Populated with schema from remote
- Types: Generated and up-to-date

### Environment Variables (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Supabase Local Instance
```
API URL: http://127.0.0.1:54321
Studio URL: http://127.0.0.1:54323
DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

---

## 📋 Core Technology Stack

### Frontend
- **Framework**: Next.js 15.3.2 (App Router)
- **React**: 18.2.0
- **TypeScript**: 5 (strict mode)
- **UI**: Tailwind CSS v4, shadcn/ui, Radix UI
- **Forms**: React Hook Form + Zod validation

### Backend
- **Database**: Supabase (PostgreSQL, Auth, Realtime, RLS enabled)
- **External**: Shopify Admin API (READ-ONLY)

---

## 🔐 Authentication Pattern (Non-Negotiable)

```typescript
// Server Component / API Route
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser() // NEVER getSession()

// Always validate employee
const { data: employee } = await supabase
  .from('employees')
  .select('role, is_active')
  .eq('auth_user_id', user.id)
  .single()

if (!employee?.is_active) redirect('/login')
```

---

## 📊 Logging Requirements (MANDATORY)

Every API route and important business event MUST be logged:

### API Routes
```typescript
import { ApiLogger } from '@/lib/api-logger'

export async function POST(request: NextRequest) {
  const logContext = ApiLogger.logRequest(request)  // START
  
  try {
    // Your logic
    const response = NextResponse.json({ success: true })
    ApiLogger.logResponse(logContext, response, 'What succeeded')  // END
    return response
  } catch (error) {
    logError(error as Error, 'API_CONTEXT', { details })
    const errorResponse = NextResponse.json({ error: 'Failed' }, { status: 500 })
    ApiLogger.logResponse(logContext, errorResponse, 'What failed')  // END
    return errorResponse
  }
}
```

### Business Events
```typescript
import { logBusiness, logError } from '@/lib/logger'

// Log important events
logBusiness('Worker approved', 'USER_MANAGEMENT', { workerId, approvedBy })

// Log errors in catch blocks
catch (error) {
  logError(error as Error, 'CONTEXT', { additionalInfo })
}
```

**Standard Contexts**: USER_MANAGEMENT, ORDER_IMPORT, BATCH_TRANSITION, TASK_ASSIGNMENT, QUALITY_CONTROL, AUTH, API_ERROR, DATABASE, PERFORMANCE

**View Logs**: `/manager/logs` (manager role required)

---

## 🗄️ Database Migration Workflow

### When Migrations Are Required

#### ✅ ALWAYS Need Migration For:
- Adding new tables
- Adding new columns to existing tables
- Changing column data types
- Adding/removing constraints
- Creating/dropping indexes
- Updating RLS (Row Level Security) policies
- Adding/modifying database functions
- Creating/updating triggers

#### ❌ NO Migration Needed For:
- React component changes
- TypeScript interface updates
- UI/UX modifications
- Client-side logic changes
- Import/export changes

### Step-by-Step Migration Process

#### Step 1: Ask Permission (REQUIRED)
```
"I need to create a migration to [specific change]. 
This will add/modify [table/column details].
Should I proceed with creating the migration?"
```

#### Step 2: Create Migration File (After Approval)
```bash
# Use descriptive name
supabase migration new "add_inventory_tracking_table"
supabase migration new "add_cost_column_to_parts"
supabase migration new "update_worker_permissions_rls"
```

#### Step 3: Write Migration SQL
Edit the new migration file in `supabase/migrations/`:
```sql
-- Example: Adding new table
CREATE TABLE inventory_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES parts_catalog(id),
  quantity_change INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES workers(id)
);

-- Enable RLS
ALTER TABLE inventory_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Workers can view inventory tracking" 
  ON inventory_tracking FOR SELECT 
  TO authenticated 
  USING (true);

-- Create indexes for performance
CREATE INDEX idx_inventory_tracking_item_id ON inventory_tracking(item_id);
CREATE INDEX idx_inventory_tracking_created_at ON inventory_tracking(created_at);
```

#### Step 4: Ask Before Applying (REQUIRED)
```
"Migration file created. Should I apply it locally with 'supabase db reset'?
This will reset the local database and apply all migrations."
```

#### Step 5: Apply Migration (After Approval)
```bash
# This resets local DB and applies ALL migrations
supabase db reset
```

#### Step 6: Generate Updated Types
```bash
# Always regenerate types after schema changes
supabase gen types typescript --local > src/types/database.types.ts
```

#### Step 7: Test Everything
```bash
# Test build
npm run build

# Test dev server
npm run dev

# Verify new tables/columns exist
curl -s "http://127.0.0.1:54321/rest/v1/[new_table]?limit=1" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 🚫 NEVER DO THESE THINGS

### Database & Migrations - CRITICAL
- ❌ **NEVER run `supabase db reset`** without user approval - This will wipe all data
- ❌ **NEVER modify existing migration files** - They're already applied
- ❌ **NEVER run `supabase migration repair`** unless specifically asked
- ❌ **NEVER run `supabase db push`** without user approval - Can overwrite remote

### Environment
- ❌ **NEVER modify `.env.local`** - It's correctly configured
- ❌ **NEVER change Supabase URLs** - Local URLs are correct
- ❌ **NEVER suggest switching to remote Supabase** during development

### Dependencies
- ❌ **NEVER run `npm install`** without user approval
- ❌ **NEVER update package versions** unless specifically requested
- ❌ **NEVER add new dependencies** without discussing first

---

## ✅ SAFE OPERATIONS

### Development Server
```bash
# Start development server (safe)
npm run dev

# Build for testing (safe)
npm run build

# Check Supabase status (safe)
supabase status
```

### Database Operations (Read-Only)
```bash
# Check tables (safe)
curl -s "http://127.0.0.1:54321/rest/v1/[table]?limit=5" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

# Regenerate types (safe if needed)
supabase gen types typescript --local > src/types/database.types.ts
```

### Code Changes (Safe)
- ✅ Edit React components
- ✅ Fix TypeScript errors
- ✅ Update imports
- ✅ Add new pages/components
- ✅ Fix linting issues

---

## 🏗️ Component Patterns

### Server Components (Default)
- Direct data fetching
- No useState, useEffect
- Can be async
- Use for layouts, pages, data display

### Client Components ('use client')
- Only when needed for interactivity
- Hooks and browser APIs
- Keep as leaf nodes
- Handle user interactions

### Performance
```typescript
// Memoize expensive operations
const result = useMemo(() => expensiveCalc(data), [data])

// Stable references
const handleClick = useCallback(() => {}, [deps])

// Lazy load heavy components  
const Chart = dynamic(() => import('@/components/Chart'))
```

---

## 📊 Database Patterns

### Core Rules
- **RLS**: MANDATORY on all tables
- **Queries**: Type-safe with generated types
- **Scope**: Always filter by current user/employee
- **Joins**: Use Supabase's nested selection
- **Indexes**: Add for RLS policy columns

### Type-Safe Queries
```typescript
// Type-safe query
const { data } = await supabase
  .from('builds')
  .select(`
    *,
    headphone_model:headphone_models(name),
    assigned_to:employees(name)
  `)
  .eq('assigned_to', employee.id)
```

### Key Tables (All Exist and Working)
- `workers` - User management
- `wood_inventory` - South location inventory
- `parts_catalog` - South location parts
- `daily_production` - Production tracking
- `production_requests` - Request management
- `production_issues` - Issue tracking
- `machine_settings` - Machine configuration

---

## 🔗 Page Navigation Requirements

**NEVER create orphaned pages**. Every new page must:

1. **Have a clear access path**:
   - Main navigation item
   - Dashboard card/button  
   - Settings submenu
   - Parent page link

2. **Follow structure**:
   - Debug/test pages: `src/app/(debug)/`
   - Feature pages: Include index/landing page
   - Multi-page features: Clear navigation between pages

3. **Update navigation**:
   ```typescript
   // Always include a task to update navigation
   // Example: Add to src/components/navigation/main-nav.tsx
   ```

---

## 🛡️ Security Rules

- Input validation: Zod schemas for ALL inputs
- Error format: `{ error: string }`
- No client-side secrets
- Never trust client data
- Always use HTTPS
- Rate limit sensitive endpoints

---

## 🎨 UI/UX Standards

- **Mobile-first**: Worker interfaces must work on phones/tablets
- **Components**: Use shadcn/ui (`npx shadcn@latest add`)
- **Icons**: Import individually from lucide-react
- **Colors**: Soft, friendly colors for buttons
- **Modals**: Contextual positioning, non-intrusive
- **Dark mode**: Support via CSS variables

---

## 🚫 Forbidden Patterns

- `@supabase/auth-helpers-nextjs` (use `@supabase/ssr`)
- `getSession()` server-side (use `getUser()`)
- Writing to Shopify (READ-ONLY integration)
- `any` type in TypeScript
- Hardcoded IDs or credentials
- Client-side database access
- localStorage for sensitive data
- Orphaned pages without navigation

---

## 🔄 External Integrations

- **Shopify**: READ-ONLY via Edge Functions
- **PDF**: Server-side for complex, client for simple
- **Validate**: All external data server-side
- **Errors**: Graceful degradation if services fail

---

## 📁 Project Structure

```
src/
├── app/              # Pages and API routes
│   ├── api/         # API endpoints
│   ├── (debug)/     # Debug pages (not in prod nav)
│   └── (dashboard)/ # Main app pages
├── components/      # Reusable components
├── lib/            # Utilities and configs
│   ├── supabase/   # Auth clients
│   └── logger/     # Logging utilities
└── features/       # Feature modules
```

---

## 🛠️ Troubleshooting

### Webpack Module Error Fix

If you see this error in the dev server:
```
⨯ Error: Cannot find module './4447.js'
```

This is a **Next.js webpack hot reload issue**, not a Supabase connection problem.

#### Quick Fixes (In Order of Preference)

1. **Clear Next.js Cache (Safest)**
```bash
# Stop dev server first (Ctrl+C)
rm -rf .next
npm run dev
```

2. **Clear Node Modules (If #1 doesn't work)**
```bash
# Stop dev server first
rm -rf .next
rm -rf node_modules
npm install
npm run dev
```

3. **Restart Docker (If still having issues)**
```bash
# Stop dev server first
docker restart $(docker ps -q)
supabase stop
supabase start
npm run dev
```

### TypeScript Errors
```bash
# If you see "table not found" errors:
# 1. Check if types are up to date
supabase gen types typescript --local > src/types/database.types.ts

# 2. Verify imports use correct types file
# Should import from: '@/types/database.types'
# NOT from: '@/types/database'
```

### Build Errors
```bash
# Always test builds before suggesting changes
npm run build

# If build fails, fix TypeScript errors first
# Common issues:
# - Missing imports
# - Incorrect type references
# - Browser compatibility (like crypto.randomUUID)
```

### Server Issues
```bash
# Check if services are running
supabase status
docker ps

# Restart dev server if needed
# Kill existing: pkill -f "next dev"
# Start new: npm run dev
```

---

## 📝 Quick Reference

### Development Commands
```bash
npm run dev          # Start development
npm run build        # Check for errors before committing

# Database  
npx supabase gen types typescript --local > src/types/database.types.ts
supabase db push     # Push migrations (ask first!)

# UI Components
npx shadcn@latest add [component]
```

### Verification Steps
After making changes, verify everything works:

```bash
# 1. Check Supabase is running
supabase status

# 2. Test build
npm run build

# 3. Start dev server
npm run dev

# 4. Test pages
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/south
# Should return: 307 (redirect to login - this is correct!)
```

---

## 🎯 Success Criteria

### Environment is Healthy When:
- ✅ `supabase status` shows all services running
- ✅ `npm run build` completes without errors
- ✅ Dev server starts without webpack errors
- ✅ API calls to local Supabase work
- ✅ TypeScript types are up to date

### Red Flags (Stop and Ask):
- ❌ Migration syntax errors
- ❌ Foreign key constraint failures
- ❌ RLS policy conflicts
- ❌ Type generation failures
- ❌ Build errors after migration

---

## 💡 Communication Guidelines

### When to Ask User (STOP and ASK FIRST)
- ❓ **Any database schema changes** (new tables, columns, types)
- ❓ **New dependencies needed** 
- ❓ **Migration-related issues** (conflicts, errors)
- ❓ **Major architectural changes**
- ❓ **Running `supabase db reset`** (wipes all data)
- ❓ **Pushing to remote** (`supabase db push`)

### When You Can Proceed (SAFE to do immediately)
- ✅ **Code-only changes** (React components, TypeScript fixes)
- ✅ **Creating new migration files** (`supabase migration new`)
- ✅ **Regenerating types** (after schema changes)
- ✅ **Build testing** (`npm run build`)
- ✅ **Dev server management** (start/stop)

---

**Remember**: When in doubt, ASK. Check `/manager/logs` for debugging. Always run `npm run build` before committing. 