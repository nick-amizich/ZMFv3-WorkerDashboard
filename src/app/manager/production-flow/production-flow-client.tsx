'use client'

import { useState } from 'react'
import { EnhancedProductionFlowBoard } from '@/components/manager/enhanced-production-flow-board'
import { QuickBatchCreator } from '@/components/manager/quick-batch-creator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
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
        
        <Dialog open={showBatchCreator} onOpenChange={setShowBatchCreator}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Test Batch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Test Batch</DialogTitle>
            </DialogHeader>
            <QuickBatchCreator 
              workflows={workflows} 
              onBatchCreated={handleBatchCreated}
            />
          </DialogContent>
        </Dialog>
      </div>

      <EnhancedProductionFlowBoard key={refreshKey} />
    </div>
  )
} 