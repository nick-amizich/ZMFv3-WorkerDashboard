'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { 
  Home, 
  Package, 
  Users, 
  ClipboardList, 
  Settings, 
  ShoppingCart, 
  BarChart3, 
  GitBranch, 
  Bot, 
  Zap,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'

const allPages = [
  {
    name: 'Dashboard',
    href: '/manager/dashboard',
    icon: Home,
    description: 'Overview of production metrics',
    status: 'working'
  },
  {
    name: 'Production Flow',
    href: '/manager/production-flow',
    icon: GitBranch,
    description: 'Visual Kanban board for production stages',
    status: 'new'
  },
  {
    name: 'Tasks',
    href: '/manager/tasks',
    icon: ClipboardList,
    description: 'Task assignment board (needs orders imported first)',
    status: 'empty'
  },
  {
    name: 'Orders',
    href: '/manager/orders',
    icon: Package,
    description: 'List of all orders',
    status: 'working'
  },
  {
    name: 'Import Orders',
    href: '/manager/orders/import',
    icon: ShoppingCart,
    description: 'Import orders from Shopify',
    status: 'needs-fix'
  },
  {
    name: 'Workers',
    href: '/manager/workers',
    icon: Users,
    description: 'Worker management',
    status: 'working'
  },
  {
    name: 'Workflows',
    href: '/manager/workflows',
    icon: Bot,
    description: 'Visual workflow builder',
    status: 'new'
  },
  {
    name: 'Analytics',
    href: '/manager/analytics',
    icon: BarChart3,
    description: 'Production analytics dashboard',
    status: 'new'
  },
  {
    name: 'Automation',
    href: '/manager/automation',
    icon: Zap,
    description: 'Automation rules management',
    status: 'new'
  },
  {
    name: 'Settings',
    href: '/manager/settings',
    icon: Settings,
    description: 'System settings',
    status: 'working'
  }
]

export default function PageTestPage() {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'working':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Working</Badge>
      case 'new':
        return <Badge className="bg-blue-500"><AlertCircle className="h-3 w-3 mr-1" />New Feature</Badge>
      case 'empty':
        return <Badge className="bg-yellow-500"><AlertCircle className="h-3 w-3 mr-1" />Needs Data</Badge>
      case 'needs-fix':
        return <Badge className="bg-orange-500"><XCircle className="h-3 w-3 mr-1" />Needs Fix</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">All Available Pages</h2>
        <p className="text-muted-foreground">
          Click on any page to test it. This shows all pages in the system.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {allPages.map((page) => {
          const Icon = page.icon
          return (
            <Card key={page.href}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Icon className="h-5 w-5" />
                    {page.name}
                  </CardTitle>
                  {getStatusBadge(page.status)}
                </div>
                <CardDescription>{page.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={page.href}>
                  <Button className="w-full">
                    Visit Page
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Start Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">To see tasks:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Go to &quot;Import Orders&quot; page</li>
              <li>Click &quot;Refresh&quot; to load Shopify orders</li>
              <li>Select specific items from orders (use checkboxes)</li>
              <li>Click &quot;Import Selected&quot;</li>
              <li>Go to &quot;Tasks&quot; page - you should see the created tasks</li>
            </ol>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">New Features:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><strong>Production Flow</strong> - Visual production pipeline</li>
              <li><strong>Workflows</strong> - Build custom workflows</li>
              <li><strong>Analytics</strong> - Real-time production metrics</li>
              <li><strong>Automation</strong> - Create automation rules</li>
            </ul>
          </div>

          <div className="space-y-2">
            <p>&quot;Standard Headphone&quot;</p>
            <p>&quot;Cable&quot;</p>
            <p>&quot;Custom&quot;</p>
            <p>&quot;Special Edition&quot;</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}