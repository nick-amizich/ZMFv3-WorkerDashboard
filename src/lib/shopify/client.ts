/**
 * Read-only Shopify client for syncing order data
 * CRITICAL: This client must NEVER write to Shopify - READ-ONLY ONLY
 */

export interface ShopifyLineItem {
  id: number
  product_id: number
  variant_id: number
  title: string
  name: string
  variant_title?: string
  quantity: number
  price: string
  sku: string
  vendor?: string
  taxable?: boolean
  gift_card?: boolean
  fulfillment_status?: string | null
  fulfillment_service?: string
  requires_shipping?: boolean
  properties?: Array<{
    name: string
    value: string
  }>
  tax_lines?: Array<{
    title: string
    price: string
    rate: number
  }>
  duties?: any[]
  discount_allocations?: any[]
  total_discount?: string
  current_quantity?: number
  fulfillable_quantity?: number
  variant_inventory_management?: string
  product_exists?: boolean
  admin_graphql_api_id?: string
  price_set?: {
    shop_money: {
      amount: string
      currency_code: string
    }
    presentment_money: {
      amount: string
      currency_code: string
    }
  }
  total_discount_set?: {
    shop_money: {
      amount: string
      currency_code: string
    }
    presentment_money: {
      amount: string
      currency_code: string
    }
  }
}

export interface ShopifyCustomer {
  id: number
  email: string
  first_name: string
  last_name: string
  phone?: string | null
  verified_email?: boolean
  tax_exempt?: boolean
  currency?: string
  created_at?: string
  updated_at?: string
  state?: string
  tags?: string
  note?: string | null
  default_address?: {
    id: number
    customer_id: number
    first_name: string
    last_name: string
    company?: string | null
    address1: string
    address2?: string | null
    city: string
    province: string
    country: string
    zip: string
    phone?: string | null
    name: string
    province_code: string
    country_code: string
    country_name: string
    default: boolean
  }
}

export interface ShopifyOrder {
  id: number
  order_number: string
  name: string
  created_at: string
  updated_at: string
  financial_status: string
  fulfillment_status: string | null
  total_price: string
  subtotal_price: string
  total_tax: string
  currency: string
  confirmed?: boolean
  closed_at?: string | null
  cancelled_at?: string | null
  cancel_reason?: string | null
  email?: string
  phone?: string | null
  customer?: ShopifyCustomer | null
  tags?: string
  note?: string | null
  po_number?: string | null
  reference?: string
  source_name?: string
  line_items: ShopifyLineItem[]
  shipping_lines?: Array<{
    id: number
    title: string
    price: string
    code: string
    source: string
    carrier_identifier?: string
  }>
  tax_lines?: Array<{
    title: string
    price: string
    rate: number
  }>
  billing_address?: {
    first_name: string
    last_name: string
    company?: string | null
    address1: string
    address2?: string | null
    city: string
    province: string
    country: string
    zip: string
    phone?: string | null
    name: string
    province_code: string
    country_code: string
  }
  shipping_address?: {
    first_name: string
    last_name: string
    company?: string | null
    address1: string
    address2?: string | null
    city: string
    province: string
    country: string
    zip: string
    phone?: string | null
    name: string
    province_code: string
    country_code: string
  }
}

export interface ShopifyConfig {
  store_domain: string
  api_access_token: string
  api_version?: string
}

export class ShopifyClient {
  private baseUrl: string
  private accessToken: string

  constructor(config: ShopifyConfig) {
    if (!config.store_domain || !config.api_access_token) {
      throw new Error('Shopify configuration missing: store_domain and api_access_token required')
    }
    
    const apiVersion = config.api_version || '2024-01'
    this.baseUrl = `https://${config.store_domain}/admin/api/${apiVersion}`
    this.accessToken = config.api_access_token
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

/**
 * Create a Shopify client from stored configuration
 */
export async function createShopifyClient(): Promise<ShopifyClient | null> {
  try {
    // Import here to avoid circular dependency
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    
    const { data: settings, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'shopify_config')
      .single()
    
    if (error || !settings?.value) {
      if (error?.code === '42P01') {
        console.error('Settings table not found. Please run the database migration.')
      } else {
        console.error('No Shopify configuration found')
      }
      return null
    }
    
    const config = settings.value as unknown as ShopifyConfig
    return new ShopifyClient(config)
  } catch (error) {
    console.error('Failed to create Shopify client:', error)
    return null
  }
}