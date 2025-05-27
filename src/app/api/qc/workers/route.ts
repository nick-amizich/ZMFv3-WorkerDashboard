import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ApiLogger } from '@/lib/api-logger'
import { logError } from '@/lib/logger'

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

    // Verify the user is a worker
    const { data: currentWorker } = await supabase
      .from('workers')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!currentWorker) {
      const response = NextResponse.json({ error: 'Worker not found' }, { status: 404 })
      ApiLogger.logResponse(logContext, response, 'Worker not found')
      return response
    }

    // Get active workers
    const { data: workers, error } = await supabase
      .from('workers')
      .select('id, name, email')
      .eq('is_active', true)
      .order('name')

    if (error) throw error

    const response = NextResponse.json({ workers })
    ApiLogger.logResponse(logContext, response, 'Workers fetched successfully')
    return response

  } catch (error) {
    logError(error as Error, 'QC_WORKERS', { request: logContext })
    const errorResponse = NextResponse.json(
      { error: 'Failed to fetch workers' },
      { status: 500 }
    )
    ApiLogger.logResponse(logContext, errorResponse, 'Failed to fetch workers')
    return errorResponse
  }
}