import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database.types'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/auth', '/auth/callback', '/', '/api/health']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Check worker status for authenticated users on protected routes
  if (user && !isPublicRoute) {
    try {
      const { data: worker, error } = await supabase
        .from('workers')
        .select('id, role, is_active, approval_status')
        .eq('auth_user_id', user.id)
        .single()

      // Handle case where user doesn't have a worker record
      if (error || !worker) {
        console.log('No worker record found for user:', user.id, error?.message)
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('error', 'no_worker_profile')
        return NextResponse.redirect(url)
      }

      if (!worker.is_active) {
        const url = request.nextUrl.clone()
        url.pathname = '/unauthorized'
        return NextResponse.redirect(url)
      }

      // Check approval status if the field exists
      const approvalStatus = (worker as any).approval_status
      if (approvalStatus && approvalStatus !== 'approved') {
        // Allow access to a pending approval page
        if (pathname !== '/pending-approval' && !pathname.startsWith('/api/auth')) {
          const url = request.nextUrl.clone()
          url.pathname = '/pending-approval'
          return NextResponse.redirect(url)
        }
      }

      // Role-based route protection (only for approved users)
      if (approvalStatus === 'approved' || !approvalStatus) {
        if (pathname.startsWith('/manager') && !['manager', 'supervisor'].includes(worker.role || '')) {
          const url = request.nextUrl.clone()
          url.pathname = '/worker'
          return NextResponse.redirect(url)
        }

        if (pathname.startsWith('/worker') && worker.role === 'manager') {
          const url = request.nextUrl.clone()
          url.pathname = '/manager'
          return NextResponse.redirect(url)
        }
      }
    } catch (error) {
      console.error('Middleware error checking worker status:', error)
      // On error, allow the request to continue but log it
      // This prevents the app from breaking due to database issues
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object instead of the supabaseResponse object

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}