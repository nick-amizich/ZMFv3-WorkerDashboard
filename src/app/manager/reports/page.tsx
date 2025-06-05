import { redirect } from 'next/navigation'

export default function ReportsPage() {
  // Redirect to the combined analytics & reports page
  redirect('/manager/analytics')
}