'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle, Mail, Clock, Gift } from 'lucide-react'
import Link from 'next/link'

function RegisterPageContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [registrationComplete, setRegistrationComplete] = useState(false)
  const [invitationData, setInvitationData] = useState<any>(null)
  const [checkingInvitation, setCheckingInvitation] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  const invitationToken = searchParams.get('token')

  useEffect(() => {
    if (invitationToken) {
      checkInvitation(invitationToken)
    } else {
      setCheckingInvitation(false)
    }
  }, [invitationToken])

  const checkInvitation = async (token: string) => {
    const supabase = createClient()
    
    // Check if invitation is valid
    const { data: invitation, error } = await supabase
      .from('worker_invitations')
      .select('*')
      .eq('invitation_token', token)
      .is('accepted_at', null)
      .gte('expires_at', new Date().toISOString())
      .single()
    
    if (error || !invitation) {
      toast({
        title: 'Invalid or expired invitation',
        description: 'Please request a new invitation from your manager.',
        variant: 'destructive',
      })
      setCheckingInvitation(false)
      return
    }
    
    setInvitationData(invitation)
    setEmail(invitation.email)
    setCheckingInvitation(false)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    
    // Always use production URL for email confirmations
    const redirectTo = 'https://zmf.randomtask.us/auth/callback'
    
    // Create auth user with proper redirect URL
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          name: name,
          role: 'worker'
        }
      }
    })

    if (authError) {
      toast({
        title: 'Registration failed',
        description: authError.message,
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    if (authData.user) {
      // The trigger will automatically create the worker entry
      // and handle invitation updates, so we're done!

      // Show success state instead of redirecting immediately
      setRegistrationComplete(true)
      toast({
        title: 'Registration successful!',
        description: 'Please check your email to confirm your account.',
      })
    }

    setLoading(false)
  }

  if (checkingInvitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
            <p className="text-center mt-4 text-muted-foreground">Checking invitation...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state after registration
  if (registrationComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-green-900">Registration Successful!</CardTitle>
            <CardDescription>Your account has been created</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                <Mail className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Check your email</p>
                  <p className="text-xs text-blue-700">Click the confirmation link we sent to {email}</p>
                </div>
              </div>
              
              {!invitationData && (
                <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Wait for approval</p>
                    <p className="text-xs text-yellow-700">A manager will activate your account</p>
                  </div>
                </div>
              )}
              
              {invitationData && (
                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                  <Gift className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-900">Pre-approved account!</p>
                    <p className="text-xs text-green-700">You can start working after email confirmation</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="pt-4 space-y-2">
              <Button 
                onClick={() => router.push('/login')} 
                className="w-full"
              >
                Continue to Login
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setRegistrationComplete(false)
                  setInvitationData(null)
                  setEmail('')
                  setName('')
                  setPassword('')
                }}
                className="w-full"
              >
                Register Another Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Registration form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Worker Registration</CardTitle>
          <CardDescription>
            {invitationData 
              ? 'Complete your pre-approved registration'
              : 'Create your worker account for ZMF'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitationData && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <Gift className="h-4 w-4" />
              <AlertDescription>
                You&apos;ve been invited! Your account will be automatically approved.
              </AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Work Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@zmfheadphones.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading || !!invitationData}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating account...</span>
                </div>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
            <p className="text-center mt-4 text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <RegisterPageContent />
    </Suspense>
  )
}