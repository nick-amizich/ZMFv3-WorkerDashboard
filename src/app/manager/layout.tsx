import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Home, Package, Users, ClipboardList, Eye, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConnectionStatus } from '@/components/features/connection-status'

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-semibold">Manager Dashboard</h1>
              <nav className="hidden md:flex space-x-6">
                <Link 
                  href="/manager/dashboard" 
                  className="text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  Overview
                </Link>
                <Link 
                  href="/manager/tasks" 
                  className="text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-2"
                >
                  <ClipboardList className="h-4 w-4" />
                  Tasks
                </Link>
                <Link 
                  href="/manager/orders" 
                  className="text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-2"
                >
                  <Package className="h-4 w-4" />
                  Orders
                </Link>
                <Link 
                  href="/manager/workers" 
                  className="text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Workers
                </Link>
                <Link 
                  href="/manager/settings" 
                  className="text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <ConnectionStatus />
              <Button 
                variant="outline" 
                size="sm"
                asChild
              >
                <Link href="/worker" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  View as Worker
                </Link>
              </Button>
              <span className="text-sm text-gray-500">
                {worker.name} ({worker.role})
              </span>
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="text-sm text-gray-700 hover:text-gray-900"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}