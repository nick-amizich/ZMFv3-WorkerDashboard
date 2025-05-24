'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { 
  Home, 
  Package, 
  Users, 
  Settings, 
  GitBranch, 
  Bot, 
  Shield,
  FileText,
  ChevronDown,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface NavItem {
  name: string
  href?: string
  icon: any
  children?: Array<{
    name: string
    href: string
    description?: string
  }>
}

const navigationItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/manager/dashboard',
    icon: Home,
  },
  {
    name: 'Production',
    icon: GitBranch,
    children: [
      {
        name: 'Production Flow',
        href: '/manager/production-flow',
        description: 'Visual production board with drag-and-drop'
      },
      {
        name: 'Task Management',
        href: '/manager/tasks',
        description: 'Assign and track worker tasks'
      },
      {
        name: 'Workflows',
        href: '/manager/workflows',
        description: 'Create and manage production workflows'
      }
    ]
  },
  {
    name: 'Orders',
    href: '/manager/orders',
    icon: Package,
  },
  {
    name: 'Quality',
    icon: Shield,
    children: [
      {
        name: 'Analytics',
        href: '/manager/analytics',
        description: 'Quality metrics and First Pass Yield'
      },
      {
        name: 'Component Tracking',
        href: '/manager/components',
        description: 'Track components with QR codes'
      },
      {
        name: 'Quality Holds',
        href: '/manager/quality-holds',
        description: 'Manage quarantined batches'
      },
      {
        name: 'Reports & Certificates',
        href: '/manager/reports',
        description: 'Generate quality reports and certificates'
      }
    ]
  },
  {
    name: 'Team',
    icon: Users,
    children: [
      {
        name: 'Workers',
        href: '/manager/workers',
        description: 'Manage worker profiles and skills'
      },
      {
        name: 'Performance',
        href: '/manager/analytics',
        description: 'Worker productivity metrics'
      }
    ]
  },
  {
    name: 'Automation',
    href: '/manager/automation',
    icon: Zap,
  },
  {
    name: 'Settings',
    href: '/manager/settings',
    icon: Settings,
  }
]

// Development tools - only shown in development mode
const devTools: NavItem[] = [
  {
    name: 'Dev Tools',
    icon: Bot,
    children: [
      {
        name: 'Debug',
        href: '/manager/debug',
        description: 'Debug panel'
      },
      {
        name: 'Test Import',
        href: '/manager/test-import',
        description: 'Test data import'
      },
      {
        name: 'Fix Data',
        href: '/manager/fix-data',
        description: 'Data repair tools'
      },
      {
        name: 'Import Status',
        href: '/manager/import-status',
        description: 'Monitor import jobs'
      }
    ]
  }
]

export function ManagerNavigationV2() {
  const pathname = usePathname()
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  
  // Show dev tools only in development
  const isDev = process.env.NODE_ENV === 'development'
  const allNavItems = isDev ? [...navigationItems, ...devTools] : navigationItems

  const isActive = (href: string) => {
    if (href === '/manager/dashboard') {
      return pathname === '/manager/dashboard' || pathname === '/manager'
    }
    return pathname.startsWith(href)
  }

  const isChildActive = (item: NavItem) => {
    if (!item.children) return false
    return item.children.some(child => isActive(child.href))
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link href="/manager" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">ZMF</span>
              </div>
              <span className="font-semibold text-gray-900 hidden sm:block">Manager Portal</span>
            </Link>
          </div>

          {/* Main Navigation */}
          <div className="flex items-center space-x-1">
            {allNavItems.map((item) => {
              const Icon = item.icon
              
              if (item.children) {
                const childActive = isChildActive(item)
                
                return (
                  <DropdownMenu 
                    key={item.name}
                    open={openDropdown === item.name}
                    onOpenChange={(open) => setOpenDropdown(open ? item.name : null)}
                  >
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "flex items-center space-x-1 px-3 py-2 text-sm font-medium",
                          childActive
                            ? "text-blue-600 bg-blue-50"
                            : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{item.name}</span>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64">
                      <DropdownMenuLabel>{item.name}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {item.children.map((child) => (
                        <DropdownMenuItem key={child.href} asChild>
                          <Link
                            href={child.href as any}
                            className={cn(
                              "w-full cursor-pointer",
                              isActive(child.href) && "bg-blue-50"
                            )}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{child.name}</span>
                              {child.description && (
                                <span className="text-xs text-gray-500">{child.description}</span>
                              )}
                            </div>
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )
              }
              
              // Single navigation items
              const active = item.href && isActive(item.href)
              
              return (
                <Link
                  key={item.name}
                  href={item.href! as any}
                  className={cn(
                    "flex items-center space-x-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    active
                      ? "text-blue-600 bg-blue-50"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/manager/reports">
                <FileText className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Quick Report</span>
              </Link>
            </Button>
            <Button variant="default" size="sm" asChild>
              <Link href="/manager/orders">
                <Package className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Import Orders</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}