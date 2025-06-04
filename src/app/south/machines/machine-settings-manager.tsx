'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { 
  Plus, 
  Settings, 
  Wrench,
  AlertCircle,
  CheckCircle,
  Calendar,
  Clock,
  Copy,
  Edit,
  Save,
  X
} from 'lucide-react'
import { logBusiness, logError } from '@/lib/logger-client'

interface Machine {
  id: string
  machine_name: string
  machine_type: string
  serial_number: string | null
  location_id: string
  status: 'operational' | 'maintenance' | 'offline'
  last_maintenance: string | null
  next_maintenance_due: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

interface MachineSettings {
  id: string
  part_id: string
  operation_number: number
  cnc_part_number: number | null
  work_offset: string | null
  hsm_work_offset_number: number | null
  jaw_type: string | null
  x_axis_offset: number | null
  y_axis_offset: number | null
  z_axis_offset: number | null
  machine_id: string
  program_name: string | null
  cycle_time_minutes: number | null
  setup_notes: string | null
  validated_date: string | null
  validated_by: string | null
  part?: {
    part_name: string
    part_type: string
  }
  validator?: {
    name: string
  }
}

export function MachineSettingsManager() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [machineSettings, setMachineSettings] = useState<MachineSettings[]>([])
  const [parts, setParts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isMachineDialogOpen, setIsMachineDialogOpen] = useState(false)
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false)
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null)
  const [editingSettings, setEditingSettings] = useState<MachineSettings | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [machinesRes, settingsRes, partsRes] = await Promise.all([
        supabase
          .from('machines')
          .select('*')
          .order('machine_name'),
        supabase
          .from('machine_settings')
          .select(`
            *,
            part:parts_catalog(part_name, part_type),
            validator:workers!machine_settings_validated_by_fkey(name)
          `)
          .order('part_id, operation_number'),
        supabase
          .from('parts_catalog')
          .select('id, part_name, part_type')
          .eq('status', 'active')
          .order('part_name')
      ])

      if (machinesRes.error) throw machinesRes.error
      if (settingsRes.error) throw settingsRes.error
      if (partsRes.error) throw partsRes.error

      setMachines(machinesRes.data || [])
      setMachineSettings(settingsRes.data || [])
      setParts(partsRes.data || [])
    } catch (error) {
      logError(error as Error, 'MACHINE_SETTINGS', { action: 'load' })
      toast({
        title: 'Error loading data',
        description: 'Failed to load machine settings',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function saveMachine(formData: FormData) {
    try {
      const machineData = {
        machine_name: formData.get('machine_name') as string,
        machine_type: formData.get('machine_type') as string,
        serial_number: formData.get('serial_number') as string || null,
        status: formData.get('status') as 'operational' | 'maintenance' | 'offline',
        last_maintenance: formData.get('last_maintenance') as string || null,
        next_maintenance_due: formData.get('next_maintenance_due') as string || null,
        notes: formData.get('notes') as string || null,
      }

      const { error } = await supabase
        .from('machines')
        .insert([{
          ...machineData,
          location_id: (await supabase.from('locations').select('id').eq('code', 'south').single()).data?.id
        }])

      if (error) throw error

      logBusiness('Machine added', 'MACHINE_SETTINGS', { 
        machineName: machineData.machine_name,
        machineType: machineData.machine_type
      })

      toast({
        title: 'Machine added',
        description: `${machineData.machine_name} has been added successfully`,
      })

      setIsMachineDialogOpen(false)
      loadData()
    } catch (error) {
      logError(error as Error, 'MACHINE_SETTINGS', { action: 'save_machine' })
      toast({
        title: 'Error saving machine',
        description: error instanceof Error ? error.message : 'Failed to save machine',
        variant: 'destructive',
      })
    }
  }

  async function saveMachineSettings(formData: FormData) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const settingsData = {
        part_id: formData.get('part_id') as string,
        operation_number: parseInt(formData.get('operation_number') as string),
        cnc_part_number: formData.get('cnc_part_number') ? parseInt(formData.get('cnc_part_number') as string) : null,
        work_offset: formData.get('work_offset') as string || null,
        hsm_work_offset_number: formData.get('hsm_work_offset_number') ? parseInt(formData.get('hsm_work_offset_number') as string) : null,
        jaw_type: formData.get('jaw_type') as string || null,
        x_axis_offset: formData.get('x_axis_offset') ? parseFloat(formData.get('x_axis_offset') as string) : null,
        y_axis_offset: formData.get('y_axis_offset') ? parseFloat(formData.get('y_axis_offset') as string) : null,
        z_axis_offset: formData.get('z_axis_offset') ? parseFloat(formData.get('z_axis_offset') as string) : null,
        machine_id: formData.get('machine_id') as string,
        program_name: formData.get('program_name') as string || null,
        cycle_time_minutes: formData.get('cycle_time_minutes') ? parseFloat(formData.get('cycle_time_minutes') as string) : null,
        setup_notes: formData.get('setup_notes') as string || null,
        validated_date: formData.get('validated') === 'true' ? new Date().toISOString().split('T')[0] : null,
        validated_by: formData.get('validated') === 'true' ? user.id : null,
      }

      if (editingSettings) {
        const { error } = await supabase
          .from('machine_settings')
          .update(settingsData)
          .eq('id', editingSettings.id)

        if (error) throw error

        logBusiness('Machine settings updated', 'MACHINE_SETTINGS', { 
          settingsId: editingSettings.id,
          partId: settingsData.part_id
        })

        toast({
          title: 'Settings updated',
          description: 'Machine settings have been updated successfully',
        })
      } else {
        const { error } = await supabase
          .from('machine_settings')
          .insert([settingsData])

        if (error) throw error

        logBusiness('Machine settings created', 'MACHINE_SETTINGS', { 
          partId: settingsData.part_id,
          machineId: settingsData.machine_id,
          operation: settingsData.operation_number
        })

        toast({
          title: 'Settings created',
          description: 'Machine settings have been created successfully',
        })
      }

      setIsSettingsDialogOpen(false)
      setEditingSettings(null)
      loadData()
    } catch (error) {
      logError(error as Error, 'MACHINE_SETTINGS', { action: 'save_settings' })
      toast({
        title: 'Error saving settings',
        description: error instanceof Error ? error.message : 'Failed to save settings',
        variant: 'destructive',
      })
    }
  }

  async function updateMachineStatus(id: string, status: string) {
    try {
      const { error } = await supabase
        .from('machines')
        .update({ status })
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Status updated',
        description: `Machine status changed to ${status}`,
      })

      loadData()
    } catch (error) {
      logError(error as Error, 'MACHINE_SETTINGS', { action: 'update_status' })
      toast({
        title: 'Error updating status',
        description: 'Failed to update machine status',
        variant: 'destructive',
      })
    }
  }

  const statusColors = {
    operational: 'default',
    maintenance: 'secondary',
    offline: 'destructive',
  } as const

  const operationalMachines = machines.filter(m => m.status === 'operational').length
  const maintenanceDue = machines.filter(m => {
    if (!m.next_maintenance_due) return false
    return new Date(m.next_maintenance_due) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }).length

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Machines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{machines.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Operational
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{operationalMachines}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Settings Configured
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{machineSettings.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Maintenance Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{maintenanceDue}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Within 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="machines" className="space-y-4">
        <TabsList>
          <TabsTrigger value="machines">Machines</TabsTrigger>
          <TabsTrigger value="settings">Part Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="machines" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>CNC Machines</CardTitle>
                <Dialog open={isMachineDialogOpen} onOpenChange={setIsMachineDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Machine
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Machine</DialogTitle>
                    </DialogHeader>
                    <MachineForm 
                      onSubmit={saveMachine}
                      onCancel={() => setIsMachineDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading machines...</div>
              ) : machines.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No machines configured yet
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {machines.map((machine) => (
                    <Card key={machine.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{machine.machine_name}</CardTitle>
                            <CardDescription>{machine.machine_type}</CardDescription>
                          </div>
                          <Select 
                            value={machine.status} 
                            onValueChange={(value) => updateMachineStatus(machine.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="operational">Operational</SelectItem>
                              <SelectItem value="maintenance">Maintenance</SelectItem>
                              <SelectItem value="offline">Offline</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {machine.serial_number && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Serial:</span> {machine.serial_number}
                          </div>
                        )}
                        {machine.last_maintenance && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Last Maintenance:</span>{' '}
                            {new Date(machine.last_maintenance).toLocaleDateString()}
                          </div>
                        )}
                        {machine.next_maintenance_due && (
                          <div className="text-sm">
                            <span className={
                              new Date(machine.next_maintenance_due) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                                ? 'text-orange-600 font-medium'
                                : ''
                            }>
                              {new Date(machine.next_maintenance_due).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        <div className="pt-2">
                          <Badge variant={statusColors[machine.status]}>
                            {machine.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Part Machine Settings</CardTitle>
                <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Settings
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingSettings ? 'Edit Machine Settings' : 'Add Machine Settings'}
                      </DialogTitle>
                    </DialogHeader>
                    <MachineSettingsForm 
                      settings={editingSettings}
                      parts={parts}
                      machines={machines.filter(m => m.status === 'operational')}
                      onSubmit={saveMachineSettings}
                      onCancel={() => {
                        setIsSettingsDialogOpen(false)
                        setEditingSettings(null)
                      }}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading settings...</div>
              ) : machineSettings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No machine settings configured yet
                </div>
              ) : (
                <div className="space-y-4">
                  {parts.map(part => {
                    const partSettings = machineSettings.filter(s => s.part_id === part.id)
                    if (partSettings.length === 0) return null

                    return (
                      <Card key={part.id}>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            {part.part_name} ({part.part_type})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {partSettings
                              .sort((a, b) => a.operation_number - b.operation_number)
                              .map(settings => {
                                const machine = machines.find(m => m.id === settings.machine_id)
                                return (
                                  <div key={settings.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="space-y-1">
                                      <div className="font-medium">
                                        Operation {settings.operation_number}: {machine?.machine_name || 'Unknown Machine'}
                                      </div>
                                      <div className="text-sm text-muted-foreground space-x-4">
                                        {settings.program_name && <span>Program: {settings.program_name}</span>}
                                        {settings.cycle_time_minutes && <span>Cycle: {settings.cycle_time_minutes}min</span>}
                                        {settings.work_offset && <span>Offset: {settings.work_offset}</span>}
                                      </div>
                                      {settings.validated_date && (
                                        <div className="text-xs text-green-600 flex items-center gap-1">
                                          <CheckCircle className="h-3 w-3" />
                                          Validated on {new Date(settings.validated_date).toLocaleDateString()}
                                          {settings.validator && ` by ${settings.validator.name}`}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingSettings(settings)
                                          setIsSettingsDialogOpen(true)
                                        }}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button size="sm" variant="ghost">
                                        <Copy className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                )
                              })}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MachineForm({ 
  onSubmit, 
  onCancel 
}: { 
  onSubmit: (data: FormData) => void
  onCancel: () => void
}) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="machine_name">Machine Name</Label>
        <Input
          id="machine_name"
          name="machine_name"
          placeholder="e.g., CNC Mill #1"
          required
        />
      </div>

      <div>
        <Label htmlFor="machine_type">Machine Type</Label>
        <Input
          id="machine_type"
          name="machine_type"
          placeholder="e.g., 3-Axis Mill, 5-Axis Mill, Lathe"
          required
        />
      </div>

      <div>
        <Label htmlFor="serial_number">Serial Number</Label>
        <Input
          id="serial_number"
          name="serial_number"
          placeholder="Optional"
        />
      </div>

      <div>
        <Label htmlFor="status">Status</Label>
        <Select name="status" defaultValue="operational">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="operational">Operational</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="last_maintenance">Last Maintenance</Label>
          <Input
            id="last_maintenance"
            name="last_maintenance"
            type="date"
          />
        </div>
        <div>
          <Label htmlFor="next_maintenance_due">Next Maintenance Due</Label>
          <Input
            id="next_maintenance_due"
            name="next_maintenance_due"
            type="date"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          name="notes"
          className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background"
          placeholder="Any notes about this machine..."
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Add Machine
        </Button>
      </div>
    </form>
  )
}

function MachineSettingsForm({ 
  settings,
  parts,
  machines,
  onSubmit, 
  onCancel 
}: { 
  settings: MachineSettings | null
  parts: any[]
  machines: Machine[]
  onSubmit: (data: FormData) => void
  onCancel: () => void
}) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Setup</TabsTrigger>
          <TabsTrigger value="offsets">Offsets</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="part_id">Part</Label>
              <Select name="part_id" defaultValue={settings?.part_id} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a part" />
                </SelectTrigger>
                <SelectContent>
                  {parts.map(part => (
                    <SelectItem key={part.id} value={part.id}>
                      {part.part_name} ({part.part_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="machine_id">Machine</Label>
              <Select name="machine_id" defaultValue={settings?.machine_id} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a machine" />
                </SelectTrigger>
                <SelectContent>
                  {machines.map(machine => (
                    <SelectItem key={machine.id} value={machine.id}>
                      {machine.machine_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="operation_number">Operation Number</Label>
              <Input
                id="operation_number"
                name="operation_number"
                type="number"
                min="1"
                defaultValue={settings?.operation_number || ''}
                required
              />
            </div>
            <div>
              <Label htmlFor="cnc_part_number">CNC Part Number</Label>
              <Input
                id="cnc_part_number"
                name="cnc_part_number"
                type="number"
                defaultValue={settings?.cnc_part_number || ''}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="program_name">Program Name</Label>
              <Input
                id="program_name"
                name="program_name"
                placeholder="e.g., O1234"
                defaultValue={settings?.program_name || ''}
              />
            </div>
            <div>
              <Label htmlFor="cycle_time_minutes">Cycle Time (minutes)</Label>
              <Input
                id="cycle_time_minutes"
                name="cycle_time_minutes"
                type="number"
                step="0.1"
                defaultValue={settings?.cycle_time_minutes || ''}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="offsets" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="work_offset">Work Offset</Label>
              <Input
                id="work_offset"
                name="work_offset"
                placeholder="e.g., G54"
                defaultValue={settings?.work_offset || ''}
              />
            </div>
            <div>
              <Label htmlFor="hsm_work_offset_number">HSM Work Offset Number</Label>
              <Input
                id="hsm_work_offset_number"
                name="hsm_work_offset_number"
                type="number"
                defaultValue={settings?.hsm_work_offset_number || ''}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Axis Offsets</Label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="x_axis_offset">X Axis (mm)</Label>
                <Input
                  id="x_axis_offset"
                  name="x_axis_offset"
                  type="number"
                  step="0.0001"
                  defaultValue={settings?.x_axis_offset || ''}
                />
              </div>
              <div>
                <Label htmlFor="y_axis_offset">Y Axis (mm)</Label>
                <Input
                  id="y_axis_offset"
                  name="y_axis_offset"
                  type="number"
                  step="0.0001"
                  defaultValue={settings?.y_axis_offset || ''}
                />
              </div>
              <div>
                <Label htmlFor="z_axis_offset">Z Axis (mm)</Label>
                <Input
                  id="z_axis_offset"
                  name="z_axis_offset"
                  type="number"
                  step="0.0001"
                  defaultValue={settings?.z_axis_offset || ''}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <div>
            <Label htmlFor="jaw_type">Jaw Type</Label>
            <Input
              id="jaw_type"
              name="jaw_type"
              placeholder="e.g., Soft Jaws, Hard Jaws"
              defaultValue={settings?.jaw_type || ''}
            />
          </div>

          <div>
            <Label htmlFor="setup_notes">Setup Notes</Label>
            <textarea
              id="setup_notes"
              name="setup_notes"
              className="w-full min-h-[120px] px-3 py-2 text-sm rounded-md border border-input bg-background"
              placeholder="Detailed setup instructions..."
              defaultValue={settings?.setup_notes || ''}
            />
          </div>

          <div className="flex items-center gap-4">
            <Label htmlFor="validated" className="flex items-center gap-2">
              <input
                type="checkbox"
                id="validated"
                name="validated"
                value="true"
                defaultChecked={!!settings?.validated_date}
                className="rounded border-gray-300"
              />
              Mark as Validated
            </Label>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {settings ? 'Update Settings' : 'Create Settings'}
        </Button>
      </div>
    </form>
  )
}