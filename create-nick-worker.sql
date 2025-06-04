-- Script to create a worker record for nick@vokyl.io
-- Step 1: Find your user ID
SELECT id, email, created_at FROM auth.users WHERE email = 'nick@vokyl.io';

-- Step 2: Create worker record (you'll need to replace USER_ID_FROM_ABOVE with the actual ID)
-- Copy the ID from the query above and paste it in the INSERT below

-- Step 3: Insert worker record
INSERT INTO public.workers (
    auth_user_id,
    email,
    name,
    role,
    is_active,
    approval_status,
    skills,
    created_at
) VALUES (
    'PASTE_USER_ID_HERE',  -- Replace with the ID from Step 1
    'nick@vokyl.io',
    'Nick',
    'manager',             -- Manager role gives full access
    true,                  -- Active
    'approved',            -- Pre-approved
    ARRAY[]::text[],       -- Empty skills array
    NOW()
);

-- Step 4: Verify the worker was created
SELECT * FROM public.workers WHERE email = 'nick@vokyl.io'; 