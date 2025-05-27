'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Package, Users, ClipboardList, Settings, Database, ShoppingCart, BarChart3, GitBranch, Bot, Zap, FlaskConical, Wrench, Activity, QrCode, Shield, FileText, Layout } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface NavigationItem {
  name: string
  href: string
  icon: any
  isNew?: boolean
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Overview',
    href: '/manager/dashboard' as const,
    icon: Home,
  },
  {
    name: 'Dashboard V3',
    href: '/manager/dashboard-v3' as const,
    icon: Layout,
  },
  {
    name: 'Production Flow',
    href: '/manager/production-flow' as const,
    icon: GitBranch,
  },
  {
    name: 'Tasks',
    href: '/manager/tasks' as const,
    icon: ClipboardList,
  },
  {
    name: 'Orders',
    href: '/manager/orders' as const,
    icon: Package,
  },
  {
    name: 'Workers',
    href: '/manager/workers' as const,
    icon: Users,
  },
  {
    name: 'Components',
    href: '/manager/components' as const,
    icon: QrCode,
  },
  {
    name: 'Workflows',
    href: '/manager/workflows' as const,
    icon: Bot,
  },
  {
    name: 'Analytics',
    href: '/manager/analytics' as const,
    icon: BarChart3,
  },
  {
    name: 'Quality',
    href: '/manager/quality' as const,
    icon: Shield,
  },
  {
    name: 'QC Steps',
    href: '/manager/qc-steps' as const,
    icon: ClipboardList,
    isNew: true,
  },
  {
    name: 'Quality Holds',
    href: '/manager/quality-holds' as const,
    icon: Shield,
  },
  {
    name: 'Reports',
    href: '/manager/reports' as const,
    icon: FileText,
  },
  {
    name: 'Automation',
    href: '/manager/automation' as const,
    icon: Zap,
  },
  {
    name: 'Settings',
    href: '/manager/settings' as const,
    icon: Settings,
  },
  {
    name: 'Test Import',
    href: '/manager/test-import' as const,
    icon: FlaskConical,
  },
  {
    name: 'Fix Data',
    href: '/manager/fix-data' as const,
    icon: Wrench,
  },
  {
    name: 'Import Status',
    href: '/manager/import-status' as const,
    icon: Activity,
  },
  {
    name: 'Workflow Test',
    href: '/manager/workflow-test' as const,
    icon: FlaskConical,
  },
]

export function ManagerNavigationTabs() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/manager/dashboard') {
      return pathname === '/manager/dashboard' || pathname === '/manager'
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8 overflow-x-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center space-x-2 py-4 px-1 border-b-2 text-sm font-medium whitespace-nowrap transition-colors relative",
                  active
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.name}</span>
                {item.isNew && (
                  <Badge 
                    variant="secondary" 
                    className="ml-1 px-1.5 py-0.5 text-xs bg-green-100 text-green-800 border-green-200 font-semibold"
                  >
                    NEW
                  </Badge>
                )}
              </Link>
            )
          })}
          
          {/* Special action buttons */}
          <div className="ml-auto flex items-center space-x-2 py-4">
            <Button variant="outline" size="sm" className="flex items-center space-x-1">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Database</span>
            </Button>
            <Button variant="outline" size="sm" className="flex items-center space-x-1">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Shopify</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
} 