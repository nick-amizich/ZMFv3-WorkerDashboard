import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get Shopify settings
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'shopify_config')
      .single()
    
    if (settingsError) {
      // If table doesn't exist or no settings found
      return NextResponse.json({ 
        configured: false,
        connected: false 
      })
    }
    
    if (!settings?.value) {
      return NextResponse.json({ 
        configured: false,
        connected: false 
      })
    }
    
    const config = settings.value as any
    
    // Check if we have credentials
    if (!config.store_domain || !config.api_access_token) {
      return NextResponse.json({ 
        configured: false,
        connected: false 
      })
    }
    
    // Quick connection test - just check if we can reach the API
    try {
      const response = await fetch(
        `https://${config.store_domain}/admin/api/2024-01/shop.json`,
        {
          headers: {
            'X-Shopify-Access-Token': config.api_access_token,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        }
      )
      
      return NextResponse.json({ 
        configured: true,
        connected: response.ok,
        sync_enabled: config.sync_enabled || false
      })
    } catch {
      return NextResponse.json({ 
        configured: true,
        connected: false,
        sync_enabled: config.sync_enabled || false
      })
    }
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json({ 
      configured: false,
      connected: false 
    })
  }
}