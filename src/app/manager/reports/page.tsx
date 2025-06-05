'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ReportsPage() {

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Quality Reports & Certificates</h1>
        <p className="text-gray-600">
          Generate comprehensive quality reports and export official certificates for your products
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reports Feature</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Quality reporting functionality is currently being updated.</p>
        </CardContent>
      </Card>
    </div>
  )
}