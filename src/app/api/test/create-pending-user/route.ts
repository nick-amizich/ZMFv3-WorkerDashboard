import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logger, logError as logErrorUtil, logBusiness } from '@/lib/logger'
import { ApiLogger } from '@/lib/api-logger'

// This is a test endpoint to create a pending user for testing the approval flow
export async function POST(request: NextRequest) {
  const logContext = ApiLogger.logRequest(request)
  
  try {
    logger.info('Test endpoint called: create-pending-user', 'TEST_ENDPOINT', {
      timestamp: new Date().toISOString(),
      requestId: logContext.requestId
    })

    const supabase = await createClient()
    
    const body = await request.json()
    const { email, name } = body

    if (!email || !name) {
      logErrorUtil(new Error('Missing required fields'), 'TEST_ENDPOINT', {
        missingFields: { email: !email, name: !name }
      })
      return NextResponse.json({ error: 'Email and name are required' }, { status: 400 })
    }

    // Create test user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: 'temp123!',
      email_confirm: true,
      user_metadata: { name }
    })

    if (authError || !authUser.user) {
      logErrorUtil(new Error(`Auth user creation failed: ${authError?.message}`), 'TEST_ENDPOINT', {
        email,
        authError
      })
      return NextResponse.json({ error: 'Failed to create auth user' }, { status: 500 })
    }

    // Create worker record
    const { data: worker, error: workerError } = await supabase
      .from('workers')
      .insert([{
        auth_user_id: authUser.user.id,
        name,
        email,
        role: 'worker',
        approval_status: 'pending'
      }])
      .select()
      .single()

    if (workerError) {
      logErrorUtil(new Error(`Worker creation failed: ${workerError.message}`), 'TEST_ENDPOINT', {
        email,
        authUserId: authUser.user.id,
        workerError
      })
      return NextResponse.json({ error: 'Failed to create worker record' }, { status: 500 })
    }

    logBusiness('Test pending user created successfully', 'TEST_USER_CREATION', {
      userId: authUser.user.id,
      workerId: worker.id,
      email,
      name
    })

    const response = NextResponse.json({ 
      message: 'Test pending user created successfully',
      userId: authUser.user.id,
      workerId: worker.id
    }, { status: 201 })

    ApiLogger.logResponse(logContext, response, 'Test user created successfully')

    return response

  } catch (error) {
    logErrorUtil(error as Error, 'TEST_ENDPOINT', {
      route: '/api/test/create-pending-user'
    })
    
    const errorResponse = NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    ApiLogger.logResponse(logContext, errorResponse, 'Internal server error')
    
    return errorResponse
  }
}