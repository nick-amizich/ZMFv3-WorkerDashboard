'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  // Clear any stale auth state on mount
  useEffect(() => {
    const clearStaleAuth = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await supabase.auth.signOut()
      }
    }
    clearStaleAuth()
  }, [])

  // Handle URL parameters for confirmations and errors
  useEffect(() => {
    const confirmed = searchParams.get('confirmed')
    const error = searchParams.get('error')

    if (confirmed === 'true') {
      toast({
        title: 'Email Confirmed',
        description: 'Your email has been confirmed. You can now sign in.',
      })
    }

    if (error) {
      const errorMessages = {
        'auth_callback_error': 'There was an error confirming your email. Please try again.',
        'exchange_failed': 'Email confirmation failed. The link may have expired.',
        'no_worker_profile': 'No worker profile found. Please contact your manager.',
        'otp_expired': 'Email confirmation link has expired. Please register again.',
        'access_denied': 'Access denied. Please check your email for a new confirmation link.'
      }

      toast({
        title: 'Authentication Error',
        description: errorMessages[error as keyof typeof errorMessages] || 'An unexpected error occurred.',
        variant: 'destructive',
      })
    }
  }, [searchParams, toast])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      
      // First ensure we're signed out
      await supabase.auth.signOut()
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast({
          title: 'Login failed',
          description: error.message,
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      if (data.user) {
        // Give a brief moment for the session to be established
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Check worker status to determine redirect
        const { data: worker, error: workerError } = await supabase
          .from('workers')
          .select('role, is_active, approval_status')
          .eq('auth_user_id', data.user.id)
          .single()

        if (workerError) {
          console.log('Worker lookup error:', workerError)
          // If we can't find the worker record, let the middleware handle it
          // The middleware will redirect appropriately
          if (['manager', 'supervisor'].includes(data.user.user_metadata?.role || '')) {
            router.push('/manager')
          } else {
            router.push('/worker')
          }
          router.refresh()
          return
        }

        if (!worker) {
          toast({
            title: 'Access denied',
            description: 'No worker profile found. Please contact your administrator.',
            variant: 'destructive',
          })
          await supabase.auth.signOut()
          setLoading(false)
          return
        }

        if (!worker.is_active) {
          toast({
            title: 'Account Inactive',
            description: 'Your account requires manager approval. Please contact your supervisor.',
            variant: 'destructive',
          })
          router.push('/unauthorized')
          setLoading(false)
          return
        }

        // Check approval status
        if (worker.approval_status && worker.approval_status !== 'approved') {
          router.push('/pending-approval')
          setLoading(false)
          return
        }

        // Successful login - redirect based on role
        toast({
          title: 'Login successful',
          description: 'Welcome back!',
        })
        
        if (['manager', 'supervisor'].includes(worker.role || '')) {
          router.push('/manager')
        } else {
          router.push('/worker')
        }
        
        router.refresh()
      }
    } catch (error) {
      console.error('Login error:', error)
      // Only show error if we're still on the login page
      // If we've been redirected, the login was successful
      if (window.location.pathname === '/login') {
        toast({
          title: 'Login failed',
          description: 'An unexpected error occurred. Please try again.',
          variant: 'destructive',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Worker Login</CardTitle>
          <CardDescription>Sign in to access your dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary hover:underline">
              Register
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}