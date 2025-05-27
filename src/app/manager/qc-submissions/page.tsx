import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { QCSubmissionsClient } from './qc-submissions-client'

export default async function QCSubmissionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get manager data
  const { data: manager } = await supabase
    .from('workers')
    .select('id, name, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!manager || manager.role !== 'manager') {
    redirect('/unauthorized')
  }

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <QCSubmissionsClient />
    </Suspense>
  )
}