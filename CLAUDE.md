# Standalone Worker Management App

## Project Context
- **Purpose**: Production-ready worker task management system for headphone manufacturing
- **Timeline**: 3 weeks to production
- **Stack**: Next.js 15 + Supabase + TypeScript
- **Scope**: Read-only Shopify integration + worker task assignment/tracking
- **Risk Level**: Minimal (isolated database, read-only Shopify)

## Critical Rules

### 🔒 Shopify Integration (CRITICAL)
- **READ-ONLY ONLY** - Never write to Shopify store
- Use limited scope API token: `read_orders`, `read_products`, `read_customers`
- Sync every 15 minutes via cron job
- Store full order data in `raw_data` JSONB field
- Graceful degradation if Shopify API fails

### 🛡️ Authentication Flow
1. Supabase auth verification (`getUser()`, never `getSession()`)
2. Employee status validation (`active = true`)
3. Role-based permissions (`worker`, `supervisor`, `manager`)
4. Data scoping via `auth_user_id`

### 📊 Database Schema Focus
- `orders` - Synced from Shopify, immutable after sync
- `order_items` - Individual products to build
- `workers` - Employee management with skills array
- `work_tasks` - Task assignment & tracking with time logging
- `qc_templates` & `qc_results` - Quality control workflows

## Code Patterns

### API Route Template
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // ALWAYS validate employee status
    const { data: employee } = await supabase
      .from('employees')
      .select('role, active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!employee?.active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Your logic here
    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Data Access Patterns
- **Build Management**: Scope by `assigned_to` matching current employee
- **Task Filtering**: Always filter via `production_tasks.assigned_to_id`
- **QC Results**: Use consistent schema `{ looks, hardware, sound, notes }`
- **Time Tracking**: Log all work periods in `work_logs` table

### Security Requirements
- Input validation with Zod schemas for all API inputs
- Error responses: `{ error: string }` format
- No hardcoded credentials anywhere
- Environment variables server-side only
- RLS policies on all tables

## File Structure
```
src/
├── app/
│   ├── api/              # API routes
│   ├── worker/           # Worker dashboard
│   └── manager/          # Manager oversight
├── components/
│   ├── ui/               # shadcn/ui components
│   └── features/         # Feature-specific components
├── lib/
│   ├── supabase/         # Auth utilities
│   └── shopify/          # Read-only Shopify client
└── types/
    └── database.ts       # Generated Supabase types
```

## Design Standards
- **Mobile-first**: Worker dashboard must work on tablets/phones
- **Colors**: Soft, friendly colors for buttons and status indicators
- **Modals**: Contextual positioning, non-intrusive backgrounds
- **Icons**: Import individually from lucide-react
- **Components**: Use shadcn/ui patterns exclusively
- **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation

## Development Workflow
1. **Database First**: Schema changes go through Supabase migrations
2. **Type Safety**: Generate types after schema changes
3. **Testing**: Test auth flows and permissions thoroughly
4. **Security**: Never trust client-side data for sensitive operations
5. **Performance**: Use Server Components by default

## Forbidden Patterns
- Using `@supabase/auth-helpers-nextjs` (use `@supabase/ssr`)
- Using `getSession()` on server-side (use `getUser()`)
- Writing to Shopify (READ-ONLY integration only)
- Hardcoding user IDs or skipping employee validation
- Using `any` type in TypeScript
- Direct database access from client components
- Storing sensitive data in localStorage

## Quick Commands
```bash
# Generate types after schema changes
npx supabase gen types typescript --project-id "$PROJECT_ID" > types/database.types.ts

# Start development
npm run dev

# Database operations
npx supabase db push    # Push migrations
npx supabase db reset   # Reset local database
```