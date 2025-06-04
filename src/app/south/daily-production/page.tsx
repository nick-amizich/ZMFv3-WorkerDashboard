import { Metadata } from 'next'
import { DailyProductionManager } from './daily-production-manager'

export const metadata: Metadata = {
  title: 'Daily Production - ZMF South',
  description: 'Log daily production output and track manufacturing progress',
}

export default function DailyProductionPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Daily Production</h1>
        <p className="text-muted-foreground mt-2">
          Log production output, track efficiency, and manage daily operations
        </p>
      </div>
      <DailyProductionManager />
    </div>
  )
}