-- Drop the existing insert policy
DROP POLICY IF EXISTS "Managers can insert settings" ON public.settings;

-- Create a new insert policy that allows managers to insert
CREATE POLICY "Managers can insert settings"
    ON public.settings
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workers
            WHERE workers.auth_user_id = auth.uid()
            AND workers.role = 'manager'
            AND workers.is_active = true
        )
    );

-- Also create an update policy if it doesn't exist
DROP POLICY IF EXISTS "Managers can update settings" ON public.settings;
CREATE POLICY "Managers can update settings"
    ON public.settings
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.workers
            WHERE workers.auth_user_id = auth.uid()
            AND workers.role = 'manager'
            AND workers.is_active = true
        )
    );

-- Create a policy for managers to delete if needed
DROP POLICY IF EXISTS "Managers can delete settings" ON public.settings;
CREATE POLICY "Managers can delete settings"
    ON public.settings
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.workers
            WHERE workers.auth_user_id = auth.uid()
            AND workers.role = 'manager'
            AND workers.is_active = true
        )
    );

-- Verify the policies
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
WHERE tablename = 'settings';