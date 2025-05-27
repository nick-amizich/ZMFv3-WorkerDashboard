'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, ClipboardList, Shield, Award, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/worker/dashboard' as const,
    icon: Home,
  },
  {
    name: 'My Tasks',
    href: '/worker' as const,
    icon: ClipboardList,
  },
  {
    name: 'Quality',
    href: '/worker/quality' as const,
    icon: Shield,
  },
  {
    name: 'Time Tracking',
    href: '/worker/time' as const,
    icon: Clock,
  },
  {
    name: 'Achievements',
    href: '/worker/achievements' as const,
    icon: Award,
  },
]

export function WorkerNavigation() {
  const pathname = usePathname()

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8">
          {navigationItems.map((item) => {
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
      </div>
    </nav>
  )
}