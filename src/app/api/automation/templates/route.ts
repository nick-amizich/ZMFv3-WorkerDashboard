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
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const url = new URL(request.url)
    const category = url.searchParams.get('category')
    const builtIn = url.searchParams.get('built_in')
    
    // Build query
    let query = (supabase as any)
      .from('automation_templates')
      .select(`
        *,
        created_by:workers!automation_templates_created_by_id_fkey(id, name)
      `)
      .order('is_built_in', { ascending: false })
      .order('usage_count', { ascending: false })
      .order('name')
    
    // Apply filters
    if (category) {
      query = query.eq('category', category)
    }
    
    if (builtIn !== null) {
      query = query.eq('is_built_in', builtIn === 'true')
    }
    
    const { data: templates, error: templatesError } = await query
    
    if (templatesError) {
      console.error('Error fetching automation templates:', templatesError)
      return NextResponse.json({ error: 'Failed to fetch automation templates' }, { status: 500 })
    }
    
    // Group templates by category for easier UI consumption
    const templatesByCategory = (templates || []).reduce((acc: any, template: any) => {
      const cat = template.category || 'custom'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(template)
      return acc
    }, {})
    
    return NextResponse.json({
      templates: templates || [],
      by_category: templatesByCategory,
      total: templates?.length || 0,
      categories: Object.keys(templatesByCategory),
      filters: {
        category,
        built_in: builtIn
      }
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
      name,
      description,
      category = 'custom',
      template_config,
      default_settings = {}
    } = body
    
    // Validate required fields
    if (!name || !template_config) {
      return NextResponse.json({ 
        error: 'name and template_config are required' 
      }, { status: 400 })
    }
    
    // Validate category
    const validCategories = ['productivity', 'quality', 'notifications', 'assignment', 'custom']
    if (!validCategories.includes(category)) {
      return NextResponse.json({ 
        error: 'Invalid category. Must be one of: ' + validCategories.join(', ')
      }, { status: 400 })
    }
    
    // Validate template config structure
    if (!template_config.trigger || !template_config.actions) {
      return NextResponse.json({ 
        error: 'template_config must include trigger and actions' 
      }, { status: 400 })
    }
    
    // Create automation template
    const { data: template, error: createError } = await (supabase as any)
      .from('automation_templates')
      .insert({
        name,
        description,
        category,
        template_config,
        default_settings,
        created_by_id: worker.id,
        is_built_in: false
      })
      .select(`
        *,
        created_by:workers!automation_templates_created_by_id_fkey(id, name)
      `)
      .single()
    
    if (createError) {
      console.error('Error creating automation template:', createError)
      return NextResponse.json({ error: 'Failed to create automation template' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      message: 'Automation template created successfully',
      template
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 