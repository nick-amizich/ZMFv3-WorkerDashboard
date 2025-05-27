import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { WorkerRoleManager } from './worker-role-manager'

export default async function WorkerManagementPage() {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Check if user is a manager
  const { data: currentWorker } = await supabase
    .from('workers')
    .select('id, role, is_active, name')
    .eq('auth_user_id', user.id)
    .single()

  if (!currentWorker?.is_active || currentWorker.role !== 'manager') {
    redirect('/unauthorized')
  }

  // Get all workers with their auth info
  const { data: workers } = await supabase
    .from('workers')
    .select(`
      id,
      name,
      email,
      role,
      is_active,
      auth_user_id,
      created_at,
      updated_at
    `)
    .order('name')

  return (
    <div className="container max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Worker Role Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage worker roles, permissions, and account status. Promote workers to supervisors or managers as needed.
        </p>
      </div>
      
      <WorkerRoleManager 
        workers={workers || []} 
        currentManagerId={currentWorker.id}
      />
    </div>
  )
}