'use client'

import { useState } from 'react'
import { EnhancedProductionFlowBoard } from '@/components/manager/enhanced-production-flow-board'
import { BatchCreatorModal } from '@/components/manager/batch-creator-modal'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface Workflow {
  id: string
  name: string
}

interface ProductionFlowPageClientProps {
  workflows: Workflow[]
}

export function ProductionFlowPageClient({ workflows }: ProductionFlowPageClientProps) {
  const [showBatchCreator, setShowBatchCreator] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleBatchCreated = () => {
    setShowBatchCreator(false)
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Production Flow</h1>
          <p className="text-gray-600">Real-time workflow execution monitoring</p>
        </div>
        
        <Button 
          className="bg-green-600 hover:bg-green-700"
          onClick={() => setShowBatchCreator(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Batch
        </Button>
      </div>

      <EnhancedProductionFlowBoard key={refreshKey} />
      
      <BatchCreatorModal
        open={showBatchCreator}
        onClose={() => setShowBatchCreator(false)}
        workflows={workflows}
        onBatchCreated={handleBatchCreated}
      />
    </div>
  )
} 