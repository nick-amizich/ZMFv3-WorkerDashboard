import { Metadata } from 'next'
import { WoodInventoryDashboard } from './wood-inventory-dashboard'

export const metadata: Metadata = {
  title: 'Wood Inventory Management | ZMF South',
  description: 'Digital inventory management system for tracking wood materials',
}

export default function WoodInventoryPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Wood Inventory Management</h1>
        <p className="text-muted-foreground">
          Track materials from raw stock through production
        </p>
      </div>
      <WoodInventoryDashboard />
    </div>
  )
}