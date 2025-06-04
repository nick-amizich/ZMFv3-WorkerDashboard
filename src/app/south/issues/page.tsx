import { Metadata } from 'next'
import { IssuesManager } from './issues-manager'

export const metadata: Metadata = {
  title: 'Issues - ZMF South',
  description: 'Track and resolve machining issues reported by North office',
}

export default function IssuesPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Machining Issues</h1>
        <p className="text-muted-foreground mt-2">
          Track and resolve quality issues reported by the North office
        </p>
      </div>
      <IssuesManager />
    </div>
  )
}