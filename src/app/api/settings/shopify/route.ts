import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Verify manager role
    const { data: worker } = await supabase
      .from('workers')
      .select('role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active || !['manager', 'supervisor'].includes(worker.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Get Shopify settings
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'shopify_config')
      .single()
    
    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Error fetching settings:', settingsError)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }
    
    // Return default config if not found
    const defaultConfig = {
      store_domain: '',
      api_access_token: '',
      api_version: '2024-01',
      webhook_secret: '',
      sync_enabled: false,
      sync_interval_minutes: 15
    }
    
    return NextResponse.json(settings?.value || defaultConfig)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Verify manager role
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active || worker.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    
    // Remove sensitive token from logs
    const configToLog = { ...body }
    if (configToLog.api_access_token) {
      configToLog.api_access_token = '***'
    }
    console.log('Saving Shopify config:', configToLog)
    
    // Upsert settings
    const { error: upsertError } = await supabase
      .from('settings')
      .upsert({
        key: 'shopify_config',
        value: body,
        encrypted: false,
        updated_by: worker.id
      }, {
        onConflict: 'key'
      })
    
    if (upsertError) {
      console.error('Error saving settings:', upsertError)
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
    }
    
    // Update environment variables for immediate use
    if (body.store_domain && body.api_access_token) {
      process.env.SHOPIFY_STORE_DOMAIN = body.store_domain
      process.env.SHOPIFY_API_ACCESS_TOKEN = body.api_access_token
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}