import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ApiLogger } from '@/lib/api-logger'

export async function GET(request: NextRequest) {
  const logContext = ApiLogger.logRequest(request)
  
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      ApiLogger.logResponse(logContext, response, 'Unauthorized access to workers endpoint')
      return response
    }
    
    // Validate user is approved and active
    const { data: currentUser } = await supabase
      .from('workers')
      .select('role, is_active, approval_status')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!currentUser?.is_active || currentUser.approval_status !== 'approved') {
      const response = NextResponse.json({ error: 'Access denied' }, { status: 403 })
      ApiLogger.logResponse(logContext, response, 'Inactive or unapproved user attempted access')
      return response
    }
    
    // Get all active, approved workers
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('id, name, email, role, skills, is_active, approval_status')
      .eq('is_active', true)
      .eq('approval_status', 'approved')
      .order('name', { ascending: true })
    
    if (workersError) {
      throw workersError
    }
    
    const response = NextResponse.json(workers || [])
    
    ApiLogger.logResponse(logContext, response, `Retrieved ${workers?.length || 0} active workers`)
    return response
    
  } catch (error) {
    console.error('Workers API error:', error)
    const errorResponse = NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
    ApiLogger.logResponse(logContext, errorResponse, 'Workers API internal error')
    return errorResponse
  }
} 