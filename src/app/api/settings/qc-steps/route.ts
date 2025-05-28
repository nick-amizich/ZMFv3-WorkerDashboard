import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ApiLogger } from '@/lib/api-logger'
import { revalidatePath } from 'next/cache'

interface ProductionStep {
  value: string
  label: string
  sort_order?: number
}

export async function POST(request: NextRequest) {
  const logContext = ApiLogger.logRequest(request)
  
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      ApiLogger.logResponse(logContext, response, 'User not authenticated')
      return response
    }

    // Check if user is a manager
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()

    if (!worker?.is_active || worker.role !== 'manager') {
      const response = NextResponse.json({ error: 'Unauthorized - Manager role required' }, { status: 403 })
      ApiLogger.logResponse(logContext, response, 'User not authorized as manager')
      return response
    }

    // Parse the request body
    const { steps } = await request.json()

    if (!Array.isArray(steps)) {
      const response = NextResponse.json({ error: 'Invalid steps data' }, { status: 400 })
      ApiLogger.logResponse(logContext, response, 'Invalid steps data format')
      return response
    }

    // Validate each step
    for (const step of steps) {
      if (!step.value || !step.label || typeof step.value !== 'string' || typeof step.label !== 'string') {
        const response = NextResponse.json({ 
          error: 'Each step must have both value and label as strings' 
        }, { status: 400 })
        ApiLogger.logResponse(logContext, response, 'Invalid step format')
        return response
      }
    }

    // SAFER APPROACH: Get existing steps and update/insert/delete as needed
    const { data: existingSteps, error: fetchError } = await supabase
      .from('qc_production_steps' as any)
      .select('value, label, sort_order')
      .eq('is_active', true)
      .order('sort_order')

    if (fetchError) {
      console.error('Database error fetching existing steps:', fetchError)
      const response = NextResponse.json({ error: 'Failed to fetch existing steps' }, { status: 500 })
      ApiLogger.logResponse(logContext, response, 'Database error fetching existing steps')
      return response
    }

    // Type assertion to help TypeScript understand the structure
    const typedExistingSteps = (existingSteps || []) as unknown as Array<{ value: string; label: string; sort_order: number }>
    const existingValues = new Set(typedExistingSteps.map(s => s.value))
    const newValues = new Set(steps.map(s => s.value))

    // 1. Update existing steps (only label and sort_order changes)
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      const sortOrder = (i + 1) * 10
      
      if (existingValues.has(step.value)) {
        // Check if the value is being changed
        const oldStep = typedExistingSteps.find(s => s.value === step.value)
        if (oldStep && oldStep.value !== step.value) {
          // Update checklist items first to maintain referential integrity
          const { error: updateChecklistError } = await supabase
            .from('qc_checklist_items' as any)
            .update({ production_step_value: step.value })
            .eq('production_step_value', oldStep.value)

          if (updateChecklistError) {
            console.error(`Error updating checklist items for step ${oldStep.value}:`, updateChecklistError)
            const response = NextResponse.json({ error: `Failed to update checklist items for step ${oldStep.value}` }, { status: 500 })
            ApiLogger.logResponse(logContext, response, `Error updating checklist items for step ${oldStep.value}`)
            return response
          }
        }

        // Update existing step
        const { error: updateError } = await supabase
          .from('qc_production_steps' as any)
          .update({ 
            label: step.label, 
            sort_order: sortOrder 
          })
          .eq('value', step.value)
          .eq('is_active', true)

        if (updateError) {
          console.error(`Error updating step ${step.value}:`, updateError)
          const response = NextResponse.json({ error: `Failed to update step ${step.value}` }, { status: 500 })
          ApiLogger.logResponse(logContext, response, `Error updating step ${step.value}`)
          return response
        }
      } else {
        // Insert new step
        const { error: insertError } = await supabase
          .from('qc_production_steps' as any)
          .insert({
            value: step.value,
            label: step.label,
            sort_order: sortOrder,
            is_active: true
          })

        if (insertError) {
          console.error(`Error inserting step ${step.value}:`, insertError)
          const response = NextResponse.json({ error: `Failed to insert step ${step.value}` }, { status: 500 })
          ApiLogger.logResponse(logContext, response, `Error inserting step ${step.value}`)
          return response
        }
      }
    }

    // 2. Delete steps that are no longer in the new list
    const stepsToDelete = [...existingValues].filter(value => !newValues.has(value))
    
    for (const valueToDelete of stepsToDelete) {
      // Check if this step has checklist items before deleting
      const { data: checklistItems, error: checkError } = await supabase
        .from('qc_checklist_items' as any)
        .select('id')
        .eq('production_step_value', valueToDelete)
        .eq('is_active', true)
        .limit(1)

      if (checkError) {
        console.error(`Error checking checklist items for ${valueToDelete}:`, checkError)
        continue // Skip deletion if we can't check
      }

      if (checklistItems && checklistItems.length > 0) {
        console.warn(`Skipping deletion of step ${valueToDelete} - has checklist items`)
        // Mark as inactive instead of deleting
        await supabase
          .from('qc_production_steps' as any)
          .update({ is_active: false })
          .eq('value', valueToDelete)
      } else {
        // Safe to delete - no checklist items
        const { error: deleteError } = await supabase
          .from('qc_production_steps' as any)
          .delete()
          .eq('value', valueToDelete)

        if (deleteError) {
          console.error(`Error deleting step ${valueToDelete}:`, deleteError)
        }
      }
    }

    // Revalidate the worker QC checklist page so it picks up the new steps
    revalidatePath('/worker/qc-checklist')

    const response = NextResponse.json({ 
      success: true, 
      message: 'QC production steps saved successfully',
      stepsCount: steps.length 
    })
    ApiLogger.logResponse(logContext, response, `Saved ${steps.length} QC production steps`)
    return response

  } catch (error) {
    console.error('Error saving QC steps:', error)
    const errorResponse = NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    ApiLogger.logResponse(logContext, errorResponse, 'Internal server error')
    return errorResponse
  }
}

export async function GET(request: NextRequest) {
  const logContext = ApiLogger.logRequest(request)
  
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      ApiLogger.logResponse(logContext, response, 'User not authenticated')
      return response
    }

    // Get QC steps from the dedicated table
    const { data: steps, error } = await supabase
      .from('qc_production_steps' as any)
      .select('value, label, sort_order')
      .eq('is_active', true)
      .order('sort_order')

    if (error) {
      console.error('Database error:', error)
      const response = NextResponse.json({ error: 'Failed to fetch steps' }, { status: 500 })
      ApiLogger.logResponse(logContext, response, 'Database error fetching steps')
      return response
    }

    const response = NextResponse.json({ steps: steps || [] })
    ApiLogger.logResponse(logContext, response, `Retrieved ${steps?.length || 0} QC production steps`)
    return response

  } catch (error) {
    console.error('Error fetching QC steps:', error)
    const errorResponse = NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    ApiLogger.logResponse(logContext, errorResponse, 'Internal server error')
    return errorResponse
  }
} 