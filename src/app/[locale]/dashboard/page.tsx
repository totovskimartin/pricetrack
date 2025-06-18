'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getProductUrl } from '@/lib/slug-utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { User, LogOut, TrendingUp, ShoppingCart, Heart, Eye, Bell, Newspaper } from 'lucide-react'
import { useFavorites } from '@/hooks/use-favorites'
import { usePriceTracking } from '@/hooks/use-price-tracking'
import { useAuth } from '@/components/providers/auth-provider'
import { AuthGuard } from '@/components/auth/auth-guard'
import Link from 'next/link'

function DashboardContent() {
  const { user } = useAuth()
  const router = useRouter()
  const { favoriteProducts, loading: favoritesLoading } = useFavorites()
  const { trackedProducts, loading: trackingLoading } = usePriceTracking()
  const [news, setNews] = useState<any[]>([])
  const [newsLoading, setNewsLoading] = useState(true)

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

  useEffect(() => {
    fetchNews()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/bg')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto pl-16 pr-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Табло</h1>
              <p className="text-gray-600">
                Добре дошли, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Потребител'}!
              </p>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Активен
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <p className="text-gray-600 text-lg">
            Управлявайте вашите проследявани продукти и следете промените в цените.
          </p>
        </div>

        {/* Useful Information Section - Moved to top */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
          {/* Getting Started Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
                Как да започнете
              </CardTitle>
              <CardDescription>
                Полезни съвети за проследяване на цени
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">1</div>
                  <div>
                    <p className="text-sm font-medium">Намерете продукти</p>
                    <p className="text-xs text-gray-500">Търсете в нашата база от хиляди продукти</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">2</div>
                  <div>
                    <p className="text-sm font-medium">Добавете в любими</p>
                    <p className="text-xs text-gray-500">Запазете продукти за бързо сравнение</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">3</div>
                  <div>
                    <p className="text-sm font-medium">Следете цените</p>
                    <p className="text-xs text-gray-500">Получавайте известия при промени</p>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t">
                <Link href="/bg/products" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                  Започнете сега →
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Latest News */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Newspaper className="h-5 w-5 mr-2 text-green-500" />
                Последни новини
              </CardTitle>
              <CardDescription>
                Актуална информация и обновления
              </CardDescription>
            </CardHeader>
            <CardContent>
              {newsLoading ? (
                <div className="text-center py-4">
                  <p className="text-gray-500">Зареждане на новини...</p>
                </div>
              ) : news.length > 0 ? (
                <div className="space-y-4">
                  {news.map((newsItem) => (
                    <div
                      key={newsItem.id}
                      className={`border-l-4 border-${newsItem.border_color}-400 pl-4`}
                    >
                      <h4 className={`font-semibold text-${newsItem.text_color}-800`}>
                        {newsItem.title}
                      </h4>
                      <p className={`text-sm text-${newsItem.text_color}-700 mt-1`}>
                        {newsItem.content}
                      </p>
                      {newsItem.published_at && (
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(newsItem.published_at).toLocaleDateString('bg-BG')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">Няма налични новини в момента</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Favorite Products */}
        {favoriteProducts.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Heart className="h-5 w-5 mr-2 text-red-500" />
                Любими продукти ({favoriteProducts.length})
              </CardTitle>
              <CardDescription>
                Вашите запазени продукти за бързо сравнение
              </CardDescription>
            </CardHeader>
            <CardContent>
              {favoritesLoading ? (
                <div className="text-center py-4">
                  <p className="text-gray-500">Зареждане на любими продукти...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {favoriteProducts.map((product) => (
                    <Link key={product.id} href={getProductUrl(product, 'bg')}>
                      <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <div className="text-gray-400 text-lg">📦</div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm line-clamp-2 mb-1">
                                {product.name}
                              </h4>
                              {product.brand && (
                                <p className="text-xs text-gray-500 mb-1">{product.brand}</p>
                              )}
                              {product.latest_price ? (
                                <div>
                                  <p className="text-sm font-bold text-green-600">
                                    {product.latest_price.price.toFixed(2)} лв.
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {product.latest_price.supermarket_name}
                                  </p>
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500">Няма данни за цена</p>
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
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2 text-blue-500" />
                Следени продукти ({trackedProducts.length})
              </CardTitle>
              <CardDescription>
                Продукти за които получавате известия при промяна на цената
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trackingLoading ? (
                <div className="text-center py-4">
                  <p className="text-gray-500">Зареждане на следени продукти...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {trackedProducts.map((tracked) => (
                    <Link key={tracked.id} href={getProductUrl({
                      id: tracked.product_id,
                      name: tracked.product?.name || 'Product',
                      brand: tracked.product?.brand
                    }, 'bg')}>
                      <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                              {tracked.product?.image_url ? (
                                <img
                                  src={tracked.product.image_url}
                                  alt={tracked.product.name}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <div className="text-gray-400 text-lg">📦</div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm line-clamp-2 mb-1">
                                {tracked.product?.name || 'Неизвестен продукт'}
                              </h4>
                              {tracked.product?.brand && (
                                <p className="text-xs text-gray-500 mb-1">{tracked.product.brand}</p>
                              )}
                              {tracked.target_price_bgn && (
                                <p className="text-xs text-blue-600 mb-1">
                                  Целева цена: {tracked.target_price_bgn.toFixed(2)} лв.
                                </p>
                              )}
                              {tracked.latest_price ? (
                                <div>
                                  <p className="text-sm font-bold text-green-600">
                                    {tracked.latest_price.price.toFixed(2)} лв.
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {tracked.latest_price.supermarket_name}
                                  </p>
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500">Няма данни за цена</p>
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

        {/* Additional Useful Information */}
        {(favoriteProducts.length === 0 && trackedProducts.length === 0) && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="h-5 w-5 mr-2 text-green-500" />
                Започнете да пестите
              </CardTitle>
              <CardDescription>
                Открийте как да следите цени и да пестите пари
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Започнете да следите продукти, за да видите персонализирани препоръки</p>
                <Link href="/bg/products">
                  <Button>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Разгледайте продукти
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Links for Active Users */}
        {(favoriteProducts.length > 0 || trackedProducts.length > 0) && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-purple-500" />
                Полезни връзки
              </CardTitle>
              <CardDescription>
                Бързи връзки към важни секции
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/bg/notifications" className="flex flex-col items-center p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                  <Bell className="h-8 w-8 text-blue-500 mb-2" />
                  <span className="text-sm font-medium text-center">Известия</span>
                  <span className="text-xs text-gray-500 text-center">Ценови алерти</span>
                </Link>
                <Link href="/bg/discussions" className="flex flex-col items-center p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                  <User className="h-8 w-8 text-green-500 mb-2" />
                  <span className="text-sm font-medium text-center">Дискусии</span>
                  <span className="text-xs text-gray-500 text-center">Общност</span>
                </Link>
                <Link href="/bg/supermarkets" className="flex flex-col items-center p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                  <ShoppingCart className="h-8 w-8 text-orange-500 mb-2" />
                  <span className="text-sm font-medium text-center">Супермаркети</span>
                  <span className="text-xs text-gray-500 text-center">Магазини</span>
                </Link>
                <Link href="/bg/settings" className="flex flex-col items-center p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                  <User className="h-8 w-8 text-gray-500 mb-2" />
                  <span className="text-sm font-medium text-center">Настройки</span>
                  <span className="text-xs text-gray-500 text-center">Профил</span>
                </Link>
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
