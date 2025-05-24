import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProductionFlowPageClient } from './production-flow-client'

export default async function ManagerProductionFlowPage() {
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

  // Get active workflows for batch creation
  const { data: workflows } = await supabase
    .from('workflow_templates')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  return <ProductionFlowPageClient workflows={workflows || []} />
} 