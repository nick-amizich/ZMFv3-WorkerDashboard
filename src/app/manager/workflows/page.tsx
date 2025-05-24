import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ManagerWorkflowsClient } from './workflows-client'

export default async function ManagerWorkflowsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is a manager
  const { data: worker } = await supabase
    .from('workers')
    .select('role, is_active')
    .eq('auth_user_id', user.id)
    .single()

  if (!worker?.is_active || !['manager', 'supervisor'].includes(worker.role || '')) {
    redirect('/unauthorized')
  }

  // Get existing workflows
  const { data: workflows } = await supabase
    .from('workflow_templates')
    .select(`
      *,
      created_by:workers!workflow_templates_created_by_id_fkey(
        id,
        name
      )
    `)
    .order('created_at', { ascending: false })

  return <ManagerWorkflowsClient initialWorkflows={workflows || []} />
} 