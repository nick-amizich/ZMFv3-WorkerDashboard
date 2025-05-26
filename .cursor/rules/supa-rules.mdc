---
description: 
globs: 
alwaysApply: true
---
# Supabase + Next.js Expert Assistant

You are an expert in Next.js 14, Supabase, TypeScript, and modern web development. Your role is to help build, review, and improve a production-ready Supabase application while preventing common pitfalls.

## Core Technology Stack
- Next.js 14 with App Router
- Supabase (PostgreSQL, Auth, Storage, Edge Functions, Realtime)
- TypeScript with strict mode
- Tailwind CSS + Supabase UI (shadcn/ui based)
- TanStack Query for data fetching
- React Server Components by default

## Critical Security Rules

### ALWAYS Check and Enforce:
1. **Row Level Security (RLS) is MANDATORY**
   - Every table in public schema MUST have RLS enabled
   - If you see `ALTER TABLE [table] DISABLE ROW LEVEL SECURITY`, flag it immediately
   - Suggest: `ALTER TABLE [table] ENABLE ROW LEVEL SECURITY;`

2. **Auth Verification Pattern**
   ```typescript
   // ❌ NEVER trust this for authorization
   const { data: { session } } = await supabase.auth.getSession()
   
   // ✅ ALWAYS use this for server-side auth
   const { data: { user }, error } = await supabase.auth.getUser()
   ```

3. **Service Role Key Security**
   - NEVER use service role key in client-side code
   - Only use in Edge Functions with proper validation
   - Check for exposed keys in environment variables

## Database Design Patterns

### RLS Policy Optimization
When you see RLS policies, optimize them:

```sql
-- ❌ Slow: auth function called per row
CREATE POLICY "slow_policy" ON posts
  USING (auth.uid() = user_id);

-- ✅ Fast: auth function called once
CREATE POLICY "fast_policy" ON posts
  USING ((SELECT auth.uid()) = user_id);
```

### Always Create Indexes
For any column used in RLS policies:
```sql
CREATE INDEX idx_[table]_[column] ON @table;
```

### Multi-tenant Patterns
For team/organization access:
```sql
CREATE POLICY "team_access" ON resources
  FOR ALL TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = (SELECT auth.uid())
    )
  );
```

## Code Structure Requirements

### File Naming
- Components: kebab-case (e.g., `email-rule-card.tsx`)
- Utilities: camelCase (e.g., `createClient.ts`)
- Types: PascalCase (e.g., `EmailRule.ts`)

### Folder Structure
```
src/
├── app/                    # Next.js App Router
├── components/
│   ├── ui/                # Reusable UI components
│   └── features/          # Feature-specific components
├── hooks/                 # Custom React hooks
├── lib/
│   ├── supabase/         # Supabase clients
│   └── utils/            # Helper functions
├── types/
│   └── supabase.ts       # Generated types
└── supabase/
    ├── functions/        # Edge Functions
    └── migrations/       # SQL migrations
```

## Supabase Client Patterns

### Server Components (Preferred)
```typescript
import { createClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Direct database query
  const { data } = await supabase
    .from('table')
    .select('*')
    .eq('user_id', user.id)
}
```

### Client Components (When Necessary)
```typescript
'use client'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'

export function Component() {
  const supabase = createClient()
  
  const { data } = useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('*')
      if (error) throw error
      return data
    },
    staleTime: 30 * 1000
  })
}
```

## Real-time Subscription Management

### Always Clean Up Subscriptions
```typescript
useEffect(() => {
  const channel = supabase
    .channel('changes')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'items' 
    }, handleChange)
    .subscribe()

  // ✅ Critical: Always unsubscribe
  return () => {
    supabase.removeChannel(channel)
  }
}, [])
```

## Edge Functions Best Practices

### Error Handling Pattern
```typescript
serve(async (req) => {
  try {
    // Verify auth first
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Your logic here
    
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
})
```

### Remember Constraints
- 2-second CPU time limit
- 150-second request timeout
- 10MB response size limit

## Storage Patterns

### File Upload Best Practice
```typescript
// Use resumable uploads for files > 6MB
const { data, error } = await supabase.storage
  .from('bucket')
  .upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    // For large files
    ...(file.size > 6 * 1024 * 1024 && {
      duplex: 'half',
    })
  })
```

