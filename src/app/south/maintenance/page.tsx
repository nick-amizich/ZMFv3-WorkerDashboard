import { Metadata } from 'next'
import { MaintenanceAlertsManager } from './maintenance-alerts-manager'

export const metadata: Metadata = {
  title: 'Maintenance Alerts | ZMF South',
  description: 'Predictive maintenance alerts and scheduling for machine shop',
}

export default function MaintenancePage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Maintenance Management</h1>
        <p className="text-muted-foreground">
          Predictive alerts and proactive maintenance scheduling
        </p>
      </div>
      <MaintenanceAlertsManager />
    </div>
  )
}