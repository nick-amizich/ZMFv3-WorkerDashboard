-- Script to create a worker record for your user
-- Replace 'YOUR_EMAIL_HERE' with your actual email address
-- Replace 'YOUR_USER_ID_HERE' with your auth user ID from Supabase Studio

-- First, let's see what users exist in auth.users
SELECT id, email, created_at FROM auth.users;

-- Create a worker record (replace the values below)
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
    'YOUR_USER_ID_HERE',  -- Replace with your user ID from above query
    'YOUR_EMAIL_HERE',    -- Replace with your email
    'Your Name',          -- Replace with your name
    'manager',            -- Set as manager so you can access everything
    true,                 -- Active
    'approved',           -- Pre-approved
    ARRAY[]::text[],      -- Empty skills array
    NOW()
);

-- Verify the worker was created
SELECT * FROM public.workers WHERE email = 'YOUR_EMAIL_HERE'; 