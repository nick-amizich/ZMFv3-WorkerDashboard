'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { AlertTriangle, CheckCircle } from 'lucide-react'

export default function FixUsersPage() {
  const [copying, setCopying] = useState(false)
  const { toast } = useToast()

  const sqlQuery = `-- Step 1: Check which auth users don't have worker entries
SELECT 
    au.id as auth_user_id,
    au.email,
    au.created_at
FROM auth.users au
LEFT JOIN public.workers w ON w.auth_user_id = au.id
WHERE w.id IS NULL;

-- Step 2: Create worker entries for missing users
INSERT INTO public.workers (
    auth_user_id,
    email,
    name,
    role,
    is_active,
    approval_status,
    skills
)
SELECT 
    au.id,
    au.email,
    split_part(au.email, '@', 1) as name,
    'worker' as role,
    false as is_active,
    'pending' as approval_status,
    ARRAY[]::text[] as skills
FROM auth.users au
LEFT JOIN public.workers w ON w.auth_user_id = au.id
WHERE w.id IS NULL;`

  const copyToClipboard = async () => {
    setCopying(true)
    try {
      await navigator.clipboard.writeText(sqlQuery)
      toast({
        title: 'Copied!',
        description: 'SQL query copied to clipboard',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      })
    } finally {
      setCopying(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fix Missing User Entries</h1>
        <p className="text-muted-foreground">Create worker entries for users stuck in auth.users</p>
      </div>

      <Alert className="border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>The Problem:</strong> Users exist in Supabase Auth but don't have entries in the workers table.
          This prevents them from being approved or logging in.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Solution: Run This SQL in Supabase</CardTitle>
          <CardDescription>
            This query will create pending worker entries for all auth users that don't have one
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm font-mono whitespace-pre">{sqlQuery}</pre>
          </div>
          
          <div className="flex gap-4">
            <Button onClick={copyToClipboard} disabled={copying}>
              {copying ? 'Copying...' : 'Copy SQL Query'}
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open('https://supabase.com/dashboard/project/kjdicpudxqxenhjwdrzg/sql/new', '_blank')}
            >
              Open SQL Editor
            </Button>
          </div>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>After running the query:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Go to <a href="/manager/users" className="text-blue-600 hover:underline">User Management</a></li>
                <li>You'll see the new pending approvals</li>
                <li>Approve each user as needed</li>
              </ol>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Based on Your Screenshots</CardTitle>
          <CardDescription>These users need worker entries created</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>• zachmehach@gmail.com</li>
            <li>• namizich@gmail.com</li>
            <li>• nick@vsky.io</li>
            <li>• zachmeihachi@gmail.com (possible typo of zachmehach?)</li>
            <li>• efr.rivers.work@gmail.com</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-4">
            The SQL query above will automatically create entries for all of these users.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}