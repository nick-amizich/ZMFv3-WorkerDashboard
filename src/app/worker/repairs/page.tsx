import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RepairDashboard from '@/components/repairs/repair-dashboard'
import type { RepairOrder } from '@/types/repairs'

export default async function WorkerRepairsPage() {
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

  // Fetch all repairs with related data (not just assigned to this worker)
  const { data: repairs, error } = await supabase
    .from('repair_orders')
    .select(`
      *,
      assigned_to:workers!repair_orders_assigned_to_fkey(id, name),
      created_by:workers!repair_orders_created_by_fkey(id, name),
      issues:repair_issues(
        id,
        category,
        specific_issue,
        severity
      ),
      actions:repair_actions(
        id,
        action_type,
        action_description,
        time_spent_minutes,
        completed_at
      ),
      time_logs:repair_time_logs(
        id,
        duration_minutes
      )
    `)
    .order('created_at', { ascending: false })

  // Fetch all active workers for assignment
  const { data: workers } = await supabase
    .from('workers')
    .select('id, name')
    .eq('is_active', true)
    .eq('approval_status', 'approved')
    .order('name')

  if (error) {
    console.error('Error fetching repairs:', error)
    return (
      <div className="p-6">
        <div className="text-red-600">Error loading repairs. Please try again.</div>
      </div>
    )
  }

  // Calculate total time spent for each repair
  const repairsWithTime: RepairOrder[] = (repairs || []).map(repair => ({
    ...repair,
    totalTimeSpent: repair.time_logs?.reduce((sum: number, log: any) => 
      sum + (log.duration_minutes || 0), 0) || 0
  }))

  return (
    <div className="p-6">
      <RepairDashboard 
        initialRepairs={repairsWithTime} 
        workers={workers || []} 
        currentWorkerId={worker.id}
      />
    </div>
  )
}