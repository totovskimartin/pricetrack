'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus, Calendar, BarChart3, Target } from 'lucide-react'

interface PriceEntry {
  id: string
  price: number
  currency: string
  recorded_at: string
  supermarket: {
    id: string
    name: string
    logo_url?: string
  }
}

interface Product {
  id: string
  name: string
  price_entries: PriceEntry[]
}

interface PriceStatisticsProps {
  product: Product
}

export function PriceStatistics({ product }: PriceStatisticsProps) {
  const prices = product.price_entries || []
  
  if (prices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Статистики за цената
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Няма достатъчно данни за статистики
          </p>
        </CardContent>
      </Card>
    )
  }

  // Sort prices by date (newest first)
  const sortedPrices = [...prices].sort((a, b) => 
    new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
  )

  // Calculate statistics
  const currentPrice = sortedPrices[0]?.price || 0
  const previousPrice = sortedPrices[1]?.price || currentPrice
  const allPrices = sortedPrices.map(p => p.price)
  
  const minPrice = Math.min(...allPrices)
  const maxPrice = Math.max(...allPrices)
  const avgPrice = allPrices.reduce((sum, price) => sum + price, 0) / allPrices.length

  // Price change calculation
  const priceChange = currentPrice - previousPrice
  const priceChangePercent = previousPrice > 0 ? ((priceChange / previousPrice) * 100) : 0

  // Get price trend (last 7 days vs previous 7 days)
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  const recentPrices = sortedPrices.filter(p => new Date(p.recorded_at) >= sevenDaysAgo)
  const previousPrices = sortedPrices.filter(p => 
    new Date(p.recorded_at) >= fourteenDaysAgo && new Date(p.recorded_at) < sevenDaysAgo
  )

  const recentAvg = recentPrices.length > 0 
    ? recentPrices.reduce((sum, p) => sum + p.price, 0) / recentPrices.length 
    : currentPrice
  const previousAvg = previousPrices.length > 0 
    ? previousPrices.reduce((sum, p) => sum + p.price, 0) / previousPrices.length 
    : recentAvg

  const trendChange = recentAvg - previousAvg
  const trendPercent = previousAvg > 0 ? ((trendChange / previousAvg) * 100) : 0

  // Get cheapest and most expensive stores
  const storeStats = sortedPrices.reduce((acc, price) => {
    const storeName = price.supermarket.name
    if (!acc[storeName]) {
      acc[storeName] = { prices: [], logo: price.supermarket.logo_url }
    }
    acc[storeName].prices.push(price.price)
    return acc
  }, {} as Record<string, { prices: number[], logo?: string }>)

  const storeAverages = Object.entries(storeStats).map(([name, data]) => ({
    name,
    avgPrice: data.prices.reduce((sum, p) => sum + p, 0) / data.prices.length,
    logo: data.logo,
    count: data.prices.length
  })).sort((a, b) => a.avgPrice - b.avgPrice)

  const formatPrice = (price: number) => `${price.toFixed(2)} лв.`
  const formatPercent = (percent: number) => `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-red-500" />
    if (change < 0) return <TrendingDown className="h-4 w-4 text-green-500" />
    return <Minus className="h-4 w-4 text-gray-500" />
  }

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-red-600'
    if (change < 0) return 'text-green-600'
    return 'text-gray-600'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          Статистики за цената
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Price Change */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-center mb-1">
              {getTrendIcon(priceChange)}
              <span className="ml-1 text-sm font-medium text-foreground">Промяна</span>
            </div>
            <div className={`text-lg font-bold ${getTrendColor(priceChange)}`}>
              {formatPercent(priceChangePercent)}
            </div>
            <div className="text-xs text-muted-foreground">
              {priceChange !== 0 && `${priceChange > 0 ? '+' : ''}${formatPrice(Math.abs(priceChange))}`}
            </div>
          </div>

          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="ml-1 text-sm font-medium text-foreground">Тренд (7д)</span>
            </div>
            <div className={`text-lg font-bold ${getTrendColor(trendChange)}`}>
              {formatPercent(trendPercent)}
            </div>
            <div className="text-xs text-muted-foreground">
              {recentPrices.length} записа
            </div>
          </div>
        </div>

        {/* Min/Max/Average */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Минимална</div>
            <div className="font-bold text-green-600">{formatPrice(minPrice)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Средна</div>
            <div className="font-bold text-blue-600">{formatPrice(avgPrice)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Максимална</div>
            <div className="font-bold text-red-600">{formatPrice(maxPrice)}</div>
          </div>
        </div>

        {/* Store Comparison */}
        {storeAverages.length > 1 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center">
              <Target className="h-4 w-4 mr-1" />
              Сравнение по магазини
            </h4>
            <div className="space-y-2">
              {storeAverages.slice(0, 3).map((store, index) => (
                <div key={store.name} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex items-center space-x-2">
                    {index === 0 && <Badge variant="default" className="text-xs">Най-евтин</Badge>}
                    {index === storeAverages.length - 1 && index > 0 && (
                      <Badge variant="destructive" className="text-xs">Най-скъп</Badge>
                    )}
                    <span className="text-sm font-medium text-foreground">{store.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-foreground">{formatPrice(store.avgPrice)}</div>
                    <div className="text-xs text-muted-foreground">{store.count} записа</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Summary */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Общо {prices.length} записа за цени</span>
            <span>
              Последно обновяване: {new Date(sortedPrices[0]?.recorded_at).toLocaleDateString('bg-BG')}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
