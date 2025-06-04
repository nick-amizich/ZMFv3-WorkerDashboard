import { Metadata } from 'next'
import { MachineSettingsManager } from './machine-settings-manager'

export const metadata: Metadata = {
  title: 'Machine Settings - ZMF South',
  description: 'Manage CNC machine configurations and settings',
}

export default function MachinesPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Machine Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure CNC machines, manage settings, and track maintenance
        </p>
      </div>
      <MachineSettingsManager />
    </div>
  )
}