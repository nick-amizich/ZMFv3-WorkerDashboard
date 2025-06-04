import { Metadata } from 'next'
import { MachineUtilizationDashboard } from './machine-utilization-dashboard'

export const metadata: Metadata = {
  title: 'Machine Utilization | ZMF South',
  description: 'Real-time machine utilization monitoring and analytics',
}

export default function UtilizationPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Machine Utilization</h1>
        <p className="text-muted-foreground">
          Monitor machine performance and optimize production capacity
        </p>
      </div>
      <MachineUtilizationDashboard />
    </div>
  )
}