-- Create Nick's worker record
-- Run this in Supabase Studio SQL Editor

-- Step 1: Check if user exists in auth.users
SELECT id, email, created_at FROM auth.users WHERE email = 'nick@vokyl.io';

-- Step 2: If user exists, get the ID and use it below
-- If user doesn't exist, you'll need to sign up first through the app

-- Step 3: Create worker record (replace USER_ID_HERE with actual ID from Step 1)
INSERT INTO public.workers (
    auth_user_id,
    email,
    name,
    role,
    is_active,
    approval_status,
    skills,
    created_at,
    updated_at
) VALUES (
    'USER_ID_HERE',  -- Replace with your actual user ID
    'nick@vokyl.io',
    'Nick',
    'manager',       -- Manager role for full access
    true,            -- Active
    'approved',      -- Pre-approved
    ARRAY[]::text[], -- Empty skills array
    NOW(),
    NOW()
);

-- Step 4: Verify the worker was created
SELECT * FROM workers WHERE email = 'nick@vokyl.io';

-- Step 5: Check if you can query as the user (this should work after login)
-- SELECT * FROM workers WHERE auth_user_id = auth.uid(); 