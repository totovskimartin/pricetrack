'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { findProductBySlugOrId, getProductUrl } from '@/lib/slug-utils'
import { useAuth } from '@/components/providers/auth-provider'
import { useFavorites } from '@/hooks/use-favorites'
import { usePriceTracking } from '@/hooks/use-price-tracking'
import { TargetPriceModal } from '@/components/product/target-price-modal'
import { PriceStatistics } from '@/components/product/price-statistics'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft, Heart, MessageCircle, TrendingUp, TrendingDown,
  Eye, Share2, Bell, BellOff, Calendar, MapPin, Send, DollarSign, Plus, ShoppingCart
} from 'lucide-react'
import { PriceChart } from '@/components/products/price-chart'
import { DiscussionSection } from '@/components/products/discussion-section'
import { PriceComparison } from '@/components/products/price-comparison'
import { SimpleCommentsSection } from '@/components/product/simple-comments-section'
import { EnhancedPriceChart } from '@/components/product/enhanced-price-chart'

import { PriceSuggestionModal } from '@/components/product/price-suggestion-modal'

interface Product {
  id: string
  name: string
  description: string
  category: string
  brand: string
  image_url: string
  created_at: string
  price_entries: Array<{
    id: string
    price: number
    currency: string
    supermarket: {
      id: string
      name: string
      logo_url: string
      location: string
    }
    recorded_at: string
  }>
}

