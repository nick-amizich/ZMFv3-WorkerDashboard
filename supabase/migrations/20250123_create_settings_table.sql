-- Create settings table for storing application configuration
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    encrypted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES public.workers(id)
);

-- Add RLS policies
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Only managers can view settings
CREATE POLICY "Managers can view settings"
    ON public.settings
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.workers
            WHERE workers.auth_user_id = auth.uid()
            AND workers.role IN ('manager', 'supervisor')
            AND workers.is_active = true
        )
    );

-- Only managers can update settings
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

-- Only managers can insert settings
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

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON public.settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default Shopify settings
INSERT INTO public.settings (key, value, encrypted)
VALUES (
    'shopify_config',
    jsonb_build_object(
        'store_domain', '',
        'api_version', '2024-01',
        'webhook_secret', '',
        'sync_enabled', false,
        'sync_interval_minutes', 15
    ),
    false
)
ON CONFLICT (key) DO NOTHING;