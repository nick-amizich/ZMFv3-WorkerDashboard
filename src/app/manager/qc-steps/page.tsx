import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { QCStepsManager } from './qc-steps-manager'

export default async function QCStepsPage() {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Check if user is a manager
  const { data: worker } = await supabase
    .from('workers')
    .select('id, role, is_active, name')
    .eq('auth_user_id', user.id)
    .single()

  if (!worker?.is_active || worker.role !== 'manager') {
    redirect('/unauthorized')
  }

  // Get current production steps from dedicated table
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
    <div className="container max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">QC Production Steps Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage the production steps available in the Quality Control Checklist system.
        </p>
      </div>
      
      <QCStepsManager initialSteps={productionSteps} />
    </div>
  )
} 