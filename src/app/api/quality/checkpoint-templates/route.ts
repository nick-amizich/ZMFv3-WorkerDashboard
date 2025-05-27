import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const checkpointTemplateSchema = z.object({
  stage_name: z.string().min(1, 'Stage name is required'),
  checkpoint_type: z.enum(['pre_work', 'in_process', 'post_work', 'gate']),
  template_name: z.string().min(1, 'Template name is required'),
  checks: z.array(z.object({
    id: z.string(),
    description: z.string().min(1, 'Description is required'),
    requires_photo: z.boolean(),
    requires_measurement: z.boolean(),
    acceptance_criteria: z.string().min(1, 'Acceptance criteria is required'),
    common_failures: z.array(z.string())
  })),
  is_default: z.boolean().default(false)
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is a manager or active worker
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()

    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: templates, error: fetchError } = await supabase
      .from('quality_checkpoint_templates')
      .select('*')
      .order('stage_name', { ascending: true })
      .order('checkpoint_type', { ascending: true })

    if (fetchError) {
      console.error('Error fetching templates:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
    }

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a manager
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()

    if (!worker?.is_active || worker.role !== 'manager') {
      return NextResponse.json({ error: 'Only managers can create templates' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = checkpointTemplateSchema.parse(body)

    // If setting as default, unset other defaults for same stage/type
    if (validatedData.is_default) {
      await supabase
        .from('quality_checkpoint_templates')
        .update({ is_default: false })
        .eq('stage_name', validatedData.stage_name)
        .eq('checkpoint_type', validatedData.checkpoint_type)
    }

    const { data: template, error: createError } = await supabase
      .from('quality_checkpoint_templates')
      .insert(validatedData)
      .select()
      .single()

    if (createError) {
      console.error('Error creating template:', createError)
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 