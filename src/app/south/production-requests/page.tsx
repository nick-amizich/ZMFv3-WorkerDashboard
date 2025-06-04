import { Metadata } from 'next'
import { ProductionRequestsManager } from './production-requests-manager'

export const metadata: Metadata = {
  title: 'Production Requests - ZMF South',
  description: 'Manage CNC production requests and scheduling',
}

export default function ProductionRequestsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Production Requests</h1>
        <p className="text-muted-foreground mt-2">
          Manage customer orders and production scheduling
        </p>
      </div>
      <ProductionRequestsManager />
    </div>
  )
}