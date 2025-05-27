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
    const { workerId, newRole, reason } = await request.json()

    if (!workerId || !newRole) {
      const response = NextResponse.json({ error: 'Worker ID and new role are required' }, { status: 400 })
      ApiLogger.logResponse(logContext, response, 'Missing required fields')
      return response
    }

    // Validate role
    const validRoles = ['worker', 'supervisor', 'manager']
    if (!validRoles.includes(newRole)) {
      const response = NextResponse.json({ error: 'Invalid role specified' }, { status: 400 })
      ApiLogger.logResponse(logContext, response, 'Invalid role')
      return response
    }

    // Get the target worker
    const { data: targetWorker } = await supabase
      .from('workers')
      .select('id, name, role, email')
      .eq('id', workerId)
      .single()

    if (!targetWorker) {
      const response = NextResponse.json({ error: 'Worker not found' }, { status: 404 })
      ApiLogger.logResponse(logContext, response, 'Worker not found')
      return response
    }

    // Prevent managers from demoting themselves
    if (currentWorker.id === workerId && newRole !== 'manager') {
      const response = NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
      ApiLogger.logResponse(logContext, response, 'Attempted self-role change')
      return response
    }

    // Update the worker's role
    const { error: updateError } = await supabase
      .from('workers')
      .update({
        role: newRole,
        updated_at: new Date().toISOString()
      })
      .eq('id', workerId)

    if (updateError) {
      console.error('Database error:', updateError)
      const response = NextResponse.json({ error: 'Failed to update worker role' }, { status: 500 })
      ApiLogger.logResponse(logContext, response, 'Database error updating role')
      return response
    }

    // Log the role change for audit purposes
    console.log('Role change:', {
      worker_id: workerId,
      worker_name: targetWorker.name,
      changed_by: currentWorker.id,
      old_role: targetWorker.role,
      new_role: newRole,
      reason: reason || 'Role updated by manager',
      changed_at: new Date().toISOString()
    })

    const response = NextResponse.json({ 
      success: true, 
      message: `Worker role updated from ${targetWorker.role} to ${newRole}`,
      worker: {
        id: targetWorker.id,
        name: targetWorker.name,
        email: targetWorker.email,
        oldRole: targetWorker.role,
        newRole: newRole
      }
    })
    ApiLogger.logResponse(logContext, response, `Updated worker ${targetWorker.name} role to ${newRole}`)
    return response

  } catch (error) {
    console.error('Error updating worker role:', error)
    const errorResponse = NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    ApiLogger.logResponse(logContext, errorResponse, 'Internal server error')
    return errorResponse
  }
} 