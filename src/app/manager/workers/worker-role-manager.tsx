'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { 
  User, 
  Shield, 
  Crown, 
  Settings, 
  UserCheck, 
  UserX, 
  Edit3,
  Save,
  X,
  AlertTriangle
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface Worker {
  id: string
  name: string
  email: string
  role: string | null
  is_active: boolean | null
  auth_user_id: string | null
  created_at: string
  updated_at: string | null
}

interface WorkerRoleManagerProps {
  workers: Worker[]
  currentManagerId: string
}

const ROLES = [
  { value: 'worker', label: 'Worker', icon: User, description: 'Basic production worker access' },
  { value: 'supervisor', label: 'Supervisor', icon: Shield, description: 'Can oversee workers and approve tasks' },
  { value: 'manager', label: 'Manager', icon: Crown, description: 'Full administrative access' }
]

export function WorkerRoleManager({ workers, currentManagerId }: WorkerRoleManagerProps) {
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null)
  const [newRole, setNewRole] = useState<string>('')
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    worker: Worker | null
    action: 'promote' | 'demote' | 'activate' | 'deactivate'
    newRole?: string
  }>({
    open: false,
    worker: null,
    action: 'promote'
  })
  const [reason, setReason] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()

  const getRoleInfo = (role: string | null) => {
    return ROLES.find(r => r.value === role) || ROLES[0]
  }

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case 'manager': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'supervisor': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'worker': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const handleRoleChange = async (workerId: string, newRole: string) => {
    const worker = workers.find(w => w.id === workerId)
    if (!worker) return

    const currentRoleInfo = getRoleInfo(worker.role)
    const newRoleInfo = getRoleInfo(newRole)
    
    // Determine if this is a promotion or demotion
    const roleHierarchy = { worker: 1, supervisor: 2, manager: 3 }
    const currentLevel = roleHierarchy[worker.role as keyof typeof roleHierarchy] || 1
    const newLevel = roleHierarchy[newRole as keyof typeof roleHierarchy] || 1
    
    const action = newLevel > currentLevel ? 'promote' : 'demote'

    setConfirmDialog({
      open: true,
      worker,
      action,
      newRole
    })
  }

  const handleStatusToggle = async (worker: Worker) => {
    const action = worker.is_active ? 'deactivate' : 'activate'
    setConfirmDialog({
      open: true,
      worker,
      action
    })
  }

  const executeAction = async () => {
    if (!confirmDialog.worker) return

    setIsUpdating(true)
    try {
      const { worker, action, newRole } = confirmDialog

      let endpoint = ''
      let payload: any = { workerId: worker.id }

      switch (action) {
        case 'promote':
        case 'demote':
          endpoint = '/api/workers/update-role'
          payload.newRole = newRole
          payload.reason = reason || `${action}d by manager`
          break
        case 'activate':
        case 'deactivate':
          endpoint = '/api/workers/update-status'
          payload.isActive = action === 'activate'
          payload.reason = reason || `${action}d by manager`
          break
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Failed to ${action} worker`)
      }

      toast({
        title: 'Success!',
        description: `Worker ${action}d successfully.`,
      })

      // Refresh the page to get updated data
      window.location.reload()

    } catch (error) {
      console.error(`Error ${confirmDialog.action}ing worker:`, error)
      toast({
        title: 'Error',
        description: `Failed to ${confirmDialog.action} worker. Please try again.`,
        variant: 'destructive'
      })
    } finally {
      setIsUpdating(false)
      setConfirmDialog({ open: false, worker: null, action: 'promote' })
      setReason('')
    }
  }

  const activeWorkers = workers.filter(w => w.is_active)
  const inactiveWorkers = workers.filter(w => !w.is_active)

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Workers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{workers.length}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Managers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-purple-600" />
              <span className="text-2xl font-bold">{workers.filter(w => w.role === 'manager').length}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Supervisors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{workers.filter(w => w.role === 'supervisor').length}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Workers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{activeWorkers.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Workers */}
      <Card>
        <CardHeader>
          <CardTitle>Active Workers</CardTitle>
          <CardDescription>
            Manage roles and permissions for active team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeWorkers.length === 0 ? (
            <Alert>
              <AlertDescription>No active workers found.</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {activeWorkers.map((worker) => {
                const roleInfo = getRoleInfo(worker.role)
                const IconComponent = roleInfo.icon
                const isCurrentManager = worker.id === currentManagerId
                const isEditing = editingWorkerId === worker.id

                return (
                  <div 
                    key={worker.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <IconComponent className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{worker.name}</h3>
                          {isCurrentManager && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{worker.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(worker.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Select value={newRole} onValueChange={setNewRole}>
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map(role => (
                                <SelectItem key={role.value} value={role.value}>
                                  <div className="flex items-center gap-2">
                                    <role.icon className="h-4 w-4" />
                                    {role.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button 
                            size="sm" 
                            onClick={() => {
                              if (newRole && newRole !== worker.role) {
                                handleRoleChange(worker.id, newRole)
                              }
                              setEditingWorkerId(null)
                              setNewRole('')
                            }}
                            disabled={!newRole || newRole === worker.role}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                              setEditingWorkerId(null)
                              setNewRole('')
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Badge className={getRoleBadgeColor(worker.role)}>
                            <IconComponent className="h-3 w-3 mr-1" />
                            {roleInfo.label}
                          </Badge>
                          
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingWorkerId(worker.id)
                                setNewRole(worker.role || 'worker')
                              }}
                              disabled={isCurrentManager}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusToggle(worker)}
                              disabled={isCurrentManager}
                              className="text-orange-600 hover:text-orange-700"
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inactive Workers */}
      {inactiveWorkers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Inactive Workers</CardTitle>
            <CardDescription>
              Workers who have been deactivated or suspended
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inactiveWorkers.map((worker) => {
                const roleInfo = getRoleInfo(worker.role)
                const IconComponent = roleInfo.icon

                return (
                  <div 
                    key={worker.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-muted/30 opacity-75"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <IconComponent className="h-5 w-5 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-600">{worker.name}</h3>
                        <p className="text-sm text-muted-foreground">{worker.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="opacity-60">
                        <IconComponent className="h-3 w-3 mr-1" />
                        {roleInfo.label}
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => handleStatusToggle(worker)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Reactivate
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => {
        if (!open) {
          setConfirmDialog({ open: false, worker: null, action: 'promote' })
          setReason('')
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Confirm Action
            </DialogTitle>
            <DialogDescription>
              This action will change the worker's access and permissions.
            </DialogDescription>
          </DialogHeader>
          
          {confirmDialog.worker && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-semibold">{confirmDialog.worker.name}</p>
                <p className="text-sm text-muted-foreground">{confirmDialog.worker.email}</p>
                
                {confirmDialog.action === 'promote' || confirmDialog.action === 'demote' ? (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <Badge className={getRoleBadgeColor(confirmDialog.worker.role)}>
                      {getRoleInfo(confirmDialog.worker.role).label}
                    </Badge>
                    <span>→</span>
                    <Badge className={getRoleBadgeColor(confirmDialog.newRole || '')}>
                      {getRoleInfo(confirmDialog.newRole || '').label}
                    </Badge>
                  </div>
                ) : (
                  <div className="mt-2">
                    <Badge variant={confirmDialog.action === 'activate' ? 'default' : 'secondary'}>
                      {confirmDialog.action === 'activate' ? 'Will be activated' : 'Will be deactivated'}
                    </Badge>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="reason">Reason (Optional)</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={`Reason for ${confirmDialog.action}...`}
                  className="mt-1"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setConfirmDialog({ open: false, worker: null, action: 'promote' })
              setReason('')
            }}>
              Cancel
            </Button>
            <Button
              onClick={executeAction}
              disabled={isUpdating}
              className={
                confirmDialog.action === 'deactivate' 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }
            >
              {isUpdating ? 'Processing...' : `Confirm ${confirmDialog.action}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 