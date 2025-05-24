import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/login'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Get the user to check their worker status
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: worker } = await supabase
          .from('workers')
          .select('role, is_active')
          .eq('auth_user_id', user.id)
          .single()
        
        if (worker && worker.is_active) {
          // Active worker - redirect to appropriate dashboard
          if (['manager', 'supervisor'].includes(worker.role || '')) {
            return NextResponse.redirect(`${origin}/manager`)
          } else {
            return NextResponse.redirect(`${origin}/worker`)
          }
        } else if (worker && !worker.is_active) {
          // Inactive worker - show unauthorized page
          return NextResponse.redirect(`${origin}/unauthorized`)
        }
      }
      
      // Default redirect to login with success message
      return NextResponse.redirect(`${origin}/login?confirmed=true`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
} 