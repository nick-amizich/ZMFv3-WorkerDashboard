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
      .select('id, name, role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Get notification preferences for this worker
    const { data: preferences, error: prefError } = await (supabase as any)
      .from('notification_preferences')
      .select('*')
      .eq('worker_id', worker.id)
      .single()
    
    if (prefError && prefError.code !== 'PGRST116') {
      console.error('Error fetching notification preferences:', prefError)
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
    }
    
    // Return preferences or defaults
    const defaultPreferences = {
      worker_id: worker.id,
      slack_enabled: true,
      slack_username: null,
      email_enabled: false,
      issue_notifications: true,
      workflow_notifications: worker.role === 'manager' || worker.role === 'supervisor',
      daily_summary: false,
      bottleneck_alerts: worker.role === 'manager' || worker.role === 'supervisor',
      mention_on_urgent: true
    }
    
    return NextResponse.json(preferences || defaultPreferences)
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
      .select('id, name, role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const {
      slack_enabled,
      slack_username,
      email_enabled,
      issue_notifications,
      workflow_notifications,
      daily_summary,
      bottleneck_alerts,
      mention_on_urgent
    } = body
    
    // Prepare preferences data
    const preferencesData = {
      worker_id: worker.id,
      slack_enabled: slack_enabled !== undefined ? slack_enabled : true,
      slack_username: slack_username || null,
      email_enabled: email_enabled !== undefined ? email_enabled : false,
      issue_notifications: issue_notifications !== undefined ? issue_notifications : true,
      workflow_notifications: workflow_notifications !== undefined ? workflow_notifications : false,
      daily_summary: daily_summary !== undefined ? daily_summary : false,
      bottleneck_alerts: bottleneck_alerts !== undefined ? bottleneck_alerts : false,
      mention_on_urgent: mention_on_urgent !== undefined ? mention_on_urgent : true,
      updated_at: new Date().toISOString()
    }
    
    // Upsert preferences (insert or update)
    const { data: preferences, error: upsertError } = await (supabase as any)
      .from('notification_preferences')
      .upsert(preferencesData, { 
        onConflict: 'worker_id',
        ignoreDuplicates: false 
      })
      .select('*')
      .single()
    
    if (upsertError) {
      console.error('Error saving notification preferences:', upsertError)
      return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      message: 'Notification preferences saved successfully',
      preferences
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
      .select('id, name, role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    
    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    
    const allowedFields = [
      'slack_enabled', 'slack_username', 'email_enabled', 
      'issue_notifications', 'workflow_notifications', 
      'daily_summary', 'bottleneck_alerts', 'mention_on_urgent'
    ]
    
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    })
    
    // Update existing preferences
    const { data: preferences, error: updateError } = await (supabase as any)
      .from('notification_preferences')
      .update(updateData)
      .eq('worker_id', worker.id)
      .select('*')
      .single()
    
    if (updateError) {
      console.error('Error updating notification preferences:', updateError)
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      message: 'Notification preferences updated successfully',
      preferences
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 