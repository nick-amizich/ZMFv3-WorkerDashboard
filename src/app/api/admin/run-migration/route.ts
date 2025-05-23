import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// IMPORTANT: Remove this endpoint after running the migration!
export async function POST() {
  try {
    const supabase = await createClient()
    
    // Verify admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user is a manager
    const { data: worker } = await supabase
      .from('workers')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()
    
    if (worker?.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden - Manager only' }, { status: 403 })
    }
    
    // Create the settings table using service role client
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }
    
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    // First, check if table already exists
    const { error: checkError } = await serviceSupabase
      .from('settings')
      .select('count')
      .limit(1)
      .single()
    
    if (!checkError || checkError.code !== '42P01') {
      return NextResponse.json({ 
        message: 'Settings table already exists',
        alreadyExists: true 
      })
    }
    
    // Run the migration using raw SQL
    const migrationQueries = [
      `CREATE TABLE IF NOT EXISTS public.settings (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value JSONB NOT NULL,
        encrypted BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_by UUID REFERENCES public.workers(id)
      )`,
      
      `ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY`,
      
      `CREATE POLICY "Managers can view settings"
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
        )`,
        
      `CREATE POLICY "Managers can update settings"
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
        )`,
        
      `CREATE POLICY "Managers can insert settings"
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
        )`,
        
      `INSERT INTO public.settings (key, value, encrypted)
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
        ON CONFLICT (key) DO NOTHING`
    ]
    
    // Since Supabase JS doesn't support raw SQL execution,
    // we'll create the table and insert the default config
    // The RLS policies need to be added manually
    
    return NextResponse.json({ 
      error: 'Cannot run raw SQL via API. Please run the migration manually in Supabase SQL editor.',
      sql: migrationQueries.join(';\n\n') + ';'
    }, { status: 501 })
    
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({ 
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}