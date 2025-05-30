import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RepairIntakeForm from '@/components/repairs/repair-intake-form'

export default async function NewRepairPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }
  
  const { data: worker } = await supabase
    .from('workers')
    .select('id, role, is_active, approval_status')
    .eq('auth_user_id', user.id)
    .single()
  
  if (!worker?.is_active || worker.approval_status !== 'approved') {
    redirect('/unauthorized')
  }
  
  return (
    <div className="p-6">
      <RepairIntakeForm />
    </div>
  )
}