import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// This endpoint creates worker entries for specific email addresses
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
    
    // Get the emails from request body
    const body = await request.json()
    const { emails } = body
    
    if (!emails || !Array.isArray(emails)) {
      return NextResponse.json({ error: 'emails array is required' }, { status: 400 })
    }
    
    const results = {
      created: [] as any[],
      failed: [] as any[],
      alreadyExists: [] as any[]
    }
    
    // For each email, check if worker exists
    for (const email of emails) {
      // Check if worker already exists
      const { data: existingWorker } = await supabase
        .from('workers')
        .select('id, approval_status')
        .eq('email', email)
        .single()
      
      if (existingWorker) {
        results.alreadyExists.push({ 
          email, 
          status: existingWorker.approval_status,
          id: existingWorker.id 
        })
        continue
      }
      
      // Since we can't get the auth user ID, we'll create a placeholder
      // The user will need to complete registration to link their auth account
      const { data, error } = await supabase
        .from('workers')
        .insert({
          email,
          name: email.split('@')[0],
          role: 'worker',
          is_active: false,
          approval_status: 'pending',
          skills: [],
          // Note: auth_user_id will be null until they complete registration
          auth_user_id: null
        })
        .select()
        .single()
      
      if (error) {
        results.failed.push({ email, error: error.message })
      } else {
        results.created.push(data)
      }
    }
    
    return NextResponse.json({
      message: 'Worker entry creation completed',
      results,
      note: 'Workers with null auth_user_id will need to complete registration to link their accounts'
    })
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}