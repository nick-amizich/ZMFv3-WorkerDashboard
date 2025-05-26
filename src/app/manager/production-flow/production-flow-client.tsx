'use client'

import { SimplifiedProductionFlow } from '@/components/manager/simplified-production-flow'

interface Workflow {
  id: string
  name: string
}

interface ProductionFlowPageClientProps {
  workflows: Workflow[]
}

export function ProductionFlowPageClient({ workflows }: ProductionFlowPageClientProps) {
  return (
    <div className="container mx-auto p-6">
      <SimplifiedProductionFlow />
    </div>
  )
} 