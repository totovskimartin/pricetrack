'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts'
import { Calendar, TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react'
import { format, subDays, subWeeks, subMonths } from 'date-fns'
import { bg } from 'date-fns/locale'

interface PriceEntry {
  id: string
  price: number
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

interface EnhancedPriceChartProps {
  product: Product
}

type TimeRange = '7d' | '30d' | '90d' | '6m' | '1y' | 'all'
type ChartType = 'area'
type Currency = 'BGN' | 'EUR'

interface ChartDataPoint {
  date: string
  price: number
  supermarket: string
  supermarketId: string
  originalDate: Date
  formattedDate: string
}

export function EnhancedPriceChart({ product }: EnhancedPriceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [chartType, setChartType] = useState<ChartType>('area')
  const [currency, setCurrency] = useState<Currency>('BGN')
  const [selectedSupermarket, setSelectedSupermarket] = useState<string>('all')

  const prices = product.price_entries || []

  // Get unique supermarkets
  const supermarkets = useMemo(() => {
    const unique = prices.reduce((acc, price) => {
      if (!acc.find(s => s.id === price.supermarket.id)) {
        acc.push(price.supermarket)
      }
      return acc
    }, [] as Array<{ id: string; name: string; logo_url?: string }>)
    return unique
  }, [prices])

  // Filter and process data
  const chartData = useMemo(() => {
    if (prices.length === 0) return []

    // Filter by time range
    const now = new Date()
    let startDate: Date
    
    switch (timeRange) {
      case '7d':
        startDate = subDays(now, 7)
        break
      case '30d':
        startDate = subDays(now, 30)
        break
      case '90d':
        startDate = subDays(now, 90)
        break
      case '6m':
        startDate = subMonths(now, 6)
        break
      case '1y':
        startDate = subMonths(now, 12)
        break
      default:
        startDate = new Date(0) // All time
    }

    // Filter prices by date and supermarket
    let filteredPrices = prices.filter(price => {
      const priceDate = new Date(price.recorded_at)
      const matchesDate = priceDate >= startDate
      const matchesSupermarket = selectedSupermarket === 'all' || price.supermarket.id === selectedSupermarket
      return matchesDate && matchesSupermarket
    })

    // Sort by date
    filteredPrices.sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())

    // Convert to chart data
    return filteredPrices.map(price => {
      const date = new Date(price.recorded_at)
      return {
        date: date.toISOString(),
        price: currency === 'BGN' ? price.price : (price.price / 1.96),
        supermarket: price.supermarket.name,
        supermarketId: price.supermarket.id,
        originalDate: date,
        formattedDate: format(date, 'dd MMM yyyy', { locale: bg })
      }
    })
  }, [prices, timeRange, selectedSupermarket, currency])

  // Calculate statistics
  const statistics = useMemo(() => {
    if (chartData.length === 0) {
      return {
        min: 0,
        max: 0,
        avg: 0,
        current: 0,
        change: 0,
        changePercent: 0,
        trend: 'stable' as const
      }
    }

    const priceValues = chartData.map(d => d.price)
    const min = Math.min(...priceValues)
    const max = Math.max(...priceValues)
    const avg = priceValues.reduce((sum, price) => sum + price, 0) / priceValues.length
    const current = priceValues[priceValues.length - 1]
    const previous = priceValues.length > 1 ? priceValues[priceValues.length - 2] : current
    const change = current - previous
    const changePercent = previous > 0 ? ((change / previous) * 100) : 0

    return {
      min,
      max,
      avg,
      current,
      change,
      changePercent,
      trend: change > 0 ? 'up' as const : change < 0 ? 'down' as const : 'stable' as const
    }
  }, [chartData])

  const formatPrice = (price: number) => {
    return currency === 'BGN' ? `${price.toFixed(2)} лв.` : `€${price.toFixed(2)}`
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-red-500" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-green-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'text-red-600'
      case 'down':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataPoint
      return (
        <div className="bg-card p-3 border border-border rounded-lg shadow-lg">
          <p className="font-medium text-foreground">{data.formattedDate}</p>
          <p className="text-blue-600 font-semibold">
            {formatPrice(data.price)}
          </p>
          <p className="text-sm text-muted-foreground">{data.supermarket}</p>
        </div>
      )
    }
    return null
  }

  const CustomYAxisTick = ({ x, y, payload }: any) => {
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={4}
          textAnchor="end"
          fill="#9ca3af"
          fontSize="11"
          style={{ whiteSpace: 'nowrap' }}
        >
          {formatPrice(payload.value)}
        </text>
      </g>
    )
  }

  const CustomXAxisTick = ({ x, y, payload }: any) => {
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={20}
          dy={4}
          textAnchor="middle"
          fill="#9ca3af"
          fontSize="11"
        >
          {payload.value}
        </text>
      </g>
    )
  }

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">История на цените</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            {getTrendIcon(statistics.trend)}
            <span className={`text-sm font-medium ${getTrendColor(statistics.trend)}`}>
              {statistics.changePercent !== 0 && (
                `${statistics.changePercent > 0 ? '+' : ''}${statistics.changePercent.toFixed(1)}%`
              )}
            </span>
          </div>
        </div>
        <CardDescription>
          Проследете промените в цената на "{product.name}" във времето
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
        {/* Controls */}
        <div className="flex flex-wrap gap-2 mb-6 bg-white p-3 rounded-lg">
          <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg">
              <SelectItem value="7d">7 дни</SelectItem>
              <SelectItem value="30d">30 дни</SelectItem>
              <SelectItem value="90d">90 дни</SelectItem>
              <SelectItem value="6m">6 месеца</SelectItem>
              <SelectItem value="1y">1 година</SelectItem>
              <SelectItem value="all">Всички</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedSupermarket} onValueChange={setSelectedSupermarket}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg">
              <SelectItem value="all">Всички магазини</SelectItem>
              {supermarkets.map((supermarket) => (
                <SelectItem key={supermarket.id} value={supermarket.id}>
                  {supermarket.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={currency} onValueChange={(value: Currency) => setCurrency(value)}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg">
              <SelectItem value="BGN">лв.</SelectItem>
              <SelectItem value="EUR">€</SelectItem>
            </SelectContent>
          </Select>


        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-sm text-green-600">Най-ниска</div>
            <div className="text-lg font-bold text-green-600">{formatPrice(statistics.min)}</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-muted-foreground">Средна</div>
            <div className="text-lg font-bold text-foreground">{formatPrice(statistics.avg)}</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-sm text-red-600">Най-висока</div>
            <div className="text-lg font-bold text-red-600">{formatPrice(statistics.max)}</div>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 0 ? (
          <div className="h-80 md:h-80 sm:h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25}/>
                    <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.15}/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05}/>
                  </linearGradient>
                  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#3b82f6" floodOpacity="0.1"/>
                  </filter>
                </defs>
                <CartesianGrid
                  strokeDasharray="2 4"
                  stroke="hsl(var(--border))"
                  strokeOpacity={0.6}
                  horizontal={true}
                  vertical={false}
                />
                <XAxis
                  dataKey="formattedDate"
                  tick={<CustomXAxisTick />}
                  interval="preserveStartEnd"
                  axisLine={false}
                  tickLine={false}
                  height={60}
                />
                <YAxis
                  tick={<CustomYAxisTick />}
                  domain={['dataMin', 'dataMax']}
                  ticks={[statistics.min, statistics.max]}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#2563eb"
                  fill="url(#priceGradient)"
                  strokeWidth={2}
                  filter="url(#shadow)"
                  dot={false}
                  activeDot={{
                    r: 6,
                    stroke: '#2563eb',
                    strokeWidth: 3,
                    fill: '#ffffff',
                    filter: "url(#shadow)"
                  }}
                />

              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Няма данни за избрания период</p>
            </div>
          </div>
        )}

        {/* Legend */}
        {chartData.length > 0 && (
          <div className="mt-4 flex items-center justify-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-0.5 bg-blue-500"></div>
              <span>Цена</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
