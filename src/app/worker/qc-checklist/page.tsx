import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { QCChecklistClient } from './qc-checklist-client'

// Force dynamic rendering to always fetch fresh data
export const dynamic = 'force-dynamic'

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

  // Get production steps from the dedicated table
  const { data: steps, error } = await supabase
    .from('qc_production_steps' as any)
    .select('value, label, sort_order')
    .eq('is_active', true)
    .order('sort_order')

  // Default production steps if none are found or error occurs
  const defaultSteps = [
    { value: 'inventory_intake', label: '1. Inventory Intake' },
    { value: 'sanding_pre_work', label: '2. Sanding - Pre-Work' },
    { value: 'sanding_post_work', label: '2. Sanding - Post-Work' },
    { value: 'finishing_pre_work', label: '3. Finishing - Pre-Work' },
    { value: 'finishing_post_work', label: '3. Finishing - Post-Work' },
    { value: 'sub_assembly_chassis_pre_work', label: '4. Sub-assembly: Chassis - Pre-Work' },
    { value: 'sub_assembly_chassis_post_work', label: '4. Sub-assembly: Chassis - Post-Work' },
    { value: 'sub_assembly_baffle_pre_work', label: '5. Sub-assembly: Baffle - Pre-Work' },
    { value: 'sub_assembly_baffle_post_work', label: '5. Sub-assembly: Baffle - Post-Work' },
    { value: 'final_production', label: '6. Final Production' },
    { value: 'final_assembly', label: '6.5 Final Assembly' },
    { value: 'acoustic_aesthetic_qc', label: '7. Acoustic and Aesthetic QC' },
    { value: 'shipping', label: '8. Shipping' }
  ]

  const productionSteps = (!error && steps && steps.length > 0) ? steps as any : defaultSteps

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
        productionSteps={productionSteps}
      />
    </Suspense>
  )
}