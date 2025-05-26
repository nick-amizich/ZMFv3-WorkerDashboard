'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { User, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface Worker {
  id: string
  auth_user_id: string | null
  name: string
  email: string
  role: string | null
  skills: string[] | null
  is_active: boolean | null
  approval_status: string | null
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  created_at: string | null
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [actionModalOpen, setActionModalOpen] = useState(false)
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve')
  const [actionReason, setActionReason] = useState('')
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchWorkers()
    checkCurrentUserPermissions()
  }, [])

  const checkCurrentUserPermissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('No user authenticated')
        return
      }

      // Check if current user exists in workers table
      const { data: currentWorker, error } = await supabase
        .from('workers')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      console.log('Current user worker record:', { currentWorker, error, userId: user.id })
      
      if (currentWorker) {
        console.log('Current user role:', currentWorker.role)
        console.log('Is current user active?', currentWorker.is_active)
        console.log('Current user approval status:', currentWorker.approval_status)
      }
    } catch (error) {
      console.error('Error checking permissions:', error)
    }
  }

  const fetchWorkers = async () => {
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .order('created_at', { ascending: false })

      console.log('Fetched workers:', { data, error })
      
      if (error) throw error
      setWorkers(data || [])
    } catch (error) {
      console.error('Error fetching workers:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch workers',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApproveReject = async (worker: Worker, action: 'approve' | 'reject') => {
    if (action === 'reject' && !actionReason) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for rejection',
        variant: 'destructive'
      })
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get current manager's worker ID (not auth user ID)
      const { data: currentManager, error: managerError } = await supabase
        .from('workers')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (managerError || !currentManager) {
        throw new Error('Manager worker record not found')
      }

      console.log('Attempting to', action, 'worker:', {
        workerId: worker.id,
        managerWorkerId: currentManager.id,
        action
      })

      let result
      if (action === 'approve') {
        result = await supabase.rpc('approve_worker' as any, {
          p_worker_id: worker.id,
          p_approved_by_id: currentManager.id
        })
      } else {
        result = await supabase.rpc('reject_worker' as any, {
          p_worker_id: worker.id,
          p_rejected_by_id: currentManager.id,
          p_reason: actionReason
        })
      }

      console.log('RPC result:', result)

      if (result.error) throw result.error

      toast({
        title: 'Success',
        description: `Worker ${action}ed successfully`
      })
      
      setActionModalOpen(false)
      setActionReason('')
      fetchWorkers()
    } catch (error) {
      console.error(`Error ${action}ing worker:`, error)
      toast({
        title: 'Error',
        description: `Failed to ${action} worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      })
    }
  }

  const toggleWorkerStatus = async (worker: Worker) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get current manager's worker ID (not auth user ID)
      const { data: currentManager, error: managerError } = await supabase
        .from('workers')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (managerError || !currentManager) {
        throw new Error('Manager worker record not found')
      }

      console.log('Toggling worker status:', {
        workerId: worker.id,
        currentStatus: worker.is_active,
        approvalStatus: worker.approval_status,
        managerWorkerId: currentManager.id
      })

      let result
      if (worker.is_active) {
        // Suspend the worker
        result = await supabase.rpc('suspend_worker' as any, {
          p_worker_id: worker.id,
          p_suspended_by_id: currentManager.id,
          p_reason: 'Manually suspended by manager'
        })
      } else if (worker.approval_status === 'suspended') {
        // Reactivate suspended worker
        result = await supabase.rpc('reactivate_worker' as any, {
          p_worker_id: worker.id,
          p_reactivated_by_id: currentManager.id
        })
      } else {
        // For other cases, just update is_active
        result = await supabase
          .from('workers')
          .update({ is_active: !worker.is_active })
          .eq('id', worker.id)
      }

      console.log('Toggle result:', result)

      if (result.error) throw result.error

      toast({
        title: 'Success',
        description: `Worker ${worker.is_active ? 'suspended' : 'reactivated'} successfully`
      })
      
      fetchWorkers()
    } catch (error) {
      console.error('Error toggling worker status:', error)
      toast({
        title: 'Error',
        description: `Failed to update worker status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      })
    }
  }

  const pendingWorkers = workers.filter(w => w.approval_status === 'pending')
  const activeWorkers = workers.filter(w => w.is_active && w.approval_status === 'approved')
  const inactiveWorkers = workers.filter(w => !w.is_active || w.approval_status === 'rejected')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Worker Management</h2>
        <Button onClick={fetchWorkers} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Info Alert */}
      {pendingWorkers.length === 0 && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>How User Approval Works:</strong>
            <br />
            1. When new users register at <code>/register</code>, they appear here as "Pending Approval"
            <br />
            2. You can approve or reject them from this page
            <br />
            3. Workers must be approved before they can access the system
          </AlertDescription>
        </Alert>
      )}

      {/* Pending Approvals */}
      {pendingWorkers.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <Clock className="h-5 w-5" />
              {pendingWorkers.length} Pending Approval{pendingWorkers.length > 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingWorkers.map((worker) => (
                <div key={worker.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div>
                    <p className="font-semibold">{worker.name}</p>
                    <p className="text-sm text-gray-600">{worker.email}</p>
                    <p className="text-xs text-gray-500">Applied: {worker.created_at ? new Date(worker.created_at).toLocaleDateString() : 'Unknown'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{worker.role}</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 hover:text-green-700"
                      onClick={() => {
                        setSelectedWorker(worker)
                        setActionType('approve')
                        setActionModalOpen(true)
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => {
                        setSelectedWorker(worker)
                        setActionType('reject')
                        setActionModalOpen(true)
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="space-y-6">
        {/* Active Workers */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Active Workers ({activeWorkers.length})</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeWorkers.map((worker) => (
              <Card key={worker.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{worker.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{worker.email}</p>
                      </div>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Role:</span>
                      <Badge variant="outline">{worker.role}</Badge>
                    </div>
                    {worker.skills && worker.skills.length > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Skills:</span>
                        <span className="text-sm text-muted-foreground">
                          {worker.skills.length} skills
                        </span>
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-4"
                    onClick={() => toggleWorkerStatus(worker)}
                  >
                    Suspend Worker
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        {/* Inactive Workers */}
        {inactiveWorkers.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Inactive Workers ({inactiveWorkers.length})</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {inactiveWorkers.map((worker) => (
                <Card key={worker.id} className="opacity-75">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{worker.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{worker.email}</p>
                        </div>
                      </div>
                      <XCircle className="w-5 h-5 text-red-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {worker.approval_status === 'rejected' && worker.rejection_reason && (
                      <p className="text-sm text-red-600 mb-2">Rejected: {worker.rejection_reason}</p>
                    )}
                    {worker.approval_status === 'approved' && (
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="w-full"
                        onClick={() => toggleWorkerStatus(worker)}
                      >
                        Activate Worker
                      </Button>
                    )}
                    {worker.approval_status === 'suspended' && (
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="w-full"
                        onClick={() => toggleWorkerStatus(worker)}
                      >
                        Reactivate Worker
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Modal */}
      <Dialog open={actionModalOpen} onOpenChange={setActionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Worker' : 'Reject Worker'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Dialog for worker approval/rejection actions
            </DialogDescription>
          </DialogHeader>
          
          {selectedWorker && (
            <div className="mb-4">
              <p className="font-semibold">{selectedWorker.name}</p>
              <p className="text-sm text-muted-foreground">{selectedWorker.email}</p>
            </div>
          )}
          
          {actionType === 'reject' && (
            <div className="space-y-2">
              <Label>Reason for rejection</Label>
              <Textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Please provide a reason for rejection"
                rows={3}
              />
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedWorker) {
                  handleApproveReject(selectedWorker, actionType)
                }
              }}
              className={
                actionType === 'approve'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }
            >
              {actionType === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}