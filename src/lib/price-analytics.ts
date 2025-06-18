import { supabase } from '@/lib/supabase'

export interface PriceStatistics {
  minPrice: number
  maxPrice: number
  avgPrice: number
  currentPrice: number
  priceChange: number
  priceChangePercent: number
  volatility: number
  trend: 'up' | 'down' | 'stable'
  priceCount: number
}

export interface SupermarketPriceStats {
  supermarketId: string
  supermarketName: string
  avgPrice: number
  minPrice: number
  maxPrice: number
  priceCount: number
  lastUpdate: string
  trend: 'up' | 'down' | 'stable'
  trendPercent: number
}

export interface PriceAlert {
  id: string
  userId: string
  productId: string
  supermarketId: string | null
  alertType: 'price_drop' | 'target_reached' | 'significant_change'
  oldPrice: number | null
  newPrice: number
  targetPrice: number | null
  percentageChange: number | null
  isSent: boolean
  sentAt: string | null
  createdAt: string
}

/**
 * Calculate comprehensive price statistics for a product
 */
export async function calculatePriceStatistics(
  productId: string,
  supermarketId?: string,
  days: number = 30
): Promise<PriceStatistics> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  let query = supabase
    .from('prices')
    .select('price_bgn, created_at')
    .eq('product_id', productId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true })

  if (supermarketId) {
    query = query.eq('supermarket_id', supermarketId)
  }

  const { data: prices, error } = await query

  if (error || !prices || prices.length === 0) {
    return {
      minPrice: 0,
      maxPrice: 0,
      avgPrice: 0,
      currentPrice: 0,
      priceChange: 0,
      priceChangePercent: 0,
      volatility: 0,
      trend: 'stable',
      priceCount: 0
    }
  }

  const priceValues = prices.map(p => p.price_bgn)
  const minPrice = Math.min(...priceValues)
  const maxPrice = Math.max(...priceValues)
  const avgPrice = priceValues.reduce((sum, price) => sum + price, 0) / priceValues.length
  const currentPrice = priceValues[priceValues.length - 1]
  const previousPrice = priceValues.length > 1 ? priceValues[priceValues.length - 2] : currentPrice

  const priceChange = currentPrice - previousPrice
  const priceChangePercent = previousPrice > 0 ? ((priceChange / previousPrice) * 100) : 0

  // Calculate volatility (coefficient of variation)
  const variance = priceValues.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / priceValues.length
  const standardDeviation = Math.sqrt(variance)
  const volatility = avgPrice > 0 ? standardDeviation / avgPrice : 0

  const trend = priceChange > 0 ? 'up' : priceChange < 0 ? 'down' : 'stable'

  return {
    minPrice,
    maxPrice,
    avgPrice,
    currentPrice,
    priceChange,
    priceChangePercent,
    volatility,
    trend,
    priceCount: prices.length
  }
}

/**
 * Get price statistics by supermarket for a product
 */
export async function getSupermarketPriceStats(productId: string): Promise<SupermarketPriceStats[]> {
  const { data: prices, error } = await supabase
    .from('prices')
    .select(`
      price_bgn,
      created_at,
      supermarket_id,
      supermarkets (
        id,
        name
      )
    `)
    .eq('product_id', productId)
    .order('created_at', { ascending: true })

  if (error || !prices) {
    return []
  }

  // Group prices by supermarket
  const supermarketGroups: Record<string, any[]> = {}
  prices.forEach(price => {
    const supermarketId = price.supermarket_id
    if (!supermarketGroups[supermarketId]) {
      supermarketGroups[supermarketId] = []
    }
    supermarketGroups[supermarketId].push(price)
  })

  // Calculate stats for each supermarket
  const stats: SupermarketPriceStats[] = []
  
  for (const [supermarketId, supermarketPrices] of Object.entries(supermarketGroups)) {
    const priceValues = supermarketPrices.map(p => p.price_bgn)
    const minPrice = Math.min(...priceValues)
    const maxPrice = Math.max(...priceValues)
    const avgPrice = priceValues.reduce((sum, price) => sum + price, 0) / priceValues.length
    
    // Calculate trend (last vs previous price)
    let trend: 'up' | 'down' | 'stable' = 'stable'
    let trendPercent = 0
    
    if (supermarketPrices.length >= 2) {
      const current = priceValues[priceValues.length - 1]
      const previous = priceValues[priceValues.length - 2]
      const change = current - previous
      trendPercent = (change / previous) * 100
      trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
    }

    const lastUpdate = supermarketPrices[supermarketPrices.length - 1].created_at
    const supermarketName = supermarketPrices[0].supermarkets?.name || 'Unknown'

    stats.push({
      supermarketId,
      supermarketName,
      avgPrice,
      minPrice,
      maxPrice,
      priceCount: supermarketPrices.length,
      lastUpdate,
      trend,
      trendPercent
    })
  }

  return stats.sort((a, b) => a.avgPrice - b.avgPrice)
}

