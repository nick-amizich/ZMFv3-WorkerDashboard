'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { 
  Users, 
  UserX, 
  UserCheck, 
  AlertTriangle, 
  RefreshCw,
  Database,
  Zap,
  CheckCircle
} from 'lucide-react'

interface OrphanedUser {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
}

export default function AuthSyncPage() {
  const [loading, setLoading] = useState(false)
  const [orphanedUsers, setOrphanedUsers] = useState<OrphanedUser[]>([])
  const [stats, setStats] = useState<any>(null)
  const [syncing, setSyncing] = useState(false)
  const { toast } = useToast()

  const checkAuthSync = async () => {
    setLoading(true)
    try {
      // First, let's check directly in the database
      const supabase = createClient()
      
      // Get all workers
      const { data: workers, error: workersError } = await supabase
        .from('workers')
        .select('auth_user_id, email, name, approval_status')
      
      if (workersError) {
        console.error('Error fetching workers:', workersError)
        toast({
          title: 'Error',
          description: 'Failed to fetch workers',
          variant: 'destructive'
        })
        return
      }
      
      // Try to get auth users (this might fail due to permissions)
      const response = await fetch('/api/admin/sync-auth-users')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setOrphanedUsers(data.orphaned || [])
      } else {
        // Fallback: just show worker stats
        setStats({
          totalWorkers: workers?.length || 0,
          pendingWorkers: workers?.filter(w => w.approval_status === 'pending').length || 0,
          approvedWorkers: workers?.filter(w => w.approval_status === 'approved').length || 0,
          rejectedWorkers: workers?.filter(w => w.approval_status === 'rejected').length || 0
        })
      }
      
    } catch (error) {
      console.error('Error checking sync:', error)
      toast({
        title: 'Error',
        description: 'Failed to check auth sync status',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const syncAllUsers = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/admin/sync-auth-users')
      if (response.ok) {
        const data = await response.json()
        toast({
          title: 'Sync completed',
          description: `Created ${data.created?.length || 0} worker entries`
        })
        checkAuthSync() // Refresh
      } else {
        const error = await response.json()
        toast({
          title: 'Sync failed',
          description: error.error || 'Failed to sync users',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error syncing:', error)
      toast({
        title: 'Error',
        description: 'Failed to sync users',
        variant: 'destructive'
      })
    } finally {
      setSyncing(false)
    }
  }

  const createWorkerEntry = async (authUserId: string, email: string) => {
    try {
      const response = await fetch('/api/admin/sync-auth-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authUserId, email })
      })
      
      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Worker entry created'
        })
        checkAuthSync()
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'Failed to create worker entry',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error creating worker:', error)
      toast({
        title: 'Error',
        description: 'Failed to create worker entry',
        variant: 'destructive'
      })
    }
  }

  useEffect(() => {
    checkAuthSync()
  }, [])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Auth User Sync</h1>
          <p className="text-muted-foreground">Sync Supabase Auth users with worker entries</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={checkAuthSync} disabled={loading} variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {orphanedUsers.length > 0 && (
            <Button onClick={syncAllUsers} disabled={syncing}>
              <Zap className="mr-2 h-4 w-4" />
              Sync All Users
            </Button>
          )}
        </div>
      </div>

      {/* Explanation */}
      <Alert className="border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Why you might not see pending users:</strong>
          <br />
          When users register, they&apos;re created in Supabase Auth but sometimes the worker profile fails to create.
          This page helps you find and fix those orphaned auth users.
        </AlertDescription>
      </Alert>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Auth Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">{stats.totalAuthUsers || 'N/A'}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Worker Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">{stats.totalWorkers || 0}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Orphaned Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <UserX className="h-4 w-4 text-red-600" />
                <span className="text-2xl font-bold text-red-600">
                  {stats.orphanedUsers || orphanedUsers.length || 0}
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-yellow-600" />
                <span className="text-2xl font-bold text-yellow-600">
                  {stats.pendingWorkers || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Manual Fix Section */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Worker Entry Creation</CardTitle>
          <CardDescription>
            Based on your Supabase Auth users, you can manually create worker entries for the missing users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>How to manually fix:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Go to Supabase Dashboard → Authentication → Users</li>
                  <li>Copy the user ID and email of any user</li>
                  <li>Check if they exist in the workers table</li>
                  <li>If not, use the SQL query below to create their entry</li>
                </ol>
              </AlertDescription>
            </Alert>
            
            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="text-sm font-mono mb-2">SQL Query to create pending worker:</p>
              <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
{`INSERT INTO workers (
  auth_user_id, 
  email, 
  name, 
  role, 
  is_active, 
  approval_status, 
  skills
) VALUES (
  'paste-auth-user-id-here',
  'user@email.com',
  'User Name',
  'worker',
  false,
  'pending',
  ARRAY[]::text[]
);`}
              </pre>
            </div>
            
            {/* Quick fix for known missing users */}
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold mb-2">Quick Fix: Create Missing Worker Entries</h4>
              <p className="text-sm text-gray-600 mb-3">
                Based on your screenshots, these auth users need worker entries:
              </p>
              <ul className="text-sm mb-3 space-y-1">
                <li>• zachmehach@gmail.com</li>
                <li>• namizich@gmail.com</li>
                <li>• efr.rivers.work@gmail.com</li>
                <li>• And others...</li>
              </ul>
              <Button
                onClick={async () => {
                  // Create entries for known missing users
                  const missingUsers = [
                    { id: '1dcc6837-a465-4fdb-96f0-b83601d7328b', email: 'zachmehach@gmail.com', name: 'zachmehach' },
                    { id: '578016537-5a66-45cc-b852-6335b3cce5fe', email: 'namizich@gmail.com', name: 'namizich' },
                    { id: '6702afd5-e203-4fda-b948-329adff294d0', email: 'nick@vsky.io', name: 'nick' },
                    { id: '902cb213-4ad9-4496-8115-e0c689b1976c', email: 'zachmeihachi@gmail.com', name: 'zachmeihachi' },
                    { id: 'c7dc1fc8-4d00-476b-8162-38bbd8119bc4', email: 'efr.rivers.work@gmail.com', name: 'efr.rivers.work' }
                  ]
                  
                  const response = await fetch('/api/admin/create-worker-entries', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ authUsers: missingUsers })
                  })
                  
                  if (response.ok) {
                    const data = await response.json()
                    toast({
                      title: 'Success',
                      description: `Created ${data.results.created.length} worker entries`
                    })
                    checkAuthSync()
                  } else {
                    toast({
                      title: 'Error',
                      description: 'Failed to create worker entries',
                      variant: 'destructive'
                    })
                  }
                }}
                className="w-full"
              >
                Create All Missing Worker Entries
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orphaned Users List */}
      {orphanedUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Orphaned Auth Users</CardTitle>
            <CardDescription>
              Auth users without worker entries - click to create pending entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {orphanedUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{user.email}</p>
                    <p className="text-sm text-muted-foreground">
                      Created: {new Date(user.created_at).toLocaleDateString()}
                      {user.last_sign_in_at && (
                        <> • Last login: {new Date(user.last_sign_in_at).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => createWorkerEntry(user.id, user.email)}
                  >
                    Create Worker Entry
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}