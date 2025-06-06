'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Loader2, Database, ShoppingBag } from 'lucide-react'

interface ConnectionStatus {
  database: 'connected' | 'disconnected' | 'checking'
  shopify: 'connected' | 'disconnected' | 'checking' | 'not_configured'
}

export function ConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>({
    database: 'checking',
    shopify: 'checking'
  })

  useEffect(() => {
    checkConnections()
    const interval = setInterval(checkConnections, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const checkConnections = async () => {
    // Check database connection
    try {
      const dbResponse = await fetch('/api/health')
      if (dbResponse.ok) {
        setStatus(prev => ({ ...prev, database: 'connected' }))
      } else {
        setStatus(prev => ({ ...prev, database: 'disconnected' }))
      }
    } catch {
      setStatus(prev => ({ ...prev, database: 'disconnected' }))
    }

    // Check Shopify connection
    try {
      const shopifyResponse = await fetch('/api/settings/shopify/status')
      if (shopifyResponse.ok) {
        const data = await shopifyResponse.json()
        setStatus(prev => ({ 
          ...prev, 
          shopify: data.configured ? (data.connected ? 'connected' : 'disconnected') : 'not_configured'
        }))
      } else {
        setStatus(prev => ({ ...prev, shopify: 'disconnected' }))
      }
    } catch {
      setStatus(prev => ({ ...prev, shopify: 'disconnected' }))
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="h-3 w-3 text-green-500 dark:text-green-400" />
      case 'disconnected':
        return <XCircle className="h-3 w-3 text-red-500 dark:text-red-400" />
      case 'checking':
        return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      case 'not_configured':
        return <XCircle className="h-3 w-3 text-yellow-500 dark:text-yellow-400" />
      default:
        return null
    }
  }

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'connected':
        return 'default'
      case 'disconnected':
        return 'destructive'
      case 'not_configured':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <Badge variant={getStatusVariant(status.database)} className="flex items-center gap-1 px-2 py-0.5">
        <Database className="h-3 w-3" />
        {getStatusIcon(status.database)}
        <span>Database</span>
      </Badge>
      <Badge variant={getStatusVariant(status.shopify)} className="flex items-center gap-1 px-2 py-0.5">
        <ShoppingBag className="h-3 w-3" />
        {getStatusIcon(status.shopify)}
        <span>Shopify</span>
      </Badge>
    </div>
  )
}