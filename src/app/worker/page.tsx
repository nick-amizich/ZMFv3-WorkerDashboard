import { redirect } from 'next/navigation'

export default function WorkerRootPage() {
  // Redirect to QC checklist as the default worker page
  redirect('/worker/qc-checklist')
}