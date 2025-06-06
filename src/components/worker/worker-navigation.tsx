'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, ClipboardList, Shield, Award, Clock, CheckSquare, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/worker/dashboard',
    icon: Home,
  },
  {
    name: 'My Tasks',
    href: '/worker/tasks',
    icon: ClipboardList,
  },
  {
    name: 'Quality',
    href: '/worker/quality',
    icon: Shield,
  },
  {
    name: 'QC Checklist',
    href: '/worker/qc-checklist',
    icon: CheckSquare,
  },
  {
    name: 'Time Tracking',
    href: '/worker/time',
    icon: Clock,
  },
  {
    name: 'Achievements',
    href: '/worker/achievements',
    icon: Award,
  },
]

export function WorkerNavigation() {
  const pathname = usePathname()
  const [showAllNavigation, setShowAllNavigation] = useState(false)

  // Filter navigation items - show only QC Checklist by default
  const visibleItems = showAllNavigation 
    ? navigationItems 
    : navigationItems.filter(item => item.href === '/worker/qc-checklist')

  return (
    <nav className="bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Navigation Items */}
          <div className="flex space-x-8">
            {visibleItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-2 py-4 px-1 border-b-2 text-sm font-medium transition-colors",
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>
          
          {/* Right side actions */}
          <div className="py-4 flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllNavigation(!showAllNavigation)}
              className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
            >
              {showAllNavigation ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  <span className="text-sm">Hide Navigation</span>
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  <span className="text-sm">Show All</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}