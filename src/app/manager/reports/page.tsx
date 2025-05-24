'use client'

import React from 'react'
import { QualityReportingSuite } from '@/components/manager/quality-reporting-suite'
import { useToast } from '@/hooks/use-toast'

export default function ReportsPage() {
  const { toast } = useToast()

  const handleGenerateReport = (report: any) => {
    toast({
      title: 'Report Generated',
      description: `${report.title} has been generated successfully`,
    })
  }

  const handleExportCertificate = (certificate: any) => {
    toast({
      title: 'Certificate Exported',
      description: `Quality certificate for ${certificate.product_info.name} has been exported`,
    })
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Quality Reports & Certificates</h1>
        <p className="text-gray-600">
          Generate comprehensive quality reports and export official certificates for your products
        </p>
      </div>

      <QualityReportingSuite 
        onGenerateReport={handleGenerateReport}
        onExportCertificate={handleExportCertificate}
      />
    </div>
  )
}