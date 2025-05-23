'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { RefreshCw, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<any>(null)
  const { toast } = useToast()
  
  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders')
      if (!response.ok) throw new Error('Failed to fetch orders')
      const data = await response.json()
      setOrders(data)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load orders',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchOrders()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  
  const handleSync = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/shopify/sync', {
        method: 'POST'
      })
      
      if (!response.ok) throw new Error('Sync failed')
      
      const result = await response.json()
      
      setLastSyncResult(result)
      
      if (result.errors > 0) {
        toast({
          title: 'Sync completed with errors',
          description: `Synced ${result.ordersSynced || 0} orders, ${result.errors} errors`,
          variant: 'destructive'
        })
      } else {
        toast({
          title: 'Sync completed',
          description: `Successfully synced ${result.ordersSynced || 0} orders`
        })
      }
      
      // Refresh the orders list
      await fetchOrders()
    } catch (error) {
      toast({
        title: 'Sync failed',
        description: 'Could not sync with Shopify',
        variant: 'destructive'
      })
    } finally {
      setSyncing(false)
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Orders</h2>
        <Button 
          variant="outline"
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync with Shopify
            </>
          )}
        </Button>
      </div>
      
      {lastSyncResult && lastSyncResult.details && lastSyncResult.details.length > 0 && (
        <Alert className={lastSyncResult.errors > 0 ? "border-red-200" : "border-green-200"}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <details className="cursor-pointer">
              <summary className="font-medium">
                Last sync: {lastSyncResult.ordersSynced} orders processed
                {lastSyncResult.errors > 0 && ` (${lastSyncResult.errors} errors)`}
              </summary>
              <div className="mt-2 text-xs space-y-1 max-h-40 overflow-y-auto">
                {lastSyncResult.details.map((detail: string, i: number) => (
                  <div key={i} className="font-mono">{detail}</div>
                ))}
              </div>
            </details>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid gap-4">
        {orders?.map((order) => (
          <Card key={order.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">Order #{order.order_number}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {order.customer_name || 'Guest Customer'}
                  </p>
                </div>
                <Badge variant={order.status === 'pending' ? 'secondary' : 'default'}>
                  {order.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="font-medium">Total:</span> ${order.total_price}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {order.order_items?.[0]?.count || 0} items
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}