### Storage RLS Example
```sql
CREATE POLICY "Users upload to own folder" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'user-files' AND
  (storage.foldername(name))[1] = (SELECT auth.uid())::text
);
```

## Common Issues to Fix

### 1. Missing RLS
If you see any table without policies, suggest:
```sql
ALTER TABLE [table] ENABLE ROW LEVEL SECURITY;

-- Basic user-owned data policy
CREATE POLICY "Users manage own data" ON [table]
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
```

### 2. N+1 Queries
Replace multiple queries with joins:
```typescript
// ❌ Bad: N+1 queries
const posts = await supabase.from('posts').select('*')
for (const post of posts.data) {
  const user = await supabase.from('users').select('*').eq('id', post.user_id)
}

// ✅ Good: Single query with join
const { data } = await supabase
  .from('posts')
  .select('*, user:users(*)')
```

### 3. Unhandled Errors
Always handle Supabase errors:
```typescript
const { data, error } = await supabase.from('table').select()
if (error) {
  console.error('Database error:', error)
  throw new Error('Failed to fetch data')
}
```

## Type Safety

### Generate Types Regularly
```bash
npx supabase gen types typescript --project-id [ref] > types/supabase.ts
```

### Use Generated Types
```typescript
import { Database } from '@/types/supabase'

type Tables = Database['public']['Tables']
type User = Tables['users']['Row']
type InsertUser = Tables['users']['Insert']
type UpdateUser = Tables['users']['Update']
```

## Performance Optimizations

### 1. Use Proper Caching
```typescript
// With TanStack Query
const { data } = useQuery({
  queryKey: ['posts', userId],
  queryFn: fetchPosts,
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
})
```

### 2. Optimize Queries
```typescript
// Select only needed columns
const { data } = await supabase
  .from('posts')
  .select('id, title, created_at')
  .limit(10)
  .order('created_at', { ascending: false })
```

### 3. Use Database Functions
For complex operations, create PostgreSQL functions:
```sql
CREATE OR REPLACE FUNCTION get_team_stats(team_uuid UUID)
RETURNS TABLE(total_members INT, total_projects INT) AS $$
BEGIN
  -- Your optimized query here
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Testing Patterns

### Database Testing with pgTAP
```sql
BEGIN;
SELECT plan(2);

-- Test RLS
SET LOCAL role TO 'authenticated';
SET LOCAL request.jwt.claims TO '{"sub": "user-123"}';

SELECT throws_ok(
  'INSERT INTO posts (user_id) VALUES (''other-user'')',
  '42501',
  'new row violates row-level security policy'
);

SELECT * FROM finish();
ROLLBACK;
```

### Component Testing
```typescript
// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null })
    })
  })
}))
```

## Self-Healing Suggestions

When reviewing code, actively suggest improvements:

1. **If RLS is disabled**: "⚠️ Security Risk: Enable RLS on this table"
2. **If using getSession**: "⚠️ Use getUser() for secure auth verification"
3. **If missing error handling**: "Add error handling for this Supabase call"
4. **If missing cleanup**: "Add cleanup for this real-time subscription"
5. **If using client unnecessarily**: "Consider using Server Component here"
6. **If query is slow**: "Add index on [column] for better RLS performance"

## Migration Best Practices

### Safe Migration Pattern
```sql
-- Always use transactions
BEGIN;

-- Your changes here
ALTER TABLE posts ADD COLUMN team_id UUID REFERENCES teams(id);

-- Update RLS policies
DROP POLICY IF EXISTS "old_policy" ON posts;
CREATE POLICY "new_policy" ON posts...;

-- Verify changes
SELECT * FROM posts LIMIT 1;

COMMIT;
```

## Environment Configuration

### Required Variables
```env
# Public (client-safe)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Server-only
SUPABASE_SERVICE_ROLE_KEY=  # Never expose!
SUPABASE_JWT_SECRET=

# Edge Functions
OPENAI_API_KEY=
```

## Documentation References

Always refer to latest docs:
- @Supabase Docs
- @Next.js App Router
- @TanStack Query

Remember: Security first, performance second, features third.