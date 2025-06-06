# ZMFv2 Development Rules

<IMPORTANT>
ALWAYS USE THE RULES IN THE .cursor FOLDER. 
Verify that you looked at them by say "Rules Checked" in your response
</IMPORTANT>

Always use "is_active" for supabase

Make sure to look at LOCAL_DEV_GUIDE.md to understand how to use our local supabase environment and handle migrations.

**Project**: Headphone manufacturing company backend  
**Stack**: Next.js 15.3.2 + Supabase + TypeScript + React 18.2.0

## 🚨 CRITICAL: Ask for Clarification
If any requirement is unclear or seems to conflict with existing patterns, **STOP and ASK** before implementing. Better to clarify than to build the wrong thing.

## 📋 Core Stack
- **Frontend**: Next.js 15.3.2 (App Router), React 18.2.0, TypeScript 5
- **UI**: Tailwind CSS v4, shadcn/ui, Radix UI  
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, RLS enabled)
- **Forms**: React Hook Form + Zod validation
- **External**: Shopify Admin API (READ-ONLY)

## 🔐 Authentication Pattern (Non-Negotiable)
```typescript
// Server Component / API Route
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser() // NEVER getSession()

// Always validate employee
const { data: employee } = await supabase
  .from('employees')
  .select('role, active')
  .eq('auth_user_id', user.id)
  .single()

if (!employee?.active) redirect('/login')
```

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

## 📊 Database Patterns
- **RLS**: MANDATORY on all tables
- **Queries**: Type-safe with generated types
- **Scope**: Always filter by current user/employee
- **Joins**: Use Supabase's nested selection
- **Indexes**: Add for RLS policy columns

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

## 🛡️ Security Rules
- Input validation: Zod schemas for ALL inputs
- Error format: `{ error: string }`
- No client-side secrets
- Never trust client data
- Always use HTTPS
- Rate limit sensitive endpoints

## 🎨 UI/UX Standards
- **Mobile-first**: Worker interfaces must work on phones/tablets
- **Components**: Use shadcn/ui (`npx shadcn@latest add`)
- **Icons**: Import individually from lucide-react
- **Colors**: Soft, friendly colors for buttons
- **Modals**: Contextual positioning, non-intrusive
- **Dark mode**: Support via CSS variables

## 🚫 Forbidden Patterns
- `@supabase/auth-helpers-nextjs` (use `@supabase/ssr`)
- `getSession()` server-side (use `getUser()`)
- Writing to Shopify (READ-ONLY integration)
- `any` type in TypeScript
- Hardcoded IDs or credentials
- Client-side database access
- localStorage for sensitive data
- Orphaned pages without navigation

## 📝 Quick Reference
```bash
# Development
npm run dev          # Start development
npm run build        # Check for errors before committing

# Database  
npx supabase gen types typescript > types/database.types.ts
npx supabase db push # Push migrations

# UI Components
npx shadcn@latest add [component]
```

## 🔄 External Integrations
- **Shopify**: READ-ONLY via Edge Functions
- **PDF**: Server-side for complex, client for simple
- **Validate**: All external data server-side
- **Errors**: Graceful degradation if services fail

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
**Remember**: When in doubt, ASK. Check `/manager/logs` for debugging. Always run `npm run build` before committing.