import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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
    
    if (!worker?.is_active || !['manager', 'supervisor'].includes(worker.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const { webhook_url, channel = '#production' } = body
    
    if (!webhook_url) {
      return NextResponse.json({ 
        error: 'webhook_url is required' 
      }, { status: 400 })
    }
    
    // Test message payload
    const testMessage = {
      channel: channel,
      username: 'ZMF Production Bot',
      icon_emoji: ':gear:',
      text: `🧪 *Slack Integration Test*`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🧪 Slack Integration Test'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Tested by:* ${worker.name}`
            },
            {
              type: 'mrkdwn',
              text: `*Time:* ${new Date().toLocaleString()}`
            },
            {
              type: 'mrkdwn',
              text: `*Channel:* ${channel}`
            },
            {
              type: 'mrkdwn',
              text: `*Status:* ✅ Connection successful`
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: 'ZMF Worker Management System is now connected to Slack! 🎉'
            }
          ]
        }
      ]
    }
    
    // Send test message to Slack
    const slackResponse = await fetch(webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage)
    })
    
    if (!slackResponse.ok) {
      const errorText = await slackResponse.text()
      console.error('Slack webhook error:', errorText)
      
      return NextResponse.json({ 
        success: false,
        error: `Slack webhook failed: ${slackResponse.status} ${slackResponse.statusText}`,
        details: errorText
      }, { status: 400 })
    }
    
    // Log successful test
    await (supabase as any)
      .from('slack_messages')
      .insert({
        message_ts: Date.now().toString(),
        channel: channel,
        message_type: 'slack_test',
        message_content: 'Slack integration test message',
        sent_successfully: true
      })
    
    return NextResponse.json({ 
      success: true,
      message: 'Test message sent successfully to Slack',
      channel: channel,
      tested_by: worker.name,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Slack test error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to test Slack connection',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 