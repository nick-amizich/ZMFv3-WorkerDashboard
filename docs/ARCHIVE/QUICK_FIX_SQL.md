# Quick Fix for Missing Worker Entries

## The Problem
You have 6 users in auth.users but only 1 in the workers table. The other 5 users can't log in or be approved because they don't have worker entries.

## The Solution
Run this SQL query in your Supabase SQL Editor:

```sql
-- Step 1: See which auth users are missing worker entries
SELECT 
    au.id,
    au.email,
    au.created_at,
    au.email_confirmed_at
FROM auth.users au
LEFT JOIN public.workers w ON w.auth_user_id = au.id
WHERE w.id IS NULL;

-- Step 2: Create pending worker entries for ALL missing users
INSERT INTO public.workers (
    auth_user_id,
    email,
    name,
    role,
    is_active,
    approval_status,
    skills
)
SELECT 
    au.id,
    au.email,
    split_part(au.email, '@', 1) as name,
    'worker' as role,
    false as is_active,
    'pending' as approval_status,
    ARRAY[]::text[] as skills
FROM auth.users au
LEFT JOIN public.workers w ON w.auth_user_id = au.id
WHERE w.id IS NULL;

-- Step 3: Verify it worked
SELECT * FROM workers ORDER BY created_at DESC;
```

## After Running the SQL

1. Go to `/manager/users`
2. You should now see 5 pending approvals
3. Approve each user as needed
4. Users can now log in after approval!

## Why This Happened

When users register:
1. Supabase creates an entry in `auth.users` ✓
2. Your app tries to create an entry in `workers` table
3. If step 2 fails (due to errors, duplicate emails, etc.), the user is stuck

This SQL fixes all orphaned users at once.