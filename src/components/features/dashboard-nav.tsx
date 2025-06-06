'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LocationSwitcher } from '@/components/features/location-switcher'
import { ConnectionStatus } from '@/components/features/connection-status'
import { ThemeToggle } from '@/components/ui/theme-toggle'

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Worker Dashboard', href: '/worker' },
  { name: 'Manager Dashboard', href: '/manager' },
] as const

export function DashboardNav() {
  const pathname = usePathname()
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'ZMF Dashboard'

  return (
    <nav className="bg-background shadow-sm border-b">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-foreground">{appName}</h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium',
                    pathname === item.href
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <LocationSwitcher />
            <ThemeToggle />
            <ConnectionStatus />
          </div>
        </div>
      </div>
    </nav>
  )
}