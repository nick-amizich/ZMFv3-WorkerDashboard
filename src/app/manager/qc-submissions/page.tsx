import { redirect } from 'next/navigation'

export default async function QCSubmissionsPage() {
  // Redirect to the combined QC steps page
  redirect('/manager/qc-steps')
}