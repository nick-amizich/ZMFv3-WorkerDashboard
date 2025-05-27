import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ApiLogger } from '@/lib/api-logger'
import { logError, logBusiness } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const logContext = ApiLogger.logRequest(request)

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      ApiLogger.logResponse(logContext, response, 'Unauthorized - no user')
      return response
    }

    // Parse request body
    const body = await request.json()
    const {
      worker_id,
      worker_name,
      production_step,
      checklist_items,
      overall_notes,
      product_info
    } = body

    // Validate required fields
    if (!worker_id || !worker_name || !production_step || !checklist_items) {
      const response = NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
      ApiLogger.logResponse(logContext, response, 'Missing required fields')
      return response
    }

    // Verify the submitter is authorized
    const { data: submitter } = await supabase
      .from('workers')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!submitter) {
      const response = NextResponse.json({ error: 'Worker not found' }, { status: 404 })
      ApiLogger.logResponse(logContext, response, 'Worker not found')
      return response
    }

    // Only allow workers to submit for themselves, managers can submit for anyone
    if (submitter.role !== 'manager' && submitter.id !== worker_id) {
      const response = NextResponse.json(
        { error: 'Not authorized to submit for other workers' },
        { status: 403 }
      )
      ApiLogger.logResponse(logContext, response, 'Unauthorized submission attempt')
      return response
    }

    // Insert QC submission
    const { data: submission, error } = await supabase
      .from('qc_submissions')
      .insert({
        worker_id,
        worker_name,
        production_step,
        checklist_items,
        overall_notes,
        product_info
      })
      .select()
      .single()

    if (error) throw error

    // Log business event
    logBusiness('QC checklist submitted', 'QUALITY_CONTROL', {
      submission_id: submission.id,
      worker_id,
      production_step,
      checklist_count: checklist_items.length,
      product_info
    })

    const response = NextResponse.json({ 
      success: true, 
      submission_id: submission.id 
    })
    ApiLogger.logResponse(logContext, response, 'QC submission created successfully')
    return response

  } catch (error) {
    logError(error as Error, 'QC_SUBMISSION', { request: logContext })
    const errorResponse = NextResponse.json(
      { error: 'Failed to submit QC checklist' },
      { status: 500 }
    )
    ApiLogger.logResponse(logContext, errorResponse, 'Failed to submit QC checklist')
    return errorResponse
  }
}

export async function GET(request: NextRequest) {
  const logContext = ApiLogger.logRequest(request)
  
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      ApiLogger.logResponse(logContext, response, 'Unauthorized - no user')
      return response
    }

    // Get worker info
    const { data: worker } = await supabase
      .from('workers')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!worker) {
      const response = NextResponse.json({ error: 'Worker not found' }, { status: 404 })
      ApiLogger.logResponse(logContext, response, 'Worker not found')
      return response
    }

    const { searchParams } = new URL(request.url)
    const worker_id = searchParams.get('worker_id')
    const production_step = searchParams.get('production_step')
    const from_date = searchParams.get('from_date')
    const to_date = searchParams.get('to_date')

    let query = supabase
      .from('qc_submissions')
      .select('*')
      .order('submitted_at', { ascending: false })

    // Apply filters based on role
    if (worker.role !== 'manager') {
      // Workers can only see their own submissions
      query = query.eq('worker_id', worker.id)
    } else if (worker_id) {
      // Managers can filter by worker
      query = query.eq('worker_id', worker_id)
    }

    // Apply additional filters
    if (production_step) {
      query = query.eq('production_step', production_step)
    }

    if (from_date) {
      query = query.gte('submitted_at', from_date)
    }

    if (to_date) {
      query = query.lte('submitted_at', to_date)
    }

    const { data: submissions, error } = await query

    if (error) throw error

    const response = NextResponse.json({ submissions })
    ApiLogger.logResponse(logContext, response, `Fetched ${submissions?.length || 0} QC submissions`)
    return response

  } catch (error) {
    logError(error as Error, 'QC_SUBMISSIONS_FETCH', { request: logContext })
    const errorResponse = NextResponse.json(
      { error: 'Failed to fetch QC submissions' },
      { status: 500 }
    )
    ApiLogger.logResponse(logContext, errorResponse, 'Failed to fetch QC submissions')
    return errorResponse
  }
}