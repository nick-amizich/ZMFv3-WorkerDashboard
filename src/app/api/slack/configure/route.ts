import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // ALWAYS validate employee status
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active || !['manager', 'supervisor'].includes(worker.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Get current Slack configuration (using type assertion for new table)
    const { data: config, error: configError } = await (supabase as any)
      .from('slack_configurations')
      .select('*')
      .eq('is_active', true)
      .single()
    
    if (configError && configError.code !== 'PGRST116') {
      console.error('Error fetching Slack config:', configError)
      return NextResponse.json({ error: 'Failed to fetch configuration' }, { status: 500 })
    }
    
    // Don't return the webhook URL for security
    if (config) {
      const { webhook_url, ...safeConfig } = config
      return NextResponse.json({
        ...safeConfig,
        has_webhook: !!webhook_url
      })
    }
    
    return NextResponse.json({ configured: false })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // ALWAYS validate employee status
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active || !['manager', 'supervisor'].includes(worker.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const { 
      workspace_name, 
      webhook_url, 
      default_channel = '#production',
      notification_channels = {
        issues: '#production-issues',
        workflows: '#production-flow',
        daily_summary: '#production-summary'
      }
    } = body
    
    // Validate required fields
    if (!workspace_name || !webhook_url) {
      return NextResponse.json({ 
        error: 'workspace_name and webhook_url are required' 
      }, { status: 400 })
    }
    
    // Validate webhook URL format
    if (!webhook_url.startsWith('https://hooks.slack.com/')) {
      return NextResponse.json({ 
        error: 'Invalid webhook URL format' 
      }, { status: 400 })
    }
    
    // Deactivate existing configurations
    await (supabase as any)
      .from('slack_configurations')
      .update({ is_active: false })
      .eq('is_active', true)
    
    // Create new configuration
    const { data: config, error: createError } = await (supabase as any)
      .from('slack_configurations')
      .insert({
        workspace_name,
        webhook_url,
        default_channel,
        notification_channels,
        created_by_id: worker.id,
        is_active: true
      })
      .select('id, workspace_name, default_channel, notification_channels, created_at')
      .single()
    
    if (createError) {
      console.error('Error creating Slack config:', createError)
      return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      message: 'Slack configuration saved successfully',
      config
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // ALWAYS validate employee status
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active || !['manager', 'supervisor'].includes(worker.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const { 
      workspace_name, 
      default_channel,
      notification_channels
    } = body
    
    // Update existing active configuration (without webhook URL unless provided)
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    
    if (workspace_name) updateData.workspace_name = workspace_name
    if (default_channel) updateData.default_channel = default_channel
    if (notification_channels) updateData.notification_channels = notification_channels
    
    const { data: config, error: updateError } = await (supabase as any)
      .from('slack_configurations')
      .update(updateData)
      .eq('is_active', true)
      .select('id, workspace_name, default_channel, notification_channels, updated_at')
      .single()
    
    if (updateError) {
      console.error('Error updating Slack config:', updateError)
      return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      message: 'Slack configuration updated successfully',
      config
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 