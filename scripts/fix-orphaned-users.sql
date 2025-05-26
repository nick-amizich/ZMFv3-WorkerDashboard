-- This script finds auth users without worker entries and creates pending worker entries for them

-- First, let's see what we're dealing with
SELECT 
    au.id as auth_user_id,
    au.email,
    au.created_at,
    au.email_confirmed_at,
    w.id as worker_id
FROM auth.users au
LEFT JOIN public.workers w ON w.auth_user_id = au.id
WHERE w.id IS NULL
ORDER BY au.created_at;

-- Create worker entries for all orphaned auth users
-- IMPORTANT: Review the SELECT results above before running this INSERT
INSERT INTO public.workers (
    auth_user_id,
    email,
    name,
    role,
    is_active,
    approval_status,
    skills,
    created_at
)
SELECT 
    au.id,
    au.email,
    COALESCE(
        au.raw_user_meta_data->>'name',
        au.raw_user_meta_data->>'full_name',
        split_part(au.email, '@', 1)
    ) as name,
    'worker' as role,
    false as is_active,
    'pending' as approval_status,
    ARRAY[]::text[] as skills,
    au.created_at
FROM auth.users au
LEFT JOIN public.workers w ON w.auth_user_id = au.id
WHERE w.id IS NULL;

-- Verify the results
SELECT 
    w.*,
    au.email_confirmed_at
FROM public.workers w
JOIN auth.users au ON au.id = w.auth_user_id
ORDER BY w.created_at DESC;