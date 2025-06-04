import { Metadata } from 'next'
import { PartsCatalogManager } from './parts-catalog-manager'

export const metadata: Metadata = {
  title: 'Parts Catalog - ZMF South',
  description: 'Manage CNC parts catalog for headphone manufacturing',
}

export default function PartsCatalogPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Parts Catalog</h1>
        <p className="text-muted-foreground mt-2">
          Manage manufacturable parts, specifications, and drawings
        </p>
      </div>
      <PartsCatalogManager />
    </div>
  )
}