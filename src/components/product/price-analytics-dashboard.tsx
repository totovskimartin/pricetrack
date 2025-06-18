'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, TrendingDown, Store, Calendar, Target, AlertTriangle, DollarSign } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format, subDays } from 'date-fns'
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

interface PriceAnalyticsDashboardProps {
  product: Product
}

interface SupermarketStats {
  id: string
  name: string
  logo_url?: string
  avgPrice: number
  minPrice: number
  maxPrice: number
  priceCount: number
  lastUpdate: string
  trend: 'up' | 'down' | 'stable'
  trendPercent: number
}

interface PriceAlert {
  id: string
  alert_type: string
  old_price: number | null
  new_price: number
  percentage_change: number | null
  created_at: string
  supermarket?: {
    name: string
  }
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4']

export function PriceAnalyticsDashboard({ product }: PriceAnalyticsDashboardProps) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPriceAlerts()
  }, [product.id])

  const fetchPriceAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('price_alerts')
        .select(`
          id,
          alert_type,
          old_price,
          new_price,
          percentage_change,
          created_at,
          supermarkets (name)
        `)
        .eq('product_id', product.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (!error && data) {
        setAlerts(data.map((alert: any) => ({
          ...alert,
          supermarket: alert.supermarkets
        })))
      }
    } catch (error) {
      console.error('Error fetching price alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate supermarket statistics
  const supermarketStats = useMemo(() => {
    const stats: Record<string, SupermarketStats> = {}

    product.price_entries.forEach(price => {
      const supermarketId = price.supermarket.id
      
      if (!stats[supermarketId]) {
        stats[supermarketId] = {
          id: supermarketId,
          name: price.supermarket.name,
          logo_url: price.supermarket.logo_url,
          avgPrice: 0,
          minPrice: price.price,
          maxPrice: price.price,
          priceCount: 0,
          lastUpdate: price.recorded_at,
          trend: 'stable',
          trendPercent: 0
        }
      }
      
      const stat = stats[supermarketId]
      stat.minPrice = Math.min(stat.minPrice, price.price)
      stat.maxPrice = Math.max(stat.maxPrice, price.price)
      stat.priceCount++

      if (new Date(price.recorded_at) > new Date(stat.lastUpdate)) {
        stat.lastUpdate = price.recorded_at
      }
    })

    // Calculate averages and trends
    Object.values(stats).forEach(stat => {
      const supermarketPrices = product.price_entries
        .filter(p => p.supermarket.id === stat.id)
        .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())

      stat.avgPrice = supermarketPrices.reduce((sum, p) => sum + p.price, 0) / supermarketPrices.length
      
      // Calculate trend (last vs previous price)
      if (supermarketPrices.length >= 2) {
        const current = supermarketPrices[supermarketPrices.length - 1].price
        const previous = supermarketPrices[supermarketPrices.length - 2].price
        const change = current - previous
        stat.trendPercent = (change / previous) * 100
        stat.trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
      }
    })

    return Object.values(stats).sort((a, b) => a.avgPrice - b.avgPrice)
  }, [product.price_entries])

  // Price distribution data for pie chart
  const priceDistribution = useMemo(() => {
    return supermarketStats.map((stat, index) => ({
      name: stat.name,
      value: stat.priceCount,
      avgPrice: stat.avgPrice,
      color: COLORS[index % COLORS.length]
    }))
  }, [supermarketStats])

  // Price comparison data for bar chart
  const priceComparison = useMemo(() => {
    return supermarketStats.map(stat => ({
      name: stat.name.length > 10 ? stat.name.substring(0, 10) + '...' : stat.name,
      fullName: stat.name,
      avgPrice: stat.avgPrice,
      minPrice: stat.minPrice,
      maxPrice: stat.maxPrice
    }))
  }, [supermarketStats])

  // Recent price changes (last 7 days)
  const recentChanges = useMemo(() => {
    const sevenDaysAgo = subDays(new Date(), 7)
    return product.price_entries
      .filter(price => new Date(price.recorded_at) >= sevenDaysAgo)
      .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
      .slice(0, 5)
  }, [product.price_entries])

  const formatPrice = (price: number) => `${price.toFixed(2)} лв.`

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-red-500" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-green-500" />
      default:
        return <DollarSign className="h-4 w-4 text-gray-500" />
    }
  }

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'price_drop':
        return <TrendingDown className="h-4 w-4 text-green-500" />
      case 'target_reached':
        return <Target className="h-4 w-4 text-blue-500" />
      case 'significant_change':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      default:
        return <DollarSign className="h-4 w-4 text-gray-500" />
    }
  }

  const getAlertText = (alertType: string) => {
    switch (alertType) {
      case 'price_drop':
        return 'Намаление на цената'
      case 'target_reached':
        return 'Достигната целева цена'
      case 'significant_change':
        return 'Значителна промяна'
      default:
        return 'Промяна в цената'
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Преглед</TabsTrigger>
          <TabsTrigger value="comparison">Сравнение</TabsTrigger>
          <TabsTrigger value="trends">Тенденции</TabsTrigger>
          <TabsTrigger value="alerts">Известия</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Price Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Store className="h-5 w-5 mr-2" />
                  Разпределение по магазини
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={priceDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {priceDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Supermarket Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Статистики по магазини</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {supermarketStats.map((stat) => (
                    <div key={stat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {stat.logo_url && (
                          <img 
                            src={stat.logo_url} 
                            alt={stat.name}
                            className="w-6 h-6 object-contain"
                          />
                        )}
                        <div>
                          <div className="font-medium">{stat.name}</div>
                          <div className="text-sm text-gray-600">
                            {stat.priceCount} цени
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatPrice(stat.avgPrice)}</div>
                        <div className="flex items-center text-sm">
                          {getTrendIcon(stat.trend)}
                          <span className={`ml-1 ${
                            stat.trend === 'up' ? 'text-red-600' : 
                            stat.trend === 'down' ? 'text-green-600' : 'text-gray-600'
                          }`}>
                            {stat.trendPercent !== 0 && `${stat.trendPercent > 0 ? '+' : ''}${stat.trendPercent.toFixed(1)}%`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Сравнение на цените</CardTitle>
              <CardDescription>
                Средни, минимални и максимални цени по магазини
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priceComparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value: number, name: string) => [formatPrice(value), name]}
                      labelFormatter={(label) => {
                        const item = priceComparison.find(p => p.name === label)
                        return item?.fullName || label
                      }}
                    />
                    <Bar dataKey="minPrice" fill="#10b981" name="Мин. цена" />
                    <Bar dataKey="avgPrice" fill="#3b82f6" name="Средна цена" />
                    <Bar dataKey="maxPrice" fill="#ef4444" name="Макс. цена" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Последни промени (7 дни)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentChanges.length > 0 ? (
                  recentChanges.map((price) => (
                    <div key={price.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {price.supermarket.logo_url && (
                          <img 
                            src={price.supermarket.logo_url} 
                            alt={price.supermarket.name}
                            className="w-6 h-6 object-contain"
                          />
                        )}
                        <div>
                          <div className="font-medium">{price.supermarket.name}</div>
                          <div className="text-sm text-gray-600">
                            {format(new Date(price.recorded_at), 'dd MMM yyyy, HH:mm', { locale: bg })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatPrice(price.price)}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Няма промени в последните 7 дни
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Известия за промени в цените
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {!loading && alerts.length > 0 ? (
                  alerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getAlertIcon(alert.alert_type)}
                        <div>
                          <div className="font-medium">{getAlertText(alert.alert_type)}</div>
                          <div className="text-sm text-gray-600">
                            {alert.supermarket?.name} • {format(new Date(alert.created_at), 'dd MMM yyyy', { locale: bg })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatPrice(alert.new_price)}</div>
                        {alert.percentage_change && (
                          <div className={`text-sm ${
                            alert.percentage_change > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {alert.percentage_change > 0 ? '+' : ''}{alert.percentage_change.toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : !loading ? (
                  <div className="text-center py-8 text-gray-500">
                    Няма известия за промени в цените
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Зареждане...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
