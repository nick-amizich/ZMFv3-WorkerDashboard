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
  Zap,
  Layout,
  ClipboardList,
  Factory,
  Bug
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ui/theme-toggle'

interface NavItem {
  name: string
  href?: string
  icon: any
  children?: Array<{
    name: string
    href: string
    description?: string
    isNew?: boolean
  }>
}

const navigationItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/manager/dashboard-v3',
    icon: Home,
  },
  {
    name: 'Production & Orders',
    icon: GitBranch,
    children: [
      {
        name: 'Production Flow',
        href: '/manager/production-flow',
        description: 'Visual production board with drag-and-drop'
      },
      {
        name: 'Orders & Assignments',
        href: '/manager/orders',
        description: 'Import orders and manage production assignments'
      },
      {
        name: 'Task Management',
        href: '/manager/tasks',
        description: 'Assign headphone build tasks and track production'
      }
    ]
  },
  {
    name: 'Quality Control',
    icon: Shield,
    children: [
      {
        name: 'QC Dashboard',
        href: '/manager/quality',
        description: 'Main quality dashboard with checkpoint templates'
      },
      {
        name: 'Analytics & Reports',
        href: '/manager/analytics',
        description: 'Quality metrics, FPY, and generate certificates'
      },
      {
        name: 'QC Steps & Submissions',
        href: '/manager/qc-steps',
        description: 'Manage QC steps and review submissions',
        isNew: true
      },
      {
        name: 'Quality Holds',
        href: '/manager/quality-holds',
        description: 'Manage quality hold batches'
      }
    ]
  },
  {
    name: 'Team & Resources',
    icon: Users,
    children: [
      {
        name: 'Workers',
        href: '/manager/workers',
        description: 'Manage worker profiles, approvals, and permissions'
      },
      {
        name: 'Machine Shop',
        href: '/south',
        description: 'Machine shop operations and management'
      },
      {
        name: 'Automation Rules',
        href: '/manager/automation',
        description: 'Configure automation rules and workflows'
      }
    ]
  },
  {
    name: 'Admin',
    icon: Settings,
    children: [
      {
        name: 'Settings',
        href: '/manager/settings',
        description: 'System configuration and preferences'
      },
      {
        name: 'Headphone Models',
        href: '/manager/settings/headphone-models',
        description: 'Manage headphone models for order categorization'
      },
      {
        name: 'Workflows',
        href: '/manager/workflows',
        description: 'Advanced: Create and manage production workflows'
      }
    ]
  }
]

// Development tools - only shown in development mode
const devTools: NavItem[] = []

export function ManagerNavigationV2() {
  const pathname = usePathname()
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  
  // Show dev tools only in development
  const isDev = process.env.NODE_ENV === 'development'
  
  // Add dev tools to Admin section in development mode
  const allNavItems = isDev ? navigationItems.map(item => {
    if (item.name === 'Admin' && item.children) {
      return {
        ...item,
        children: [
          ...item.children,
          // Add separator
          {
            name: '---',
            href: '',
            description: 'Developer Tools'
          },
          {
            name: 'Debug & Logs',
            href: '/manager/debug',
            description: 'Debug panel and system logs'
          },
          {
            name: 'Data Management',
            href: '/manager/fix-data',
            description: 'Data repair and import tools'
          },
          {
            name: 'Testing Dashboard',
            href: '/manager/testing-dashboard',
            description: 'Visual testing & bug tracking dashboard',
            isNew: true
          },
          {
            name: 'Testing Tools',
            href: '/manager/page-test',
            description: 'Page and workflow testing'
          }
        ]
      }
    }
    return item
  }) : navigationItems

  const isActive = (href: string) => {
    if (href === '/manager/dashboard-v3') {
      return pathname === '/manager/dashboard-v3' || pathname === '/manager/dashboard' || pathname === '/manager'
    }
    return pathname.startsWith(href)
  }

  const isChildActive = (item: NavItem) => {
    if (!item.children) return false
    return item.children.some(child => child.href && isActive(child.href))
  }

  return (
    <nav className="bg-background border-b border-border sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link href="/manager" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">ZMF</span>
              </div>
              <span className="font-semibold text-foreground hidden sm:block">Manager Portal</span>
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
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
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
                      {item.children.map((child, index) => {
                        // Handle separator
                        if (child.name === '---') {
                          return (
                            <div key={`sep-${index}`}>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-xs text-muted-foreground">
                                {child.description}
                              </DropdownMenuLabel>
                            </div>
                          )
                        }
                        
                        return (
                          <DropdownMenuItem key={child.href} asChild>
                            <Link
                              href={child.href as any}
                              className={cn(
                                "w-full cursor-pointer",
                                isActive(child.href) && "bg-primary/10"
                              )}
                            >
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{child.name}</span>
                                  {child.isNew && (
                                    <Badge 
                                      variant="secondary" 
                                      className="px-1.5 py-0.5 text-xs bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-semibold"
                                    >
                                      NEW
                                    </Badge>
                                  )}
                                </div>
                                {child.description && (
                                  <span className="text-xs text-muted-foreground">{child.description}</span>
                                )}
                              </div>
                            </Link>
                          </DropdownMenuItem>
                        )
                      })}
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
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
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
            <ThemeToggle />
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