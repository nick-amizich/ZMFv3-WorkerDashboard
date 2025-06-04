import { Metadata } from 'next'
import { MaterialOptimizer } from './material-optimizer'

export const metadata: Metadata = {
  title: 'Material Optimization | ZMF South',
  description: 'Optimize material usage for production efficiency',
}

export default function OptimizationPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Material Optimization</h1>
        <p className="text-muted-foreground">
          Maximize material utilization and minimize waste in production
        </p>
      </div>
      <MaterialOptimizer />
    </div>
  )
}