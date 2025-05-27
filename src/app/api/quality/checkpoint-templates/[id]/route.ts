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

export async function PUT(
  request: NextRequest, 
  { params }: { params: { id: string } }
) {
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
      return NextResponse.json({ error: 'Only managers can update templates' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = checkpointTemplateSchema.parse(body)

    // Check if template exists
    const { data: existingTemplate } = await supabase
      .from('quality_checkpoint_templates')
      .select('id, is_default')
      .eq('id', params.id)
      .single()

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // If setting as default, unset other defaults for same stage/type
    if (validatedData.is_default && !existingTemplate.is_default) {
      await supabase
        .from('quality_checkpoint_templates')
        .update({ is_default: false })
        .eq('stage_name', validatedData.stage_name)
        .eq('checkpoint_type', validatedData.checkpoint_type)
        .neq('id', params.id)
    }

    const { data: template, error: updateError } = await supabase
      .from('quality_checkpoint_templates')
      .update(validatedData)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating template:', updateError)
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
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

export async function DELETE(
  request: NextRequest, 
  { params }: { params: { id: string } }
) {
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
      return NextResponse.json({ error: 'Only managers can delete templates' }, { status: 403 })
    }

    // Check if template exists and if it's a default template
    const { data: template } = await supabase
      .from('quality_checkpoint_templates')
      .select('id, is_default')
      .eq('id', params.id)
      .single()

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Prevent deletion of default templates
    if (template.is_default) {
      return NextResponse.json({ 
        error: 'Cannot delete default templates. Remove default status first.' 
      }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('quality_checkpoint_templates')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('Error deleting template:', deleteError)
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 