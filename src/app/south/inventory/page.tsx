import { Metadata } from 'next'
import { InventoryManager } from './inventory-manager'

export const metadata: Metadata = {
  title: 'Wood Inventory - ZMF South',
  description: 'Manage wood materials inventory for CNC manufacturing',
}

export default function InventoryPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Wood Inventory</h1>
        <p className="text-muted-foreground mt-2">
          Track wood materials, manage stock levels, and monitor inventory
        </p>
      </div>
      <InventoryManager />
    </div>
  )
}