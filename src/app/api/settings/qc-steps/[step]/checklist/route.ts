import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ApiLogger } from '@/lib/api-logger'
import { revalidatePath } from 'next/cache'

interface ChecklistItem {
  id?: string
  item_text: string
  sort_order: number
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ step: string }> }
) {
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

    const { step } = await params
    const stepValue = decodeURIComponent(step)

    // Get checklist items for the specified step
    const { data: items, error } = await supabase
      .from('qc_checklist_items' as any)
      .select('id, item_text, sort_order')
      .eq('production_step_value', stepValue)
      .eq('is_active', true)
      .order('sort_order')

    if (error) {
      console.error('Database error:', error)
      const response = NextResponse.json({ error: 'Failed to fetch checklist items' }, { status: 500 })
      ApiLogger.logResponse(logContext, response, 'Database error fetching checklist items')
      return response
    }

    const response = NextResponse.json({ items: items || [] })
    ApiLogger.logResponse(logContext, response, `Retrieved ${items?.length || 0} checklist items for step ${stepValue}`)
    return response

  } catch (error) {
    console.error('Error fetching checklist items:', error)
    const errorResponse = NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    ApiLogger.logResponse(logContext, errorResponse, 'Internal server error')
    return errorResponse
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ step: string }> }
) {
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

    const { step } = await params
    const stepValue = decodeURIComponent(step)
    const { items } = await request.json()

    if (!Array.isArray(items)) {
      const response = NextResponse.json({ error: 'Invalid items data' }, { status: 400 })
      ApiLogger.logResponse(logContext, response, 'Invalid items data format')
      return response
    }

    // Validate each item
    for (const item of items) {
      if (!item.item_text || typeof item.item_text !== 'string') {
        const response = NextResponse.json({ 
          error: 'Each item must have item_text as a string' 
        }, { status: 400 })
        ApiLogger.logResponse(logContext, response, 'Invalid item format')
        return response
      }
    }

    // Verify the production step exists
    const { data: stepExists } = await supabase
      .from('qc_production_steps' as any)
      .select('value')
      .eq('value', stepValue)
      .eq('is_active', true)
      .single()

    if (!stepExists) {
      const response = NextResponse.json({ error: 'Production step not found' }, { status: 404 })
      ApiLogger.logResponse(logContext, response, 'Production step not found')
      return response
    }

    // Start transaction - first delete all existing items for this step
    const { error: deleteError } = await supabase
      .from('qc_checklist_items' as any)
      .delete()
      .eq('production_step_value', stepValue)

    if (deleteError) {
      console.error('Database error deleting items:', deleteError)
      const response = NextResponse.json({ error: 'Failed to update checklist items' }, { status: 500 })
      ApiLogger.logResponse(logContext, response, 'Database error deleting items')
      return response
    }

    // Insert new items with proper sort order
    const itemsToInsert = items.map((item, index) => ({
      production_step_value: stepValue,
      item_text: item.item_text,
      sort_order: (index + 1) * 10, // 10, 20, 30, etc.
      is_active: true
    }))

    const { error: insertError } = await supabase
      .from('qc_checklist_items' as any)
      .insert(itemsToInsert as any)

    if (insertError) {
      console.error('Database error inserting items:', insertError)
      const response = NextResponse.json({ error: 'Failed to save checklist items' }, { status: 500 })
      ApiLogger.logResponse(logContext, response, 'Database error inserting items')
      return response
    }

    // Revalidate the worker QC checklist page so it picks up the new items
    revalidatePath('/worker/qc-checklist')

    const response = NextResponse.json({ 
      success: true, 
      message: 'Checklist items saved successfully',
      itemsCount: items.length 
    })
    ApiLogger.logResponse(logContext, response, `Saved ${items.length} checklist items for step ${stepValue}`)
    return response

  } catch (error) {
    console.error('Error saving checklist items:', error)
    const errorResponse = NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    ApiLogger.logResponse(logContext, errorResponse, 'Internal server error')
    return errorResponse
  }
} 