/**
 * Generate price alerts for significant price changes
 */
export async function generatePriceAlerts(
  productId: string,
  supermarketId: string,
  oldPrice: number,
  newPrice: number
): Promise<void> {
  const priceChange = newPrice - oldPrice
  const priceChangePercent = oldPrice > 0 ? ((priceChange / oldPrice) * 100) : 0

  // Determine alert type
  let alertType: 'price_drop' | 'target_reached' | 'significant_change'
  
  if (Math.abs(priceChangePercent) >= 10) {
    alertType = 'significant_change'
  } else if (priceChange < 0) {
    alertType = 'price_drop'
  } else {
    return // No alert needed for small price increases
  }

  // Get users tracking this product
  const { data: trackingUsers, error } = await supabase
    .from('user_tracking')
    .select('user_id, target_price_bgn')
    .eq('product_id', productId)
    .eq('is_active', true)

  if (error || !trackingUsers) {
    return
  }

  // Create alerts for each tracking user
  const alerts = trackingUsers.map(tracking => {
    let finalAlertType = alertType
    
    // Check if target price alert should be generated
    if (tracking.target_price_bgn && newPrice <= tracking.target_price_bgn) {
      finalAlertType = 'target_reached'
    }

    return {
      user_id: tracking.user_id,
      product_id: productId,
      supermarket_id: supermarketId,
      alert_type: finalAlertType,
      old_price: oldPrice,
      new_price: newPrice,
      target_price: tracking.target_price_bgn,
      percentage_change: priceChangePercent,
      is_sent: false
    }
  })

  if (alerts.length > 0) {
    const { error: insertError } = await supabase
      .from('price_alerts')
      .insert(alerts)

    if (insertError) {
      console.error('Error creating price alerts:', insertError)
    }
  }
}

/**
 * Get price alerts for a user
 */
export async function getUserPriceAlerts(userId: string, limit: number = 10): Promise<PriceAlert[]> {
  const { data, error } = await supabase
    .from('price_alerts')
    .select(`
      *,
      products (name),
      supermarkets (name)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching price alerts:', error)
    return []
  }

  return data || []
}

/**
 * Mark price alerts as sent
 */
export async function markAlertsAsSent(alertIds: string[]): Promise<void> {
  const { error } = await supabase
    .from('price_alerts')
    .update({
      is_sent: true,
      sent_at: new Date().toISOString()
    })
    .in('id', alertIds)

  if (error) {
    console.error('Error marking alerts as sent:', error)
  }
}

/**
 * Calculate price volatility for a product over time
 */
export async function calculatePriceVolatility(
  productId: string,
  days: number = 30
): Promise<number> {
  const stats = await calculatePriceStatistics(productId, undefined, days)
  return stats.volatility
}

/**
 * Get price trend analysis for a product
 */
export async function getPriceTrendAnalysis(
  productId: string,
  days: number = 30
): Promise<{
  trend: 'up' | 'down' | 'stable'
  trendStrength: 'weak' | 'moderate' | 'strong'
  averageChange: number
  volatility: number
}> {
  const stats = await calculatePriceStatistics(productId, undefined, days)
  
  let trendStrength: 'weak' | 'moderate' | 'strong' = 'weak'
  if (Math.abs(stats.priceChangePercent) > 20) {
    trendStrength = 'strong'
  } else if (Math.abs(stats.priceChangePercent) > 10) {
    trendStrength = 'moderate'
  }

  return {
    trend: stats.trend,
    trendStrength,
    averageChange: stats.priceChangePercent,
    volatility: stats.volatility
  }
}
