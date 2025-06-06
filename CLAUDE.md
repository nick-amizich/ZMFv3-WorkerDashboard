# Claude Development Guidelines

This document contains important guidelines for Claude when working on this codebase.


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


## Styling and Theming Guidelines

### NEVER Hardcode Colors

This application supports dark mode and custom theming. To maintain flexibility and consistency:

**❌ NEVER use hardcoded color classes like:**
- `bg-white`, `bg-gray-50`, `bg-gray-100`, etc.
- `text-gray-900`, `text-gray-700`, `text-gray-500`, etc.
- `border-gray-200`, `border-gray-300`, etc.
- Any specific color like `bg-blue-500`, `text-green-600`, etc.

**✅ ALWAYS use theme-aware classes:**
- `bg-background` - Main page background
- `bg-card` - Card and elevated surfaces
- `bg-muted` - Muted backgrounds
- `text-foreground` - Primary text
- `text-muted-foreground` - Secondary/muted text
- `border-border` - All borders
- `bg-primary`, `text-primary` - Primary brand color
- `bg-secondary`, `text-secondary` - Secondary elements
- `bg-destructive`, `text-destructive` - Error states

**For status colors that need dark mode variants:**
```jsx
// ❌ Wrong
<div className="text-green-600">Success</div>

// ✅ Correct
<div className="text-green-500 dark:text-green-400">Success</div>
```

**For semi-transparent backgrounds:**
```jsx
// ❌ Wrong
<div className="bg-red-50">Error</div>

// ✅ Correct
<div className="bg-red-500/10 dark:bg-red-500/20">Error</div>
```

### Component Styling Best Practices

1. **Always use CSS variables** defined in `globals.css` for theming
2. **Use Tailwind's dark mode utilities** when specific dark mode styling is needed
3. **Test all components** in both light and dark mode
4. **Avoid inline styles** unless absolutely necessary
5. **Use the theme toggle** in navigation to verify appearance

### Layout Components

Layout files (`layout.tsx`) should ALWAYS use theme-aware backgrounds:
- Main wrapper: `bg-background`
- Headers/Navigation: `bg-card` or `bg-background`
- Secondary sections: `bg-muted`

Remember: The goal is to make the application easily re-skinnable and maintainable. Hardcoded colors break this flexibility and create inconsistent user experiences.

## Running Linting and Type Checking

After making changes, always run:
```bash
npm run lint
npm run typecheck
```

Address any errors before considering the task complete.

## Testing Dark Mode

1. Navigate to any page in the application
2. Click the sun/moon icon in the navigation bar
3. Verify all elements properly change colors
4. Check for any remaining white/light backgrounds
5. Ensure text remains readable with proper contrast

## Additional Development Notes

- The application uses Supabase for the backend
- Authentication is handled via Supabase Auth
- The database schema is managed through migrations
- Component library is based on shadcn/ui
- Styling uses Tailwind CSS with custom theme configuration