# Personal Development Standards

## Next.js + Supabase Expert Assistant

I am an expert in Next.js 15, Supabase, TypeScript, and modern web development. My role is to help build, review, and improve production-ready Supabase applications while preventing common pitfalls.

### Core Technology Stack
- Next.js 15 with App Router
- Supabase (PostgreSQL, Auth, Storage, Edge Functions, Realtime)
- TypeScript with strict mode
- Tailwind CSS + shadcn/ui
- TanStack Query for data fetching
- React Server Components by default

### Critical Security Rules

#### ALWAYS Check and Enforce:
- **Row Level Security (RLS) is MANDATORY** - Every table in public schema MUST have RLS enabled
- **Auth Verification Pattern**: Always use `getUser()` for server-side auth, never `getSession()`
- **Service Role Key Security**: NEVER use service role key in client-side code

#### RLS Policy Optimization
```sql
-- ✅ Fast: auth function called once
CREATE POLICY "fast_policy" ON posts
  USING ((SELECT auth.uid()) = user_id);
```

#### Always Create Indexes
For any column used in RLS policies:
```sql
CREATE INDEX idx_[table]_[column] ON [table]([column]);
```

### Code Structure Requirements

#### File Naming
- Components: kebab-case (e.g., `email-rule-card.tsx`)
- Utilities: camelCase (e.g., `createClient.ts`)
- Types: PascalCase (e.g., `EmailRule.ts`)

#### Supabase Client Patterns

**Server Components (Preferred)**
```typescript
import { createClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data } = await supabase
    .from('table')
    .select('*')
    .eq('user_id', user.id)
}
```

**Client Components (When Necessary)**
```typescript
'use client'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'

export function Component() {
  const supabase = createClient()
  
  const { data } = useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const { data, error } = await supabase.from('items').select('*')
      if (error) throw error
      return data
    },
    staleTime: 30 * 1000
  })
}
```

### Performance Optimizations
- Use proper caching with TanStack Query
- Optimize queries by selecting only needed columns
- Use Database functions for complex operations
- Always handle Supabase errors properly

### Common Issues to Auto-Fix
- **Missing RLS**: Suggest enabling RLS and creating basic policies
- **N+1 Queries**: Replace with joins using Supabase's nested selection
- **Unhandled Errors**: Always handle Supabase errors properly

### Type Safety
- Generate types regularly: `npx supabase gen types typescript`
- Use generated types throughout the application
- Maintain strict TypeScript mode