import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ApiLogger } from '@/lib/api-logger'

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
    const { data: currentWorker } = await supabase
      .from('workers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .single()

    if (!currentWorker?.is_active || currentWorker.role !== 'manager') {
      const response = NextResponse.json({ error: 'Unauthorized - Manager role required' }, { status: 403 })
      ApiLogger.logResponse(logContext, response, 'User not authorized as manager')
      return response
    }

    // Parse the request body
    const { workerId, isActive, reason } = await request.json()

    if (!workerId || typeof isActive !== 'boolean') {
      const response = NextResponse.json({ error: 'Worker ID and status are required' }, { status: 400 })
      ApiLogger.logResponse(logContext, response, 'Missing required fields')
      return response
    }

    // Get the target worker
    const { data: targetWorker } = await supabase
      .from('workers')
      .select('id, name, is_active, email')
      .eq('id', workerId)
      .single()

    if (!targetWorker) {
      const response = NextResponse.json({ error: 'Worker not found' }, { status: 404 })
      ApiLogger.logResponse(logContext, response, 'Worker not found')
      return response
    }

    // Prevent managers from deactivating themselves
    if (currentWorker.id === workerId && !isActive) {
      const response = NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 })
      ApiLogger.logResponse(logContext, response, 'Attempted self-deactivation')
      return response
    }

    // Update the worker's status
    const { error: updateError } = await supabase
      .from('workers')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', workerId)

    if (updateError) {
      console.error('Database error:', updateError)
      const response = NextResponse.json({ error: 'Failed to update worker status' }, { status: 500 })
      ApiLogger.logResponse(logContext, response, 'Database error updating status')
      return response
    }

    // Log the status change for audit purposes
    console.log('Status change:', {
      worker_id: workerId,
      worker_name: targetWorker.name,
      changed_by: currentWorker.id,
      old_status: targetWorker.is_active,
      new_status: isActive,
      reason: reason || `Status ${isActive ? 'activated' : 'deactivated'} by manager`,
      changed_at: new Date().toISOString()
    })

    const response = NextResponse.json({ 
      success: true, 
      message: `Worker ${isActive ? 'activated' : 'deactivated'} successfully`,
      worker: {
        id: targetWorker.id,
        name: targetWorker.name,
        email: targetWorker.email,
        oldStatus: targetWorker.is_active,
        newStatus: isActive
      }
    })
    ApiLogger.logResponse(logContext, response, `${isActive ? 'Activated' : 'Deactivated'} worker ${targetWorker.name}`)
    return response

  } catch (error) {
    console.error('Error updating worker status:', error)
    const errorResponse = NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    ApiLogger.logResponse(logContext, errorResponse, 'Internal server error')
    return errorResponse
  }
} 