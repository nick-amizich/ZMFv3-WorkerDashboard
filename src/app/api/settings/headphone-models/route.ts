import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { clearHeadphoneModelsCache } from '@/lib/shopify/sync'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate manager permissions
    const { data: worker } = await supabase
      .from('workers')
      .select('role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active || !['manager', 'supervisor'].includes(worker.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Get headphone models from settings
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'headphone_models')
      .single()
    
    if (settingsError && settingsError.code !== 'PGRST116') {
      throw settingsError
    }
    
    // Default models if none exist
    const defaultModels = [
      'Caldera', 'Auteur', 'Atticus', 'Aeon', 'Eikon', 'Aeolus', 'Verite'
    ]
    
    const models = settings?.value as string[] || defaultModels
    
    return NextResponse.json({ 
      success: true, 
      models: models.map((name: string) => ({
        name,
        is_active: true
      }))
    })
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
    
    // Validate manager permissions
    const { data: worker } = await supabase
      .from('workers')
      .select('role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active || worker.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden - Manager role required' }, { status: 403 })
    }
    
    const body = await request.json()
    const { models } = body
    
    if (!Array.isArray(models)) {
      return NextResponse.json({ error: 'Models must be an array' }, { status: 400 })
    }
    
    // Validate model names
    const validModels = models.filter((model: any) => 
      typeof model === 'string' && model.trim().length > 0
    ).map((model: string) => model.trim())
    
    if (validModels.length === 0) {
      return NextResponse.json({ error: 'At least one valid model name required' }, { status: 400 })
    }
    
    // Save to settings
    const { error: saveError } = await supabase
      .from('settings')
      .upsert({
        key: 'headphone_models',
        value: validModels,
        encrypted: false
      })
    
    if (saveError) {
      throw saveError
    }
    
    // Clear cache
    await clearHeadphoneModelsCache()
    
    return NextResponse.json({ 
      success: true, 
      message: `Updated ${validModels.length} headphone models`,
      models: validModels.map((name: string) => ({
        name,
        is_active: true
      }))
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 