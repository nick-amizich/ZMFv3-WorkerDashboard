import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SouthNavigation } from './south-navigation'

export default async function SouthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user has access to South location
  const { data: worker } = await supabase
    .from('workers')
    .select('role, is_active')
    .eq('auth_user_id', user.id)
    .single()

  if (!worker?.is_active) {
    redirect('/unauthorized')
  }

  // For now, only allow managers to access the South location
  // since primary_location field doesn't exist yet
  if (worker.role !== 'manager') {
    redirect('/unauthorized')
  }

  return (
    <div className="min-h-screen bg-background">
      <SouthNavigation />
      <main className="pb-10">
        {children}
      </main>
    </div>
  )
}