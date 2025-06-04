import { Metadata } from 'next'
import { SouthDashboard } from './south-dashboard'

export const metadata: Metadata = {
  title: 'Dashboard - ZMF South',
  description: 'Machine shop dashboard for headphone manufacturing',
}

export default function SouthDashboardPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Machine Shop Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          South Office - CNC Manufacturing Operations
        </p>
      </div>
      <SouthDashboard />
    </div>
  )
}