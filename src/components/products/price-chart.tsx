'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface PriceEntry {
  id: string
  price: number
  currency: string
  recorded_at: string
  supermarket: {
    id: string
    name: string
    logo_url: string
    location: string
  }
}

interface Product {
  id: string
  name: string
  price_entries: PriceEntry[]
}

interface PriceChartProps {
  product: Product
}

interface TooltipData {
  price: number
  date: string
  supermarket: string
  x: number
  y: number
}

export function PriceChart({ product }: PriceChartProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'BGN') {
      return `${price.toFixed(2)} лв.`
    } else if (currency === 'EUR') {
      return `€${price.toFixed(2)}`
    }
    return `${price.toFixed(2)} ${currency}`
  }

  const getFilteredEntries = () => {
    if (!product.price_entries) return []

    const now = new Date()
    let cutoffDate = new Date()

    switch (timeRange) {
      case '7d':
        cutoffDate.setDate(now.getDate() - 7)
        break
      case '30d':
        cutoffDate.setDate(now.getDate() - 30)
        break
      case '90d':
        cutoffDate.setDate(now.getDate() - 90)
        break
      case 'all':
        cutoffDate = new Date(0)
        break
    }

    return product.price_entries
      .filter(entry => new Date(entry.recorded_at) >= cutoffDate)
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
  }

  const filteredEntries = getFilteredEntries()

  const getMinMaxPrices = () => {
    if (filteredEntries.length === 0) return { min: 0, max: 0 }

    const prices = filteredEntries.map(entry => entry.price)
    return {
      min: Math.min(...prices),
      max: Math.max(...prices)
    }
  }

  const { min: minPrice, max: maxPrice } = getMinMaxPrices()

  const getPriceChange = () => {
    if (filteredEntries.length < 2) return null

    const oldest = filteredEntries[0]
    const newest = filteredEntries[filteredEntries.length - 1]

    const change = newest.price - oldest.price
    const percentage = (change / oldest.price) * 100

    return {
      absolute: change,
      percentage: percentage,
      type: change > 0 ? 'increase' : change < 0 ? 'decrease' : 'same'
    }
  }

  const priceChange = getPriceChange()

  const getChartPoints = () => {
    if (filteredEntries.length === 0) return []

    const chartWidth = 100 // percentage
    const chartHeight = 100 // percentage

    return filteredEntries.map((entry, index) => {
      const x = (index / (filteredEntries.length - 1)) * chartWidth
      const y = chartHeight - ((entry.price - minPrice) / (maxPrice - minPrice)) * chartHeight

      return { x, y, entry }
    })
  }

  const chartPoints = getChartPoints()

  const createSVGPath = () => {
    if (chartPoints.length === 0) return ''

    const pathData = chartPoints.map((point, index) => {
      const command = index === 0 ? 'M' : 'L'
      return `${command} ${point.x} ${point.y}`
    }).join(' ')

    return pathData
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">История на цените</h3>
        <div className="flex space-x-2">
          {[
            { key: '7d', label: '7 дни' },
            { key: '30d', label: '30 дни' },
            { key: '90d', label: '90 дни' },
            { key: 'all', label: 'Всички' }
          ].map(({ key, label }) => (
            <Button
              key={key}
              variant={timeRange === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(key as any)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Price Statistics */}
      {filteredEntries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Най-ниска цена
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatPrice(minPrice, filteredEntries[0].currency)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Най-висока цена
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatPrice(maxPrice, filteredEntries[0].currency)}
              </div>
            </CardContent>
          </Card>

          {priceChange && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Промяна за периода
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold flex items-center ${
                  priceChange.type === 'increase' ? 'text-red-600' : 
                  priceChange.type === 'decrease' ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {priceChange.type === 'increase' && <TrendingUp className="h-6 w-6 mr-2" />}
                  {priceChange.type === 'decrease' && <TrendingDown className="h-6 w-6 mr-2" />}
                  {priceChange.type === 'same' && <Minus className="h-6 w-6 mr-2" />}
                  {priceChange.percentage.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Графика на цените</CardTitle>
          <CardDescription>
            {filteredEntries.length > 0 
              ? `${filteredEntries.length} записа за избрания период`
              : 'Няма данни за избрания период'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEntries.length > 0 ? (
            <div className="h-64 w-full relative">
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full"
                preserveAspectRatio="none"
              >
                {/* Grid lines */}
                <defs>
                  <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#grid)" />

                {/* Price line */}
                {chartPoints.length > 1 && (
                  <path
                    d={createSVGPath()}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                )}

                {/* Data points with hover */}
                {chartPoints.map((point, index) => (
                  <g key={index}>
                    {/* Invisible larger circle for easier hovering */}
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="5"
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={(e) => {
                        setTooltip({
                          price: point.entry.price,
                          date: new Date(point.entry.recorded_at).toLocaleDateString('bg-BG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }),
                          supermarket: point.entry.supermarket.name,
                          x: point.x,
                          y: point.y
                        })
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                    {/* Visible data point */}
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="2"
                      fill="#3b82f6"
                      vectorEffect="non-scaling-stroke"
                      className="hover:r-3 transition-all"
                    />
                  </g>
                ))}
              </svg>

              {/* Tooltip */}
              {tooltip && (
                <div
                  className="absolute bg-white border border-gray-200 rounded-lg shadow-lg p-3 pointer-events-none z-10 min-w-[180px]"
                  style={{
                    left: `${tooltip.x}%`,
                    top: `${tooltip.y}%`,
                    transform: 'translate(-50%, -120%)'
                  }}
                >
                  <div className="text-lg font-bold text-blue-600 mb-1">
                    {formatPrice(tooltip.price, 'BGN')}
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    📅 {tooltip.date}
                  </div>
                  <div className="text-sm text-gray-600">
                    🏪 {tooltip.supermarket}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Няма данни за цени за избрания период</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>


    </div>
  )
}
