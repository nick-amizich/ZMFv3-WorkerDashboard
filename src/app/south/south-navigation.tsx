'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { LocationSwitcher } from '@/components/features/location-switcher'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  FileSpreadsheet,
  ChevronDown,
  Layers,
  Boxes,
  Cog
} from 'lucide-react'

interface NavItem {
  name: string
  href?: string
  icon: any
  children?: Array<{
    name: string
    href: string
    icon: any
    description?: string
  }>
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/south', icon: Home },
  {
    name: 'Production',
    icon: Layers,
    children: [
      { 
        name: 'Parts Catalog', 
        href: '/south/parts-catalog', 
        icon: Package,
        description: 'Manage parts inventory and specifications'
      },
      { 
        name: 'Production Requests', 
        href: '/south/production-requests', 
        icon: ClipboardList,
        description: 'Handle incoming production orders'
      },
      { 
        name: 'Daily Production', 
        href: '/south/daily-production', 
        icon: Wrench,
        description: 'Track daily production output'
      },
      { 
        name: 'Scheduling', 
        href: '/south/scheduling', 
        icon: Calendar,
        description: 'Production scheduling and planning'
      }
    ]
  },
  {
    name: 'Inventory',
    icon: Boxes,
    children: [
      { 
        name: 'Wood Inventory', 
        href: '/south/wood-inventory', 
        icon: TreePine,
        description: 'Manage wood material stock'
      },
      { 
        name: 'Transfers', 
        href: '/south/transfers', 
        icon: Truck,
        description: 'Material/part transfers between locations'
      },
      { 
        name: 'Optimization', 
        href: '/south/optimization', 
        icon: Zap,
        description: 'Material and process optimization'
      }
    ]
  },
  {
    name: 'Equipment',
    icon: Cog,
    children: [
      { 
        name: 'Machine Settings', 
        href: '/south/machines', 
        icon: Settings,
        description: 'Configure machine parameters'
      },
      { 
        name: 'Utilization', 
        href: '/south/utilization', 
        icon: Activity,
        description: 'Machine utilization metrics'
      },
      { 
        name: 'Maintenance', 
        href: '/south/maintenance', 
        icon: Bell,
        description: 'Equipment maintenance alerts'
      }
    ]
  },
  {
    name: 'Analytics',
    icon: BarChart3,
    children: [
      { 
        name: 'Production Analytics', 
        href: '/south/analytics', 
        icon: BarChart3,
        description: 'Production analytics and reports'
      },
      { 
        name: 'Issues', 
        href: '/south/issues', 
        icon: AlertTriangle,
        description: 'Issue tracking and management'
      }
    ]
  },
  { name: 'Import Data', href: '/south/import', icon: FileSpreadsheet }
]

export function SouthNavigation() {
  const pathname = usePathname()
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  
  const isActive = (href: string) => {
    return pathname === href
  }

  const isChildActive = (item: NavItem) => {
    if (!item.children) return false
    return item.children.some(child => isActive(child.href))
  }

  return (
    <nav className="bg-background shadow-sm border-b">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-foreground">
                ZMF South - Machine Shop
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <LocationSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </div>
      
      {/* Secondary navigation */}
      <div className="bg-muted/50 border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-1 py-2">
            {navigation.map((item) => {
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
                          "flex items-center gap-2 px-3 py-2 text-sm font-medium",
                          childActive
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.name}</span>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-72">
                      <DropdownMenuLabel>{item.name}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {item.children.map((child) => {
                        const ChildIcon = child.icon
                        return (
                          <DropdownMenuItem key={child.href} asChild>
                            <Link
                              href={child.href}
                              className={cn(
                                "w-full cursor-pointer",
                                isActive(child.href) && "bg-primary/10"
                              )}
                            >
                              <div className="flex items-start gap-3 py-1">
                                <ChildIcon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                <div className="flex flex-col">
                                  <span className="font-medium">{child.name}</span>
                                  {child.description && (
                                    <span className="text-xs text-muted-foreground">{child.description}</span>
                                  )}
                                </div>
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
                <Button
                  key={item.name}
                  variant="ghost"
                  asChild
                  className={cn(
                    "px-3 py-2",
                    active && "text-primary bg-primary/10"
                  )}
                >
                  <Link
                    href={item.href!}
                    className="flex items-center gap-2 text-sm font-medium"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                </Button>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}