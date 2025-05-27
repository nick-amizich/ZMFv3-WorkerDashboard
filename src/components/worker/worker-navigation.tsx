'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, ClipboardList, Shield, Award, Clock, CheckSquare, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

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
    <nav className="bg-white border-b border-gray-200">
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
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>
          
          {/* Toggle Button */}
          <div className="py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllNavigation(!showAllNavigation)}
              className="flex items-center space-x-2 text-gray-500 hover:text-gray-700"
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