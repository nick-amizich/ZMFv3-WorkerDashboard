-- Check all policies on order-related tables
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('orders', 'order_items', 'work_tasks')
ORDER BY tablename, policyname;

-- Drop ALL policies on orders and order_items tables
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on orders
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'orders' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.orders', pol.policyname);
    END LOOP;
    
    -- Drop all policies on order_items
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'order_items' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.order_items', pol.policyname);
    END LOOP;
END $$;

-- Temporarily disable RLS on both tables to test
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('orders', 'order_items')
AND schemaname = 'public';