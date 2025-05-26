import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LogViewerClient } from './log-viewer-client'

export default async function LogsPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/login')
  }
  
  // ALWAYS validate worker status
  const { data: worker } = await supabase
    .from('workers')
    .select('id, name, role, is_active')
    .eq('auth_user_id', user.id)
    .single()
    
  if (!worker?.is_active || !['manager', 'supervisor'].includes(worker.role || '')) {
    redirect('/unauthorized')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">System Logs</h1>
        <p className="text-gray-600 mt-2">
          Monitor application logs, errors, and performance metrics for debugging and system health.
        </p>
      </div>
      
      <LogViewerClient />
    </div>
  )
} 