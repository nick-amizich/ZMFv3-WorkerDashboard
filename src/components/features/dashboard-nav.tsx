'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LocationSwitcher } from '@/components/features/location-switcher'
import { ConnectionStatus } from '@/components/features/connection-status'

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Worker Dashboard', href: '/worker' },
  { name: 'Manager Dashboard', href: '/manager' },
] as const

export function DashboardNav() {
  const pathname = usePathname()
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'ZMF Dashboard'

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-gray-900">{appName}</h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium',
                    pathname === item.href
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <LocationSwitcher />
            <ConnectionStatus />
          </div>
        </div>
      </div>
    </nav>
  )
}