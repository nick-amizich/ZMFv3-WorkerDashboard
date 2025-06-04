import { Metadata } from 'next'
import { TransferManager } from './transfer-manager'

export const metadata: Metadata = {
  title: 'Facility Transfers | ZMF South',
  description: 'Manage transfers between ZMF facilities',
}

export default function TransfersPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Facility Transfers</h1>
        <p className="text-muted-foreground">
          Track and manage material and component transfers between facilities
        </p>
      </div>
      <TransferManager />
    </div>
  )
}