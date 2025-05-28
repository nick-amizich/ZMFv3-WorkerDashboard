import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Sign out from Supabase
    await supabase.auth.signOut()
    
    // Create response with redirect
    const response = NextResponse.redirect(new URL('/login', request.url))
    
    // Clear all auth cookies
    const authCookies = ['sb-access-token', 'sb-refresh-token']
    authCookies.forEach(name => {
      response.cookies.delete(name)
    })
    
    return response
  } catch (error) {
    console.error('Sign out error:', error)
    // Still redirect to login even if there's an error
    return NextResponse.redirect(new URL('/login', request.url))
  }
}