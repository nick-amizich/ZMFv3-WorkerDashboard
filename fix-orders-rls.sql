-- Fix the infinite recursion in orders table RLS policies
-- First, check what policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'orders';

-- Drop all existing policies on orders table to start fresh
DROP POLICY IF EXISTS "Enable read access for all users" ON public.orders;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.orders;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.orders;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON public.orders;

-- Create simple, non-recursive policies for orders
-- Allow authenticated users to read all orders
CREATE POLICY "authenticated_read_orders" 
    ON public.orders 
    FOR SELECT 
    TO authenticated 
    USING (true);

-- Allow service role to insert/update orders (for sync)
CREATE POLICY "service_insert_orders" 
    ON public.orders 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

CREATE POLICY "service_update_orders" 
    ON public.orders 
    FOR UPDATE 
    TO authenticated 
    USING (true);

-- If you want manager-only access, use this instead:
-- CREATE POLICY "managers_read_orders" 
--     ON public.orders 
--     FOR SELECT 
--     TO authenticated 
--     USING (
--         auth.uid() IN (
--             SELECT auth_user_id 
--             FROM public.workers 
--             WHERE role IN ('manager', 'supervisor') 
--             AND is_active = true
--         )
--     );

-- Verify the new policies
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'orders';