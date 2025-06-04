import { Metadata } from 'next'
import { ProductionScheduler } from './production-scheduler'

export const metadata: Metadata = {
  title: 'Production Scheduling | ZMF South',
  description: 'Advanced production scheduling with conflict resolution',
}

export default function SchedulingPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Production Scheduling</h1>
        <p className="text-muted-foreground">
          Optimize machine scheduling and resolve conflicts automatically
        </p>
      </div>
      <ProductionScheduler />
    </div>
  )
}