import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// This endpoint syncs auth users with the workers table
// It finds auth users without corresponding worker entries and creates them as pending
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user is a manager
    const { data: currentWorker } = await supabase
      .from('workers')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()
    
    if (currentWorker?.role !== 'manager') {
      return NextResponse.json({ error: 'Manager access required' }, { status: 403 })
    }
    
    // Get all auth users
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error fetching auth users:', authError)
      return NextResponse.json({ error: 'Failed to fetch auth users' }, { status: 500 })
    }
    
    // Get all workers
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('auth_user_id')
    
    if (workersError) {
      console.error('Error fetching workers:', workersError)
      return NextResponse.json({ error: 'Failed to fetch workers' }, { status: 500 })
    }
    
    // Find auth users without worker entries
    const workerAuthIds = new Set(workers?.map(w => w.auth_user_id).filter(Boolean))
    const orphanedUsers = authUsers?.filter(u => !workerAuthIds.has(u.id)) || []
    
    // Create pending worker entries for orphaned users
    const created = []
    const failed = []
    
    for (const authUser of orphanedUsers) {
      const { data, error } = await supabase
        .from('workers')
        .insert({
          auth_user_id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Unknown',
          role: 'worker',
          is_active: false,
          approval_status: 'pending',
          skills: [],
          created_at: authUser.created_at
        })
        .select()
        .single()
      
      if (error) {
        failed.push({ user: authUser.email, error: error.message })
      } else {
        created.push(data)
      }
    }
    
    return NextResponse.json({
      message: 'Sync completed',
      stats: {
        totalAuthUsers: authUsers?.length || 0,
        totalWorkers: workers?.length || 0,
        orphanedUsers: orphanedUsers.length,
        created: created.length,
        failed: failed.length
      },
      created,
      failed
    })
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST endpoint to manually create a worker entry for a specific auth user
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { authUserId, email, name } = body
    
    if (!authUserId || !email) {
      return NextResponse.json({ error: 'authUserId and email are required' }, { status: 400 })
    }
    
    // Create worker entry
    const { data, error } = await supabase
      .from('workers')
      .insert({
        auth_user_id: authUserId,
        email,
        name: name || email.split('@')[0],
        role: 'worker',
        is_active: false,
        approval_status: 'pending',
        skills: []
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating worker:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({
      message: 'Worker entry created',
      worker: data
    })
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}