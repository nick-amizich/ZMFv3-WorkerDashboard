/**
 * Read-only Shopify client for syncing order data
 * CRITICAL: This client must NEVER write to Shopify - READ-ONLY ONLY
 */

export interface ShopifyOrder {
  id: number
  order_number: string
  created_at: string
  financial_status: string
  fulfillment_status: string | null
  total_price: string
  customer: {
    id: number
    email: string
    first_name: string
    last_name: string
  }
  line_items: Array<{
    id: number
    product_id: number
    variant_id: number
    title: string
    quantity: number
    price: string
    sku: string
  }>
}

export class ShopifyClient {
  private baseUrl: string
  private accessToken: string

  constructor() {
    if (!process.env.SHOPIFY_STORE_URL || !process.env.SHOPIFY_ACCESS_TOKEN) {
      throw new Error('Shopify configuration missing: SHOPIFY_STORE_URL and SHOPIFY_ACCESS_TOKEN required')
    }
    
    this.baseUrl = `https://${process.env.SHOPIFY_STORE_URL}.myshopify.com/admin/api/2024-01`
    this.accessToken = process.env.SHOPIFY_ACCESS_TOKEN
  }

  private async makeRequest(endpoint: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Shopify API request failed:', error)
      throw error
    }
  }

  /**
   * Fetch orders from Shopify with pagination
   * READ-ONLY operation
   */
  async getOrders(limit = 50, since_id?: number): Promise<ShopifyOrder[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      status: 'any',
    })
    
    if (since_id) {
      params.append('since_id', since_id.toString())
    }

    const data = await this.makeRequest(`/orders.json?${params}`)
    return data.orders || []
  }

  /**
   * Get a specific order by ID
   * READ-ONLY operation
   */
  async getOrder(orderId: number): Promise<ShopifyOrder | null> {
    try {
      const data = await this.makeRequest(`/orders/${orderId}.json`)
      return data.order || null
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null
      }
      throw error
    }
  }

  /**
   * Get products from Shopify
   * READ-ONLY operation
   */
  async getProducts(limit = 50): Promise<any[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
    })

    const data = await this.makeRequest(`/products.json?${params}`)
    return data.products || []
  }
}