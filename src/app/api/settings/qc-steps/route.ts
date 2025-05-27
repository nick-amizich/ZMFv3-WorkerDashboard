import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ApiLogger } from '@/lib/api-logger'
import { revalidatePath } from 'next/cache'

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

    // Start transaction - first delete all existing steps
    const { error: deleteError } = await supabase
      .from('qc_production_steps' as any)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (deleteError) {
      console.error('Database error deleting steps:', deleteError)
      const response = NextResponse.json({ error: 'Failed to update steps' }, { status: 500 })
      ApiLogger.logResponse(logContext, response, 'Database error deleting steps')
      return response
    }

    // Insert new steps with proper sort order
    const stepsToInsert = steps.map((step, index) => ({
      value: step.value,
      label: step.label,
      sort_order: (index + 1) * 10, // 10, 20, 30, etc.
      is_active: true
    }))

    const { error: insertError } = await supabase
      .from('qc_production_steps' as any)
      .insert(stepsToInsert as any)

    if (insertError) {
      console.error('Database error inserting steps:', insertError)
      const response = NextResponse.json({ error: 'Failed to save steps' }, { status: 500 })
      ApiLogger.logResponse(logContext, response, 'Database error inserting steps')
      return response
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