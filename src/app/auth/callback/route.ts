import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/login'

  console.log('Auth callback:', { code: !!code, origin })

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Get the user to check their worker status
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        console.log('User authenticated:', user.email)
        
        const { data: worker, error: workerError } = await supabase
          .from('workers')
          .select('role, is_active, name')
          .eq('auth_user_id', user.id)
          .single()
        
        if (workerError) {
          console.error('Worker lookup error:', workerError)
          return NextResponse.redirect(`${origin}/login?error=no_worker_profile`)
        }
        
        if (worker && worker.is_active) {
          // Active worker - redirect to appropriate dashboard
          console.log('Active worker redirect:', worker.role)
          if (['manager', 'supervisor'].includes(worker.role || '')) {
            return NextResponse.redirect(`${origin}/manager/dashboard`)
          } else {
            return NextResponse.redirect(`${origin}/worker/dashboard`)
          }
        } else if (worker && !worker.is_active) {
          // Inactive worker - show unauthorized page
          console.log('Inactive worker redirect')
          return NextResponse.redirect(`${origin}/unauthorized`)
        } else {
          // No worker profile found
          console.log('No worker profile found')
          return NextResponse.redirect(`${origin}/login?error=no_worker_profile`)
        }
      }
      
      // Default redirect to login with success message
      console.log('Default redirect - email confirmed')
      return NextResponse.redirect(`${origin}/login?confirmed=true`)
    } else {
      console.error('Exchange code error:', error)
      return NextResponse.redirect(`${origin}/login?error=exchange_failed`)
    }
  }

  // Return the user to an error page with instructions
  console.log('No code provided')
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
} 