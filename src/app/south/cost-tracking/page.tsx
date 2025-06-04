import { Metadata } from 'next'
import { CostTrackingAnalytics } from './cost-tracking-analytics'

export const metadata: Metadata = {
  title: 'Cost Tracking | ZMF South',
  description: 'Comprehensive cost analysis and tracking for production operations',
}

export default function CostTrackingPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Cost Tracking & Analytics</h1>
        <p className="text-muted-foreground">
          Monitor production costs, material usage, and profitability metrics
        </p>
      </div>
      <CostTrackingAnalytics />
    </div>
  )
}