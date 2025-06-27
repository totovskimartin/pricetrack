'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getProductUrl } from '@/lib/slug-utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { Input } from '@/components/ui/input'
import { SearchResultsSkeleton, ProductCardSkeleton, ActivityFeedSkeleton, NewsCardSkeleton } from '@/components/ui/skeleton'
import { User, TrendingUp, ShoppingCart, Heart, Eye, Bell, Newspaper, Search, Activity, TrendingDown, MessageCircle } from 'lucide-react'
import { useFavorites } from '@/hooks/use-favorites'
import { usePriceTracking } from '@/hooks/use-price-tracking'
import { useAuth } from '@/components/providers/auth-provider'
import { AuthGuard } from '@/components/auth/auth-guard'
import Link from 'next/link'


// Extended product type for search results with latest price
interface ProductWithLatestPrice {
  id: string
  name: string
  category: string
  brand?: string
  image_url?: string
  latest_price?: {
    price: number
    supermarket_name?: string
  } | null
}

function DashboardContent() {
  const { user } = useAuth()
  const router = useRouter()
  const { favoriteProducts, loading: favoritesLoading } = useFavorites()
  const { trackedProducts, loading: trackingLoading } = usePriceTracking()
  const [news, setNews] = useState<Array<{
    id: string
    title: string
    content: string
    type: string
    priority: number
    border_color: string
    text_color: string
    published_at: string
    expires_at: string | null
  }>>([])
  const [newsLoading, setNewsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<ProductWithLatestPrice[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [userProfile, setUserProfile] = useState<{
    id: string
    email: string
    username: string
    full_name: string | null
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
    role: string
  } | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Activity Feed State
  const [activityFeed, setActivityFeed] = useState<Array<{
    id: string
    type: string
    product_name?: string
    old_price?: number
    new_price?: number
    supermarket_name?: string
    created_at?: string
    // For price alerts
    title?: string
    description?: string
    product?: {
      id: string
      name: string
      brand?: string
      image_url?: string
    }
    supermarket?: string
    oldPrice?: number
    newPrice?: number
    percentageChange?: number
    timestamp?: string
    icon?: string
  }>>([])
  const [activityLoading, setActivityLoading] = useState(true)

  // Fetch news from database
  const fetchNews = async () => {
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('News fetch timeout')), 3000)
      )

      const newsPromise = supabase.rpc('get_active_news')

      const { data, error } = await Promise.race([newsPromise, timeoutPromise]) as any

      if (error) {
        console.log('Error fetching news:', error)
        setNews([])
      } else {
        setNews(data || [])
      }
    } catch (error) {
      console.log('News fetch failed:', error)
      setNews([])
    } finally {
      setNewsLoading(false)
    }
  }

  // Search products function
  const searchProducts = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setSearchLoading(true)
    try {
      const { data: productsData, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          category,
          brand,
          image_url,
          created_at
        `)
        .eq('is_approved', true)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,brand.ilike.%${query}%`)
        .order('name')
        .limit(8)

      if (error) {
        console.error('Search error:', error)
        setSearchResults([])
        return
      }

      // Get latest prices for search results
      if (productsData && productsData.length > 0) {
        const productIds = productsData.map(p => p.id)
        const { data: pricesData } = await supabase
          .from('prices')
          .select(`
            product_id,
            price_bgn,
            created_at,
            supermarkets (
              name
            )
          `)
          .in('product_id', productIds)
          .order('created_at', { ascending: false })

        // Attach latest price to each product
        const productsWithPrices = productsData.map(product => {
          const latestPrice = pricesData?.find(price => price.product_id === product.id)
          return {
            ...product,
            brand: product.brand || undefined, // Convert null to undefined for compatibility
            latest_price: latestPrice ? {
              price: latestPrice.price_bgn,
              supermarket_name: (latestPrice.supermarkets as any)?.name
            } : null
          }
        })

        setSearchResults(productsWithPrices)
      } else {
        setSearchResults([])
      }
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        searchProducts(searchTerm)
        setShowSearchResults(true)
      } else {
        setSearchResults([])
        setShowSearchResults(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  // Click outside to close search results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Auto-focus search input on component mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [])

  // Handle search form submission (Enter key)
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      router.push(`/bg/products?search=${encodeURIComponent(searchTerm.trim())}`)
    }
  }

  const fetchUserProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, username, full_name, first_name, last_name, avatar_url, role')
        .eq('id', user.id)
        .single()

      if (!error && data) {
        setUserProfile(data)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  useEffect(() => {
    console.log('🚀 Dashboard useEffect triggered, user:', user?.email || 'not logged in')
    fetchNews()
    fetchActivityFeed() // Always fetch activity feed, regardless of user login status
    if (user) {
      fetchUserProfile()
    }
  }, [user])

  // Fetch activity feed with recent price changes
  const fetchActivityFeed = async () => {
    try {
      setActivityLoading(true)
      console.log('🔍 Fetching activity feed...')

      // Get recent price changes (last 7 days) for all products
      const { data: recentPricesData, error: pricesError } = await supabase
        .from('prices')
        .select(`
          id,
          price_bgn,
          created_at,
          supermarket_id,
          product_id,
          products (
            id,
            name,
            brand,
            image_url
          ),
          supermarkets (
            name
          )
        `)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(50)

      if (pricesError) {
        console.error('❌ Error fetching recent prices:', pricesError)
        setActivityFeed([])
        return
      }

      console.log(`📊 Found ${recentPricesData?.length || 0} recent price entries`)

      if (!recentPricesData || recentPricesData.length === 0) {
        console.log('⚠️ No recent price data found')
        setActivityFeed([])
        return
      }

      // Get recent price alerts for the user (if logged in)
      let alertsData: any[] = []
      if (user?.id) {
        const { data: userAlertsData, error: alertsError } = await supabase
          .from('price_alerts')
          .select(`
            id,
            alert_type,
            old_price,
            new_price,
            percentage_change,
            created_at,
            products (
              id,
              name,
              brand,
              image_url
            ),
            supermarkets (
              name
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (!alertsError && userAlertsData) {
          alertsData = userAlertsData
          console.log(`🔔 Found ${alertsData.length} user alerts`)
        }
      }

      // Process recent price changes to find actual changes
      const activities = []
      const processedProducts = new Set()

      if (recentPricesData) {
        for (const price of recentPricesData) {
          const productId = (price.products as any)?.id
          const supermarketId = price.supermarket_id
          const productKey = `${productId}-${supermarketId}`

          // Skip if we already processed this product-supermarket combination
          if (processedProducts.has(productKey)) {
            continue
          }
          processedProducts.add(productKey)

          // Get previous price for this specific product and supermarket
          const { data: previousPricesData } = await supabase
            .from('prices')
            .select('id, price_bgn, created_at')
            .eq('product_id', productId)
            .eq('supermarket_id', supermarketId)
            .neq('id', price.id)
            .lt('created_at', price.created_at)
            .order('created_at', { ascending: false })
            .limit(1)

          let percentageChange = null
          let oldPrice = null
          let changeType = 'new'

          if (previousPricesData && previousPricesData.length > 0) {
            const previousPrice = previousPricesData[0]
            oldPrice = previousPrice.price_bgn

            if (price.price_bgn !== previousPrice.price_bgn) {
              percentageChange = ((price.price_bgn - previousPrice.price_bgn) / previousPrice.price_bgn) * 100
              changeType = price.price_bgn > previousPrice.price_bgn ? 'increase' : 'decrease'

              console.log(`💰 Price change for ${(price.products as any)?.name}: ${previousPrice.price_bgn} → ${price.price_bgn} (${percentageChange.toFixed(1)}%)`)

              activities.push({
                id: `price-${price.id}`,
                type: 'price_update',
                product_name: (price.products as any)?.name || 'Неизвестен продукт',
                supermarket_name: (price.supermarkets as any)?.name || 'Неизвестен супермаркет',
                new_price: price.price_bgn,
                old_price: oldPrice,
                percentage_change: percentageChange,
                change_type: changeType,
                created_at: price.created_at,
                product: price.products
              })
            }
          } else {
            // New price entry (no previous price)
            console.log(`🆕 New price entry for ${(price.products as any)?.name}: ${price.price_bgn} лв.`)

            activities.push({
              id: `price-${price.id}`,
              type: 'price_update',
              product_name: (price.products as any)?.name || 'Неизвестен продукт',
              supermarket_name: (price.supermarkets as any)?.name || 'Неизвестен супермаркет',
              new_price: price.price_bgn,
              old_price: null,
              percentage_change: 0,
              change_type: 'new',
              created_at: price.created_at,
              product: price.products
            })
          }
        }
      }

      // Add user-specific price alerts at the top
      if (alertsData && alertsData.length > 0) {
        alertsData.forEach(alert => {
          activities.unshift({
            id: `alert-${alert.id}`,
            type: 'price_alert',
            title: getAlertTitle(alert.alert_type),
            description: `${(alert.products as any)?.name} - ${alert.old_price?.toFixed(2)} лв. → ${alert.new_price.toFixed(2)} лв.`,
            product: alert.products,
            supermarket: (alert.supermarkets as any)?.name,
            oldPrice: alert.old_price,
            newPrice: alert.new_price,
            percentageChange: alert.percentage_change,
            timestamp: alert.created_at,
            created_at: alert.created_at,
            icon: getAlertIcon(alert.alert_type)
          })
        })
      }

      // Sort by timestamp and limit
      activities.sort((a, b) => new Date(b.created_at || (a as any).timestamp || new Date()).getTime() - new Date(a.created_at || (a as any).timestamp || new Date()).getTime())
      const finalActivities = activities.slice(0, 15)

      console.log(`✅ Final activity feed: ${finalActivities.length} items`)
      setActivityFeed(finalActivities as any)

    } catch (error) {
      console.error('❌ Error fetching activity feed:', error)
      setActivityFeed([])
    } finally {
      setActivityLoading(false)
    }
  }



  // Helper functions
  const getAlertTitle = (alertType: string) => {
    switch (alertType) {
      case 'price_drop': return 'Намаление на цена'
      case 'target_reached': return 'Достигната целева цена'
      case 'significant_change': return 'Значителна промяна'
      default: return 'Промяна в цената'
    }
  }

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'price_drop': return '📉'
      case 'target_reached': return '🎯'
      case 'significant_change': return '⚡'
      default: return '💰'
    }
  }





  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Page Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 shadow-soft">
        <div className="max-w-7xl mx-auto pl-16 pr-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-medium float">
                  <TrendingUp className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    Добре дошли в PriceTrack
                  </h1>
                  <p className="text-lg text-gray-600 font-medium">
                    Здравейте, <span className="gradient-text-primary font-semibold">
                      {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Потребител'}
                    </span>!
                  </p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="hidden md:flex items-center space-x-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{favoriteProducts.length}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Любими</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{trackedProducts.length}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Следени</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{activityFeed.length}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Активност</div>
                </div>
              </div>
            </div>


          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-8 animate-slide-up" ref={searchRef}>
          <form onSubmit={handleSearchSubmit} className="relative w-full max-w-2xl mx-auto">
            <Input
              ref={searchInputRef}
              placeholder="Търсете продукти по име, марка или описание..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => searchTerm && setShowSearchResults(true)}
              className="pl-14 pr-20 py-4 text-base w-full bg-white/80 backdrop-blur-sm border-white/20 shadow-soft focus-ring rounded-2xl text-gray-900 placeholder-gray-500"
            />
            {/* Enhanced Search Icon - positioned after input to ensure visibility */}
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-6 h-6 bg-blue-100 rounded-lg z-10 pointer-events-none">
              <Search className="text-blue-600 h-4 w-4" />
            </div>
            {/* Enter key hint */}
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-1 text-gray-400">
              <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded text-gray-600">
                Enter
              </kbd>
            </div>
          </form>
          {/* Search Results */}
          {searchTerm && showSearchResults && (
            <div className="relative w-full mt-3 max-w-2xl mx-auto">
              <Card className="absolute top-0 left-0 right-0 z-50 glass-card shadow-strong border-white/30 rounded-2xl animate-scale-in">
                <CardContent className="p-0">
                  {searchLoading ? (
                    <SearchResultsSkeleton />
                  ) : searchResults.length > 0 ? (
                    <div className="max-h-96 overflow-y-auto">
                      {searchResults.map((product) => (
                        <Link key={product.id} href={getProductUrl(product, 'bg')}>
                          <div
                            className="p-4 hover:bg-white/60 transition-all duration-200 border-b border-gray-100 last:border-b-0 cursor-pointer group"
                            onClick={() => setShowSearchResults(false)}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                                {product.image_url ? (
                                  <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="w-full h-full object-cover rounded-lg"
                                  />
                                ) : (
                                  <div className="text-muted-foreground text-sm">📦</div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm line-clamp-1 text-card-foreground">
                                  {product.name}
                                </h4>
                                {product.brand && (
                                  <p className="text-xs text-muted-foreground">{product.brand}</p>
                                )}
                                {product.latest_price ? (
                                  <div className="flex items-center space-x-2 mt-1">
                                    <p className="text-sm font-bold text-green-600">
                                      {product.latest_price.price.toFixed(2)} лв.
                                    </p>
                                    {product.latest_price.supermarket_name && (
                                      <p className="text-xs text-muted-foreground">
                                        в {product.latest_price.supermarket_name}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground mt-1">Няма данни за цена</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                      {searchResults.length === 8 && (
                        <div className="p-3 text-center border-t border-border">
                          <Link href={`/bg/products?search=${encodeURIComponent(searchTerm)}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary"
                              onClick={() => setShowSearchResults(false)}
                            >
                              Вижте всички резултати →
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-muted-foreground text-sm">Няма намерени продукти</p>
                      <Link href="/bg/products/new">
                        <Button variant="ghost" size="sm" className="text-primary mt-2">
                          Добавете нов продукт
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>



        {/* Activity Feed */}
        <div className="mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2 text-blue-600 icon-bounce" />
                Последни промени в цените
              </CardTitle>
              <CardDescription>
                Актуални промени и известия за цени
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <ActivityFeedSkeleton />
              ) : activityFeed.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                    {activityFeed.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start space-x-3 p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-white/20 hover:bg-white/80 transition-all duration-200 cursor-pointer group"
                        onClick={() => {
                          if (activity.product && activity.product.id) {
                            const productUrl = getProductUrl({
                              id: activity.product.id,
                              name: activity.product.name,
                              brand: activity.product.brand
                            }, 'bg')
                            router.push(productUrl)
                          }
                        }}
                      >
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                          {activity.icon || (
                            activity.type === 'price_alert' ? '🔔' :
                            (activity as any).change_type === 'decrease' ? '📉' :
                            (activity as any).change_type === 'increase' ? '📈' : '🆕'
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm text-gray-900">
                              {activity.title || activity.product_name || 'Промяна в цената'}
                            </h4>
                            <div className="flex items-center space-x-1">
                              {(activity.percentageChange !== null && activity.percentageChange !== undefined && activity.percentageChange !== 0) && (
                                <div className={`flex items-center text-xs px-2 py-1 rounded-full ${
                                  activity.percentageChange < 0
                                    ? 'bg-green-100 text-green-700'
                                    : activity.percentageChange > 0
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {activity.percentageChange < 0 ? (
                                    <TrendingDown className="h-3 w-3 mr-1" />
                                  ) : activity.percentageChange > 0 ? (
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                  ) : (
                                    <div className="w-3 h-3 mr-1 bg-blue-500 rounded-full" />
                                  )}
                                  {`${Math.abs(activity.percentageChange).toFixed(1)}%`}
                                </div>
                              )}
                              {(activity as any).change_type === 'new' && (
                                <div className="flex items-center text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                                  <div className="w-3 h-3 mr-1 bg-blue-500 rounded-full" />
                                  Нова цена
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-1">
                            {activity.description ||
                             (activity.old_price && activity.new_price ?
                               `${activity.old_price.toFixed(2)} лв. → ${activity.new_price.toFixed(2)} лв.` :
                               activity.new_price ? `Нова цена: ${activity.new_price.toFixed(2)} лв.` : 'Промяна в цената'
                             )
                            }
                          </p>
                          {(activity.supermarket || activity.supermarket_name) && (
                            <p className="text-xs text-gray-500 mt-1">
                              в {activity.supermarket || activity.supermarket_name}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-gray-400">
                              {new Date(activity.timestamp || activity.created_at || new Date()).toLocaleDateString('bg-BG', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                            {((activity.oldPrice || activity.old_price) && (activity.newPrice || activity.new_price)) && (
                              <div className="text-xs text-gray-600">
                                <span className="line-through text-gray-400">
                                  {(activity.oldPrice || activity.old_price)?.toFixed(2)} лв.
                                </span>
                                <span className="ml-1 font-medium">
                                  {(activity.newPrice || activity.new_price)?.toFixed(2)} лв.
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Няма скорошни промени</h3>
                    <p className="text-gray-500 text-sm">
                      Промените в цените ще се появят тук, когато има нови данни.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        {/* Useful Information Section - Moved to top */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 mb-12 animate-fade-in">
          {/* Getting Started Guide */}
          <Card className="glass-card shadow-soft border-white/30 card-hover">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3 icon-bounce">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                Как да започнете
              </CardTitle>
              <CardDescription className="text-gray-600">
                Полезни съвети за проследяване на цени
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-medium">1</div>
                  <div>
                    <p className="text-sm font-medium text-card-foreground">Намерете продукти</p>
                    <p className="text-xs text-muted-foreground">Търсете в нашата база от хиляди продукти</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-medium">2</div>
                  <div>
                    <p className="text-sm font-medium text-card-foreground">Добавете в любими</p>
                    <p className="text-xs text-muted-foreground">Запазете продукти за бързо сравнение</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-medium">3</div>
                  <div>
                    <p className="text-sm font-medium text-card-foreground">Следете цените</p>
                    <p className="text-xs text-muted-foreground">Получавайте известия при промени</p>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-border">
                <Link href="/bg/products" className="text-sm text-primary hover:text-primary/80 font-medium">
                  Започнете сега →
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Latest News */}
          <Card className="glass-card shadow-soft border-white/30 card-hover">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3 icon-pulse">
                  <Newspaper className="h-4 w-4 text-white" />
                </div>
                Последни новини
              </CardTitle>
              <CardDescription className="text-gray-600">
                Актуална информация и обновления
              </CardDescription>
            </CardHeader>
            <CardContent>
              {newsLoading ? (
                <NewsCardSkeleton />
              ) : news.length > 0 ? (
                <div className="space-y-4">
                  {news.map((newsItem) => (
                    <div
                      key={newsItem.id}
                      className={`border-l-4 border-${newsItem.border_color}-400 pl-4`}
                    >
                      <h4 className="font-semibold text-card-foreground">
                        {newsItem.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {newsItem.content}
                      </p>
                      {newsItem.published_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(newsItem.published_at).toLocaleDateString('bg-BG')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">Няма налични новини в момента</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Favorite Products */}
        {favoriteProducts.length > 0 && (
          <Card className="mb-8 glass-card shadow-soft border-white/30 animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900">
                <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg flex items-center justify-center mr-3 icon-pulse">
                  <Heart className="h-4 w-4 text-white" />
                </div>
                Любими продукти ({favoriteProducts.length})
              </CardTitle>
              <CardDescription className="text-gray-600">
                Вашите запазени продукти за бързо сравнение
              </CardDescription>
            </CardHeader>
            <CardContent>
              {favoritesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {favoriteProducts.map((product) => (
                    <Link key={product.id} href={getProductUrl(product, 'bg')}>
                      <Card className="bg-white/60 backdrop-blur-sm border-white/20 hover:bg-white/80 hover:shadow-medium transition-all duration-300 cursor-pointer card-hover group">
                        <CardContent className="p-5">
                          <div className="flex items-start space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-soft">
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="w-full h-full object-cover rounded-xl"
                                />
                              ) : (
                                <div className="text-gray-400 text-lg group-hover:scale-110 transition-transform">📦</div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm line-clamp-2 mb-1 text-card-foreground">
                                {product.name}
                              </h4>
                              {product.brand && (
                                <p className="text-xs text-muted-foreground mb-1">{product.brand}</p>
                              )}
                              {product.latest_price ? (
                                <div className="group-hover:scale-105 transition-transform">
                                  <p className="text-sm font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                    {product.latest_price.price.toFixed(2)} лв.
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {product.latest_price.supermarket_name}
                                  </p>
                                </div>
                              ) : (
                                <p className="text-xs text-gray-400">Няма данни за цена</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tracked Products */}
        {trackedProducts.length > 0 && (
          <Card className="mb-8 glass-card shadow-soft border-white/30 animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center mr-3 icon-bounce">
                  <Bell className="h-4 w-4 text-white" />
                </div>
                Следени продукти ({trackedProducts.length})
              </CardTitle>
              <CardDescription className="text-gray-600">
                Продукти за които получавате известия при промяна на цената
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trackingLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {trackedProducts.map((tracked) => (
                    <Link key={tracked.id} href={getProductUrl({
                      id: tracked.product_id,
                      name: tracked.product?.name || 'Product',
                      brand: tracked.product?.brand
                    }, 'bg')}>
                      <Card className="bg-white/60 backdrop-blur-sm border-white/20 hover:bg-white/80 hover:shadow-medium transition-all duration-300 cursor-pointer card-hover group">
                        <CardContent className="p-5">
                          <div className="flex items-start space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-200 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-soft">
                              {tracked.product?.image_url ? (
                                <img
                                  src={tracked.product.image_url}
                                  alt={tracked.product.name}
                                  className="w-full h-full object-cover rounded-xl"
                                />
                              ) : (
                                <div className="text-blue-400 text-lg group-hover:scale-110 transition-transform">📦</div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm line-clamp-2 mb-1 text-card-foreground">
                                {tracked.product?.name || 'Неизвестен продукт'}
                              </h4>
                              {tracked.product?.brand && (
                                <p className="text-xs text-muted-foreground mb-1">{tracked.product.brand}</p>
                              )}
                              {tracked.target_price_bgn && (
                                <p className="text-xs text-primary mb-1">
                                  Целева цена: {tracked.target_price_bgn.toFixed(2)} лв.
                                </p>
                              )}
                              {tracked.latest_price ? (
                                <div>
                                  <p className="text-sm font-bold text-green-600">
                                    {tracked.latest_price.price.toFixed(2)} лв.
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {tracked.latest_price.supermarket_name}
                                  </p>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">Няма данни за цена</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Enhanced Empty State */}
        {(favoriteProducts.length === 0 && trackedProducts.length === 0) && (
          <Card className="mt-8 glass-card shadow-soft border-white/30 animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3 icon-bounce">
                  <Eye className="h-4 w-4 text-white" />
                </div>
                Започнете да пестите
              </CardTitle>
              <CardDescription className="text-gray-600">
                Открийте как да следите цени и да пестите пари
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-full flex items-center justify-center mx-auto mb-6 float">
                  <ShoppingCart className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Добре дошли в PriceTrack!
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Започнете да следите продукти, за да получавате известия за промени в цените и да пестите пари при пазаруване.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/bg/products">
                    <Button className="btn-primary-hover">
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Разгледайте продукти
                    </Button>
                  </Link>
                  <Link href="/bg/products/new">
                    <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                      Добавете продукт
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Quick Links for Active Users */}
        {(favoriteProducts.length > 0 || trackedProducts.length > 0) && (
          <Card className="mt-8 glass-card shadow-soft border-white/30 animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mr-3 icon-rotate">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                Полезни връзки
              </CardTitle>
              <CardDescription className="text-gray-600">
                Бързи връзки към важни секции
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link href="/bg/notifications" className="group flex flex-col items-center p-6 rounded-xl bg-white/60 backdrop-blur-sm border border-white/20 hover:bg-white/80 hover:shadow-medium transition-all duration-300 interactive-scale">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Bell className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 mb-1">Известия</span>
                  <span className="text-xs text-gray-500">Ценови алерти</span>
                </Link>
                <Link href="/bg/discussions" className="group flex flex-col items-center p-6 rounded-xl bg-white/60 backdrop-blur-sm border border-white/20 hover:bg-white/80 hover:shadow-medium transition-all duration-300 interactive-scale">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <MessageCircle className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 mb-1">Дискусии</span>
                  <span className="text-xs text-gray-500">Общност</span>
                </Link>
                {userProfile?.username ? (
                  <Link href={`/bg/profile/${userProfile.username}`} className="group flex flex-col items-center p-6 rounded-xl bg-white/60 backdrop-blur-sm border border-white/20 hover:bg-white/80 hover:shadow-medium transition-all duration-300 interactive-scale">
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 mb-1">Профил</span>
                    <span className="text-xs text-gray-500">Настройки</span>
                  </Link>
                ) : (
                  <Link href="/bg/settings" className="group flex flex-col items-center p-6 rounded-xl bg-white/60 backdrop-blur-sm border border-white/20 hover:bg-white/80 hover:shadow-medium transition-all duration-300 interactive-scale">
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 mb-1">Профил</span>
                    <span className="text-xs text-gray-500">Настройки</span>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  )
}
