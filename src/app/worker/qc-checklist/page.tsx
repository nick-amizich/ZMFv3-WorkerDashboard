import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { QCChecklistClient } from './qc-checklist-client'

export default async function QCChecklistPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get worker data
  const { data: worker } = await supabase
    .from('workers')
    .select('id, name, role, is_active')
    .eq('auth_user_id', user.id)
    .single()

  if (!worker || !worker.is_active) {
    redirect('/unauthorized')
  }

  // Get all workers for the dropdown
  const { data: allWorkers } = await supabase
    .from('workers')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <QCChecklistClient 
        currentWorker={{
          ...worker,
          role: worker.role || 'worker',
          is_active: worker.is_active || false
        }}
        allWorkers={allWorkers || []}
      />
    </Suspense>
  )
}