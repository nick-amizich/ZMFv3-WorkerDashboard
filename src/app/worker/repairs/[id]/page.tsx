import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RepairWorkPage from '@/components/repairs/repair-work-page'

export default async function WorkerRepairPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: worker } = await supabase
    .from('workers')
    .select('id, name, role, is_active, approval_status')
    .eq('auth_user_id', user.id)
    .single()

  if (!worker?.is_active || worker.approval_status !== 'approved') {
    redirect('/unauthorized')
  }

  // Fetch the repair with all related data
  const { data: repair } = await supabase
    .from('repair_orders')
    .select(`
      *,
      repair_issues (
        id,
        category,
        specific_issue,
        severity
      ),
      repair_actions (
        id,
        action_type,
        action_description,
        time_spent_minutes,
        completed_at
      ),
      assigned_to:workers!repair_orders_assigned_to_fkey (
        id,
        name
      )
    `)
    .eq('id', params.id)
    .single()

  if (!repair) {
    notFound()
  }

  // Check if the repair is assigned to this worker or if they're a manager
  if (repair.assigned_to !== worker.id && worker.role !== 'manager') {
    redirect('/unauthorized')
  }

  // Get all technicians for the dropdown
  const { data: technicians } = await supabase
    .from('workers')
    .select('id, name')
    .eq('is_active', true)
    .eq('approval_status', 'approved')
    .order('name')

  return (
    <RepairWorkPage 
      repair={repair} 
      technicians={technicians || []}
      currentTechnician={{
        id: worker.id,
        name: worker.name
      }}
    />
  )
}