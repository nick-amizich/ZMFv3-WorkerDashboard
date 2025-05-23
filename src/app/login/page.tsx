'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
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
      // Check worker status to determine redirect
      const { data: worker, error: workerError } = await supabase
        .from('workers')
        .select('role, is_active')
        .eq('auth_user_id', data.user.id)
        .single()

      if (workerError || !worker) {
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

      // Successful login - redirect based on role
      if (['manager', 'supervisor'].includes(worker.role || '')) {
        router.push('/manager')
      } else {
        router.push('/worker')
      }
      
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
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