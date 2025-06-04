import { Metadata } from 'next'
import { MachineShopAnalytics } from './machine-shop-analytics'

export const metadata: Metadata = {
  title: 'Machine Shop Analytics | ZMF South',
  description: 'Analytics and insights for ZMF South machine shop operations',
}

export default function AnalyticsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Machine Shop Analytics</h1>
        <p className="text-muted-foreground">
          Performance metrics and insights for machining operations
        </p>
      </div>
      <MachineShopAnalytics />
    </div>
  )
}