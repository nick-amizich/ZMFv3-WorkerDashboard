import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    const { data: worker } = await supabase
      .from('workers')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()
    
    if (worker) {
      if (['manager', 'supervisor'].includes(worker.role || '')) {
        redirect('/manager')
      } else {
        redirect('/worker')
      }
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center space-y-8 p-8">
        <h1 className="text-5xl font-bold text-gray-900">
          ZMF Worker Dashboard
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Production management system for efficient task tracking and worker coordination
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/register">Register</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}