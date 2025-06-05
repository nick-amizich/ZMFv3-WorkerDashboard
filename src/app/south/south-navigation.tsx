'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LocationSwitcher } from '@/components/features/location-switcher'
import { 
  Package, 
  Settings, 
  ClipboardList, 
  Wrench, 
  TreePine,
  AlertTriangle,
  BarChart3,
  Home,
  Truck,
  Zap,
  Activity,
  Bell,
  Calendar,
  DollarSign,
  FileSpreadsheet
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/south', icon: Home },
  { name: 'Parts Catalog', href: '/south/parts-catalog', icon: Package },
  { name: 'Production Requests', href: '/south/production-requests', icon: ClipboardList },
  { name: 'Daily Production', href: '/south/daily-production', icon: Wrench },
  { name: 'Wood Inventory', href: '/south/wood-inventory', icon: TreePine },
  { name: 'Machine Settings', href: '/south/machines', icon: Settings },
  { name: 'Scheduling', href: '/south/scheduling', icon: Calendar },
  { name: 'Utilization', href: '/south/utilization', icon: Activity },
  { name: 'Maintenance', href: '/south/maintenance', icon: Bell },
  { name: 'Optimization', href: '/south/optimization', icon: Zap },
  { name: 'Transfers', href: '/south/transfers', icon: Truck },
  { name: 'Cost Tracking', href: '/south/cost-tracking', icon: DollarSign },
  { name: 'Issues', href: '/south/issues', icon: AlertTriangle },
  { name: 'Analytics', href: '/south/analytics', icon: BarChart3 },
  { name: 'Import Data', href: '/south/import', icon: FileSpreadsheet },
]

export function SouthNavigation() {
  const pathname = usePathname()

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                ZMF South - Machine Shop
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <LocationSwitcher />
          </div>
        </div>
      </div>
      
      {/* Secondary navigation */}
      <div className="bg-gray-50 border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-1 py-3 border-b-2 text-sm font-medium whitespace-nowrap',
                    pathname === item.href
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}