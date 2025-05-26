import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
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
    
    // Get the list of auth users to create worker entries for
    const body = await request.json()
    const { authUsers } = body
    
    if (!authUsers || !Array.isArray(authUsers)) {
      return NextResponse.json({ error: 'authUsers array is required' }, { status: 400 })
    }
    
    const results = {
      created: [],
      failed: [],
      skipped: []
    }
    
    for (const authUser of authUsers) {
      // Check if worker already exists
      const { data: existingWorker } = await supabase
        .from('workers')
        .select('id')
        .eq('auth_user_id', authUser.id)
        .single()
      
      if (existingWorker) {
        results.skipped.push({ email: authUser.email, reason: 'Worker already exists' })
        continue
      }
      
      // Create worker entry
      const { data, error } = await supabase
        .from('workers')
        .insert({
          auth_user_id: authUser.id,
          email: authUser.email,
          name: authUser.name || authUser.email.split('@')[0],
          role: 'worker',
          is_active: false,
          approval_status: 'pending',
          skills: []
        })
        .select()
        .single()
      
      if (error) {
        results.failed.push({ email: authUser.email, error: error.message })
      } else {
        results.created.push(data)
      }
    }
    
    return NextResponse.json({
      message: 'Bulk creation completed',
      results
    })
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}