interface UserProduct {
  id: string
  is_tracking: boolean
  is_favorite: boolean
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toggleFavorite: toggleFavoriteHook, isFavorite, refetchFavorites } = useFavorites()
  const { toggleTracking, isTracking, refetch: refetchTracking } = usePriceTracking()

  // Category translations
  const categoryTranslations: Record<string, string> = {
    'Bread and Bakery': 'Хлебни изделия',
    'Dairy Products': 'Млечни продукти',
    'Fruits and Vegetables': 'Плодове и зеленчуци',
    'Meat and Fish': 'Месо и риба',
    'Beverages': 'Напитки',
    'Snacks': 'Закуски',
    'Frozen Foods': 'Замразени храни',
    'Household': 'Домакински стоки',
    'Personal Care': 'Лична хигиена',
    'Other': 'Други'
  }

  const translateCategory = (category: string) => {
    return categoryTranslations[category] || category
  }

  // Currency conversion (approximate rate: 1 EUR = 1.96 BGN)
  const BGN_TO_EUR_RATE = 0.51

  const formatPriceWithEUR = (priceBGN: number) => {
    const priceEUR = priceBGN * BGN_TO_EUR_RATE
    return {
      bgn: `${priceBGN.toFixed(2)} лв.`,
      eur: `€${priceEUR.toFixed(2)}`
    }
  }
  const [product, setProduct] = useState<Product | null>(null)
  const [userProduct, setUserProduct] = useState<UserProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [forceUpdate, setForceUpdate] = useState(0)
  const [showTargetPriceModal, setShowTargetPriceModal] = useState(false)
  const [showPriceSuggestionModal, setShowPriceSuggestionModal] = useState(false)

  // Simple comment count state
  const [commentCount, setCommentCount] = useState(0)
  const [commentsTableExists, setCommentsTableExists] = useState(true)

  // Get product ID
  const productId = params.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : null

  // Fetch comment count on page load
  useEffect(() => {
    if (productId) {
      fetchCommentCount()
    }
  }, [productId])

  const fetchCommentCount = async () => {
    if (!productId) return

    try {
      const { getProductCommentCount, checkCommentsTableExists } = await import('@/lib/comments')

      // Check if table exists
      const tableExists = await checkCommentsTableExists()
      setCommentsTableExists(tableExists)

      if (!tableExists) {
        setCommentCount(0)
        return
      }

      // Get comment count
      const count = await getProductCommentCount(productId)
      setCommentCount(count)
    } catch (error) {
      console.error('Error fetching comment count:', error)
      setCommentCount(0)
      setCommentsTableExists(false)
    }
  }

  useEffect(() => {
    if (params.id) {
      const productId = Array.isArray(params.id) ? params.id[0] : params.id
      fetchProduct()
      if (user) {
        fetchUserProduct()
      }
    }
  }, [params.id, user])



  // Update user product when favorites change
  useEffect(() => {
    if (user && params.id) {
      const productId = Array.isArray(params.id) ? params.id[0] : params.id
      if (productId) {
        const currentFavoriteStatus = isFavorite(productId)
        setUserProduct(prev => ({
          id: prev?.id || `local_${productId}`,
          is_tracking: prev?.is_tracking || false,
          is_favorite: currentFavoriteStatus
        }))
      }
    }
  }, [user, params.id, isFavorite])

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  const fetchProduct = async () => {
    if (!params.id) return

    try {
      // Use the new slug-based lookup
      const productId = Array.isArray(params.id) ? params.id[0] : params.id
      if (!productId) return

      const productData = await findProductBySlugOrId(productId, supabase)

      if (!productData) {
        setProduct(null)
        setLoading(false)
        return
      }

      // Then get the prices with supermarket info
      const { data: pricesData, error: pricesError } = await supabase
        .from('prices')
        .select(`
          id,
          price_bgn,
          price_eur,
          created_at,
          supermarket_id,
          supermarkets (
            id,
            name,
            logo_url
          )
        `)
        .eq('product_id', productData.id)
        .order('created_at', { ascending: false })

      const data = {
        ...productData,
        prices: pricesData || []
      }

      const error = pricesError

      if (error) {
        setProduct(null)
        setLoading(false)
        return
      }

      if (!data) {
        setProduct(null)
        setLoading(false)
        return
      }

      // Transform the data to match our expected format
      const transformedProduct = {
        ...data,
        price_entries: data.prices?.map((price: {
          id: string
          price_bgn: number
          price_eur: number | null
          created_at: string
          supermarket_id: string
          supermarkets?: {
            id: string
            name: string
            logo_url: string | null
          } | null
        }) => ({
          id: price.id,
          price: price.price_bgn,
          currency: 'BGN' as const,
          recorded_at: price.created_at,
          supermarket: {
            id: price.supermarkets?.id || '',
            name: price.supermarkets?.name || '',
            logo_url: price.supermarkets?.logo_url || '',
            location: '' // Location not available in current schema
          }
        })) || []
      }

      setProduct(transformedProduct)
    } catch (error) {
      setProduct(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserProduct = async () => {
    if (!user || !params.id) {
      setUserProduct(null)
      return
    }

    try {
      const productId = Array.isArray(params.id) ? params.id[0] : params.id
      if (!productId) {
        setUserProduct(null)
        return
      }

      // Use the favorites hook to check if product is favorited
      setUserProduct({
        id: `local_${productId}`,
        is_tracking: false, // We'll implement this later
        is_favorite: isFavorite(productId)
      })
    } catch (error) {
      // Handle error silently
      setUserProduct(null)
    }
  }

  const handleCommentCountChange = (count: number) => {
    // Update comment count immediately
    setCommentCount(count)
  }



  const handleTrackingClick = async () => {
    if (!user || !product) {
      router.push('/bg/login')
      return
    }

    // Show modal to set/update target price
    setShowTargetPriceModal(true)
  }

  const handleTargetPriceConfirm = async (targetPrice?: number) => {
    if (!user || !product) return

    setActionLoading(true)

    try {
      const wasToggled = await toggleTracking(product.id, targetPrice)

      if (wasToggled) {
        // Refresh tracking state
        await refetchTracking()

        // Update local state
        setUserProduct(prev => ({
          id: prev?.id || `local_${product.id}`,
          is_tracking: isTracking(product.id),
          is_favorite: prev?.is_favorite || false
        }))

        // Show success message
        if (isTracking(product.id)) {
          setSuccessMessage('Следенето на цената е активирано!')
        } else {
          setSuccessMessage('Следенето на цената е спряно!')
        }
      }
    } catch (error) {
      setSuccessMessage('Възникна грешка при обновяването на следенето')
    } finally {
      setActionLoading(false)
    }
  }

  const toggleFavorite = async () => {
    if (!user || !product) {
      router.push('/bg/login')
      return
    }

    setActionLoading(true)
    const wasFavorite = isFavorite(product.id)

    try {
      // Optimistically update the UI first
      setUserProduct(prev => ({
        id: prev?.id || `local_${product.id}`,
        is_tracking: prev?.is_tracking || false,
        is_favorite: !wasFavorite
      }))

      // Then perform the actual toggle
      const wasToggled = await toggleFavoriteHook(product.id)

      if (wasToggled) {
        // Refresh favorites to sync state
        await refetchFavorites()

        // Show success message
        if (!wasFavorite) {
          setSuccessMessage('Продуктът е добавен в любими!')
        } else {
          setSuccessMessage('Продуктът е премахнат от любими!')
        }
      } else {
        // Revert optimistic update if toggle failed
        setUserProduct(prev => ({
          id: prev?.id || `local_${product.id}`,
          is_tracking: prev?.is_tracking || false,
          is_favorite: wasFavorite
        }))
      }
    } catch (error) {
      // Revert optimistic update on error
      setUserProduct(prev => ({
        id: prev?.id || `local_${product.id}`,
        is_tracking: prev?.is_tracking || false,
        is_favorite: wasFavorite
      }))
      setSuccessMessage('Възникна грешка при обновяването на любимите продукти')
    } finally {
      setActionLoading(false)
    }
  }

  const shareProduct = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name,
          text: `Проверете цената на ${product?.name} в PriceTrack България`,
          url: window.location.href,
        })
      } catch (error) {
        console.log('Error sharing:', error)
      }
    } else {
      // Fallback to copying URL
      navigator.clipboard.writeText(window.location.href)
      // You could show a toast notification here
    }
  }

  const getLatestPrice = () => {
    if (!product?.price_entries || product.price_entries.length === 0) {
      return null
    }

    return product.price_entries.reduce((latest, entry) => {
      return new Date(entry.recorded_at) > new Date(latest.recorded_at) ? entry : latest
    })
  }



  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Зареждане на продукта...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Влезте в профила си</h1>
          <p className="text-gray-600 mb-4">За да видите продуктите, моля влезте в профила си.</p>
          <Link href="/bg/login">
            <Button>Вход</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">❌</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              Продуктът не е намерен
            </h3>
            <p className="text-gray-500 mb-6">
              Продуктът, който търсите, не съществува или е премахнат.
            </p>
            <Link href="/bg/products">
              <Button>Назад към продуктите</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const latestPrice = getLatestPrice()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Success Message Toast */}
      {successMessage && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-green-500 text-white px-6 py-4 rounded-xl shadow-xl border border-green-400 flex items-center space-x-3 min-w-max max-w-md">
            <div className="text-xl">✅</div>
            <span className="font-medium whitespace-nowrap text-sm">{successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              className="ml-2 text-white hover:text-green-200 transition-colors text-lg font-bold"
              title="Затвори"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex items-center space-x-4">
              <Link href="/bg/products" className="flex items-center text-blue-600 hover:text-blue-700 cursor-pointer">
                <ArrowLeft className="h-5 w-5 mr-2" />
                <span className="hidden sm:inline">Назад към продуктите</span>
                <span className="sm:hidden">Назад</span>
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={shareProduct}
                className="cursor-pointer"
              >
                <Share2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Споделяне</span>
              </Button>
              {user && (
                <>
                  <Button
                    variant={(userProduct?.is_favorite || isFavorite(product.id)) ? "default" : "outline"}
                    size="sm"
                    onClick={toggleFavorite}
                    disabled={actionLoading}
                    className="cursor-pointer"
                  >
                    <Heart className={`h-4 w-4 sm:mr-2 ${(userProduct?.is_favorite || isFavorite(product.id)) ? 'fill-current' : ''}`} />
                    <span className="hidden sm:inline">
                      {(userProduct?.is_favorite || isFavorite(product.id)) ? 'Премахни от любими' : 'Добави в любими'}
                    </span>
                  </Button>
                  <Button
                    variant={(userProduct?.is_tracking || isTracking(product.id)) ? "default" : "outline"}
                    size="sm"
                    onClick={handleTrackingClick}
                    disabled={actionLoading}
                    className="cursor-pointer"
                  >
                    {(userProduct?.is_tracking || isTracking(product.id)) ? (
                      <BellOff className="h-4 w-4 sm:mr-2" />
                    ) : (
                      <Bell className="h-4 w-4 sm:mr-2" />
                    )}
                    <span className="hidden sm:inline">
                      {(userProduct?.is_tracking || isTracking(product.id)) ? 'Спри следенето' : 'Следи цената'}
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPriceSuggestionModal(true)}
                    className="cursor-pointer"
                  >
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Добави цена</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 lg:py-8">
        {/* Main Product Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-8">
          {/* Product Image - Smaller */}
          <div className="md:col-span-1 lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-48 sm:h-56 object-contain p-4"
                />
              ) : (
                <div className="w-full h-48 sm:h-56 flex items-center justify-center bg-gray-50">
                  <div className="text-gray-400 text-4xl">📦</div>
                </div>
              )}
            </div>
          </div>

          {/* Product Info - 2 columns */}
          <div className="md:col-span-1 lg:col-span-2">
            {/* Product Header */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{translateCategory(product.category)}</Badge>
                {product.brand && (
                  <Badge variant="secondary" className="text-xs">{product.brand}</Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                {product.name}
              </h1>
              {product.description && (
                <p className="text-gray-600 text-sm leading-relaxed">
                  {product.description}
                </p>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-gray-900">
                  {product.price_entries.length}
                </div>
                <div className="text-xs text-gray-600">Записани цени</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-gray-900">
                  {Array.from(new Set(product.price_entries.map(p => p.supermarket.id))).length}
                </div>
                <div className="text-xs text-gray-600">Магазина</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-gray-900">
                  {latestPrice ? new Date(latestPrice.recorded_at).toLocaleDateString('bg-BG') : 'N/A'}
                </div>
                <div className="text-xs text-gray-600">Последно обновяване</div>
              </div>
            </div>
          </div>

          {/* Current Price - Compact */}
          <div className="md:col-span-2 lg:col-span-1">
            {latestPrice && (
              <Card className="h-fit">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    💰 Най-добра цена
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {formatPriceWithEUR(latestPrice.price).bgn}
                    </div>
                    <div className="text-sm text-gray-500 mb-3">
                      {formatPriceWithEUR(latestPrice.price).eur}
                    </div>
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      {latestPrice.supermarket.logo_url && (
                        <img
                          src={latestPrice.supermarket.logo_url}
                          alt={latestPrice.supermarket.name}
                          className="w-5 h-5 object-contain"
                        />
                      )}
                      <span className="font-medium text-sm">{latestPrice.supermarket.name}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(latestPrice.recorded_at).toLocaleDateString('bg-BG')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Organized Tabbed Content */}
        <div className="mb-8">
          <Tabs defaultValue="charts" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-auto">
              <TabsTrigger value="charts" className="text-xs sm:text-sm py-2">
                <span className="hidden sm:inline">📈 Графики</span>
                <span className="sm:hidden">📈</span>
              </TabsTrigger>
              <TabsTrigger value="prices" className="text-xs sm:text-sm py-2">
                <span className="hidden sm:inline">💰 Цени</span>
                <span className="sm:hidden">💰</span>
              </TabsTrigger>
              <TabsTrigger value="comments" className="text-xs sm:text-sm py-2">
                <span className="hidden sm:inline">
                  💬 Коментари {commentCount > 0 && `(${commentCount})`}
                  {!commentsTableExists && <span className="text-red-500 text-xs ml-1">⚠️</span>}
                </span>
                <span className="sm:hidden">
                  💬 {commentCount > 0 && `(${commentCount})`}
                  {!commentsTableExists && <span className="text-red-500 text-xs ml-1">⚠️</span>}
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="charts" className="mt-6">
              <EnhancedPriceChart product={product} />
            </TabsContent>

            <TabsContent value="prices" className="mt-6">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <PriceStatistics product={product} />
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      🏪 Сравнение между магазини
                    </CardTitle>
                    <CardDescription>
                      Сравнете цените в различните супермаркети
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PriceComparison product={product} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="comments" className="mt-6">
              {!commentsTableExists && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-yellow-600 text-lg mr-2">⚠️</span>
                    <div>
                      <h4 className="font-semibold text-yellow-800">Системата за коментари не е активирана</h4>
                      <p className="text-yellow-700 text-sm mt-1">
                        Моля, изпълнете SQL миграцията: <code className="bg-yellow-100 px-1 rounded">021_simple_comments_system_fixed.sql</code>
                      </p>
                      <p className="text-yellow-700 text-sm mt-1">
                        Или посетете <a href="/bg/test-comments" className="underline text-yellow-800 hover:text-yellow-900">/bg/test-comments</a> за инструкции.
                      </p>
                    </div>
                  </div>
                </div>
              )}



              <SimpleCommentsSection
                productId={product.id}
                onCommentCountChange={handleCommentCountChange}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Target Price Modal */}
      <TargetPriceModal
        isOpen={showTargetPriceModal}
        onClose={() => setShowTargetPriceModal(false)}
        onConfirm={handleTargetPriceConfirm}
        productName={product.name}
        currentPrice={latestPrice?.price || 0}
        isTracking={isTracking(product.id)}
      />

      {/* Price Suggestion Modal */}
      <PriceSuggestionModal
        isOpen={showPriceSuggestionModal}
        onClose={() => setShowPriceSuggestionModal(false)}
        productId={product.id}
        productName={product.name}
        currentPrices={product.price_entries?.map(price => ({
          supermarket_id: price.supermarket.id,
          price_bgn: price.price,
          supermarket: { name: price.supermarket.name || '' }
        })) || []}
        onSuccess={() => {
          setSuccessMessage('Предложението за цена е изпратено успешно!')
          fetchProduct() // Refresh product data
        }}
      />
    </div>
  )
}
