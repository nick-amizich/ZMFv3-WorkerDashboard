import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { email, password, name, invitationToken } = await request.json()
    
    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    // Check for invitation if token provided
    let invitationData = null
    if (invitationToken) {
      const { data: invitation } = await supabase
        .from('worker_invitations')
        .select('*')
        .eq('invitation_token', invitationToken)
        .is('accepted_at', null)
        .gte('expires_at', new Date().toISOString())
        .single()
      
      if (invitation) {
        invitationData = invitation
      }
    }
    
    // Check if worker already exists with this email
    const { data: existingWorker } = await supabase
      .from('workers')
      .select('id, auth_user_id')
      .eq('email', email)
      .single()
    
    if (existingWorker) {
      // If worker exists but no auth user, create auth user and link
      if (!existingWorker.auth_user_id) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: 'https://zmf.randomtask.us/auth/callback'
          }
        })
        
        if (authError) {
          return NextResponse.json({ error: authError.message }, { status: 400 })
        }
        
        if (authData.user) {
          // Update existing worker with auth user id
          await supabase
            .from('workers')
            .update({
              auth_user_id: authData.user.id,
              name, // Update name in case it changed
              approval_status: 'pending'
            })
            .eq('id', existingWorker.id)
        }
        
        return NextResponse.json({ 
          message: 'Registration successful - existing worker linked',
          needsEmailConfirmation: true 
        })
      } else {
        return NextResponse.json({ 
          error: 'An account with this email already exists' 
        }, { status: 400 })
      }
    }
    
    // Create new auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://zmf.randomtask.us/auth/callback'
      }
    })
    
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }
    
    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }
    
    // Create worker entry
    const { error: workerError } = await supabase
      .from('workers')
      .insert({
        auth_user_id: authData.user.id,
        email,
        name,
        role: 'worker',
        is_active: invitationData ? true : false,
        approval_status: invitationData ? 'approved' : 'pending',
        approved_at: invitationData ? new Date().toISOString() : null,
        approved_by: invitationData?.invited_by || null,
        skills: []
      })
    
    if (workerError) {
      console.error('Worker creation failed:', workerError)
      // This is bad - we have an auth user but no worker entry
      // Log this for manual fixing
      return NextResponse.json({ 
        error: 'Registration partially failed. Please contact support.',
        details: 'Auth user created but worker profile failed',
        authUserId: authData.user.id
      }, { status: 500 })
    }
    
    // Mark invitation as used
    if (invitationData) {
      await supabase
        .from('worker_invitations')
        .update({
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitationData.id)
    }
    
    return NextResponse.json({ 
      message: 'Registration successful',
      needsEmailConfirmation: true,
      isPreApproved: !!invitationData
    })
    
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}