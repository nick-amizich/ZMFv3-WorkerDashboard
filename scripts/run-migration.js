const { createClient } = require('@supabase/supabase-js')

// Get credentials from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kjdicpudxqxenhjwdrzg.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqZGljcHVkeHF4ZW5oandkcnpnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODAzMDEwMywiZXhwIjoyMDYzNjA2MTAzfQ.YaE54jjrZdJ8URdHHuzgIJnClKFENRo7QbGnyJdIsww'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const migrationSQL = `
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
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'settings' 
        AND policyname = 'Managers can view settings'
    ) THEN
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
    END IF;
END $$;

-- Only managers can update settings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'settings' 
        AND policyname = 'Managers can update settings'
    ) THEN
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
    END IF;
END $$;

-- Only managers can insert settings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'settings' 
        AND policyname = 'Managers can insert settings'
    ) THEN
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
    END IF;
END $$;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_settings_updated_at ON public.settings;
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
`

async function runMigration() {
  console.log('Running settings table migration...')
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    })
    
    if (error) {
      // If RPC doesn't exist, try direct query
      const { error: queryError } = await supabase
        .from('settings')
        .select('count')
        .limit(1)
      
      if (queryError && queryError.code === '42P01') {
        console.error('Cannot run migration automatically. Please run the SQL manually in Supabase dashboard.')
        console.log('\nSQL to run:')
        console.log('=' * 50)
        console.log(migrationSQL)
        console.log('=' * 50)
        return
      }
    }
    
    // Verify table was created
    const { data: settings, error: checkError } = await supabase
      .from('settings')
      .select('*')
      .eq('key', 'shopify_config')
      .single()
    
    if (!checkError) {
      console.log('✅ Migration completed successfully!')
      console.log('Settings table created and default config inserted.')
    } else {
      console.error('❌ Migration may have failed:', checkError)
    }
  } catch (err) {
    console.error('Error running migration:', err)
    console.log('\nPlease run the migration manually in your Supabase SQL editor.')
  }
}

runMigration()