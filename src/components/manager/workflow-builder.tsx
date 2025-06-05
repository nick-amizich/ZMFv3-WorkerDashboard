'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface WorkflowBuilderProps {
  initialWorkflow?: any
  onSave: (workflow: any) => void
  onPreview?: (workflow: any) => void
}

export function WorkflowBuilder({ initialWorkflow, onSave, onPreview }: WorkflowBuilderProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Workflow Builder</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">Workflow builder functionality is currently being updated.</p>
        <Button onClick={() => onSave({ name: 'New Workflow', stages: [] })}>
          Save Workflow
        </Button>
      </CardContent>
    </Card>
  )
}