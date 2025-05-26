import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createCheckpointSchema = z.object({
  workflow_template_id: z.string().uuid(),
  stage: z.string().min(1),
  checkpoint_type: z.enum(['pre_work', 'in_process', 'post_work', 'gate']),
  severity: z.enum(['critical', 'major', 'minor']).default('major'),
  checks: z.array(z.object({
    id: z.string(),
    description: z.string(),
    requires_photo: z.boolean(),
    requires_measurement: z.boolean(),
    acceptance_criteria: z.string(),
    common_failures: z.array(z.string())
  })),
  on_failure: z.enum(['block_progress', 'warn_continue', 'log_only']).default('block_progress')
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate worker status
    const { data: worker } = await supabase
      .from('workers')
      .select('role, is_active')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!worker?.is_active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const stage = searchParams.get('stage')
    const workflowId = searchParams.get('workflow_id')
    const checkpointType = searchParams.get('type')
    
    let query = supabase
      .from('quality_checkpoints')
      .select(`
        *,
        workflow_template:workflow_templates(
          id,
          name
        )
      `)
      .eq('is_active', true)
      .order('stage', { ascending: true })
    
    if (stage) {
      query = query.eq('stage', stage)
    }
    
    if (workflowId) {
      query = query.eq('workflow_template_id', workflowId)
    }
    
    if (checkpointType) {
      query = query.eq('checkpoint_type', checkpointType)
    }

    const { data: checkpoints, error: fetchError } = await query
    
    if (fetchError) {
      console.error('Error fetching checkpoints:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch checkpoints' }, { status: 500 })
    }
    
    // If specific stage and type requested, return single checkpoint
    if (stage && checkpointType && checkpoints && checkpoints.length > 0) {
      return NextResponse.json(checkpoints[0])
    }
    
    // Also fetch templates if no workflow specified
    let templates: any[] = []
    if (!workflowId) {
      const { data: templateData } = await supabase
        .from('quality_checkpoint_templates')
        .select('*')
        .eq('is_default', true)
      
      templates = templateData || []
    }
    
    return NextResponse.json({ checkpoints, templates })
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
      return NextResponse.json({ error: 'Only managers can create checkpoints' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createCheckpointSchema.parse(body)

    const { data: checkpoint, error: createError } = await supabase
      .from('quality_checkpoints')
      .insert(validatedData)
      .select()
      .single()

    if (createError) {
      console.error('Error creating checkpoint:', createError)
      return NextResponse.json({ error: 'Failed to create checkpoint' }, { status: 500 })
    }

    return NextResponse.json({ checkpoint })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}