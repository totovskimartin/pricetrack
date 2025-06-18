'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getProductUrl } from '@/lib/slug-utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Filter, TrendingUp, TrendingDown, Minus, MessageCircle, Heart, Eye, Plus, Grid, List } from 'lucide-react'
import { MultiSelect } from '@/components/ui/multi-select'
import { useProductListStats } from '@/hooks/use-product-stats'
import { useAuth } from '@/components/providers/auth-provider'

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
      name: string
      logo_url: string
    }
    recorded_at: string
  }>
  _count: {
    discussions: number
    user_products: number
  }
}

interface Supermarket {
  id: string
  name: string
  logo_url: string
}

export default function ProductsPage() {
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedSupermarkets, setSelectedSupermarkets] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('name')
  const [viewMode, setViewMode] = useState<'grid' | 'sheet'>('sheet')
  const router = useRouter()
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const { user } = useAuth()

  // Get product IDs for stats
  const productIds = allProducts.map(p => p.id)
  const { getProductStats, refresh: refreshStats } = useProductListStats(productIds)

  // Refresh stats when page becomes visible (to catch changes from other tabs)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && productIds.length > 0) {
        refreshStats()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [productIds.length, refreshStats])

  const categories = [
    'all', 'Хранителни стоки', 'Напитки', 'Месо и риба', 'Плодове и зеленчуци',
    'Млечни продукти', 'Хлебни изделия', 'Замразени продукти', 'Консерви',
    'Сладкарски изделия', 'Бебешки продукти', 'Домакински продукти', 'Козметика'
  ]

  // Real supermarkets data from Supabase
  const [supermarkets, setSupermarkets] = useState<Supermarket[]>([])

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

  // Fetch real data from Supabase
  const fetchSupermarkets = async () => {
    try {
      const { data, error } = await supabase
        .from('supermarkets')
        .select('id, name, logo_url')
        .eq('is_active', true)
        .order('name')

      if (error) {
        return
      }

      setSupermarkets(data || [])
    } catch (error) {
      // Handle error silently
    }
  }

  const fetchProducts = async () => {
    try {
      // Get products first
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          category,
          brand,
          image_url,
          created_at,
          is_approved
        `)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(50)

      if (productsError || !productsData) {
        setAllProducts([])
        return
      }

      // Get prices for all products
      const productIds = productsData.map(p => p.id)
      const { data: pricesData } = await supabase
        .from('prices')
        .select(`
          id,
          product_id,
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
        .in('product_id', productIds)
        .order('created_at', { ascending: false })

      // Transform the data to match our expected format
      const transformedProducts = productsData.map(product => {
        const productPrices = pricesData?.filter(price => price.product_id === product.id) || []

        return {
          ...product,
          price_entries: productPrices.map((price: any) => ({
            id: price.id,
            price: price.price_bgn,
            currency: 'BGN' as const,
            recorded_at: price.created_at,
            supermarket: {
              name: price.supermarkets?.name || '',
              logo_url: price.supermarkets?.logo_url || ''
            }
          })),
          _count: {
            discussions: 0, // We'll add this later
            user_products: 0 // We'll add this later
          }
        }
      })

      setAllProducts(transformedProducts)
    } catch (error) {
      // Handle error silently
    }
  }

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      try {
        await Promise.all([
          fetchSupermarkets(),
          fetchProducts()
        ])
      } catch (error) {
        // Handle error silently
      } finally {
        setLoading(false)
      }
    }

    initializeData()
  }, [])

  // Filter and sort products using useMemo to prevent infinite loops
  const products = useMemo(() => {
    let filteredProducts = [...allProducts]

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filteredProducts = filteredProducts.filter(product =>
        product.name.toLowerCase().includes(searchLower) ||
        (product.description && product.description.toLowerCase().includes(searchLower)) ||
        (product.brand && product.brand.toLowerCase().includes(searchLower))
      )
    }

    // Apply category filter
    if (selectedCategories.length > 0) {
      filteredProducts = filteredProducts.filter(product =>
        selectedCategories.includes(product.category)
      )
    }

    // Apply supermarket filter
    if (selectedSupermarkets.length > 0) {
      filteredProducts = filteredProducts.filter(product =>
        product.price_entries.some(entry =>
          selectedSupermarkets.some(supermarketId => {
            const supermarketData = supermarkets.find(s => s.id === supermarketId)
            return supermarketData && entry.supermarket.name === supermarketData.name
          })
        )
      )
    }

    // Apply sorting
    switch (sortBy) {
      case 'name':
        filteredProducts.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'newest':
        filteredProducts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'discussions':
        filteredProducts.sort((a, b) => b._count.discussions - a._count.discussions)
        break
      case 'tracked':
        filteredProducts.sort((a, b) => b._count.user_products - a._count.user_products)
        break
    }

    return filteredProducts
  }, [allProducts, searchTerm, selectedCategories, selectedSupermarkets, sortBy, supermarkets])



  const getLatestPrice = (product: Product) => {
    if (!product.price_entries || product.price_entries.length === 0) {
      return null
    }

    const latest = product.price_entries.reduce((latest, entry) => {
      return new Date(entry.recorded_at) > new Date(latest.recorded_at) ? entry : latest
    })

    return latest
  }

  const getPriceChange = (product: Product) => {
    if (!product.price_entries || product.price_entries.length < 2) {
      return null
    }

    const sorted = product.price_entries.sort((a, b) => 
      new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
    )

    const latest = sorted[0]
    const previous = sorted[1]

    if (latest.price > previous.price) {
      return { type: 'increase', percentage: ((latest.price - previous.price) / previous.price * 100).toFixed(1) }
    } else if (latest.price < previous.price) {
      return { type: 'decrease', percentage: ((previous.price - latest.price) / previous.price * 100).toFixed(1) }
    }

    return { type: 'same', percentage: '0' }
  }

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'BGN') {
      return `${price.toFixed(2)} лв.`
    } else if (currency === 'EUR') {
      return `€${price.toFixed(2)}`
    }
    return `${price.toFixed(2)} ${currency}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Зареждане на продуктите...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto pl-16 pr-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Продукти</h1>
            <p className="text-gray-600">Търсете и сравнявайте цени на продукти</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Търсете продукти по име, марка или описание..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex flex-col sm:flex-row gap-2 flex-1">
                <MultiSelect
                  options={categories.filter(cat => cat !== 'all').map(category => ({
                    label: translateCategory(category),
                    value: category
                  }))}
                  selected={selectedCategories}
                  onChange={setSelectedCategories}
                  placeholder="Категории"
                  className="w-full sm:w-48"
                />

                <MultiSelect
                  options={supermarkets.map(supermarket => ({
                    label: supermarket.name,
                    value: supermarket.id
                  }))}
                  selected={selectedSupermarkets}
                  onChange={setSelectedSupermarkets}
                  placeholder="Супермаркети"
                  className="w-full sm:w-48"
                />

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Сортиране" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">По име</SelectItem>
                    <SelectItem value="newest">Най-нови</SelectItem>
                    <SelectItem value="discussions">Най-обсъждани</SelectItem>
                    <SelectItem value="tracked">Най-следени</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center border rounded-lg p-1 bg-white w-full sm:w-auto">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-8 px-3 flex-1 sm:flex-none"
                >
                  <Grid className="h-4 w-4 mr-1" />
                  Карти
                </Button>
                <Button
                  variant={viewMode === 'sheet' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('sheet')}
                  className="h-8 px-3 flex-1 sm:flex-none"
                >
                  <List className="h-4 w-4 mr-1" />
                  Таблица
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Product Count and Add Button */}
        <div className="flex items-center justify-between mb-6">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            {products.length} продукта
          </Badge>
          {user && (
            <Link href="/bg/products/new">
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Добави продукт
              </Button>
            </Link>
          )}
        </div>

        {/* Products Display */}
        {viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {products.map((product) => {
              const latestPrice = getLatestPrice(product)
              const priceChange = getPriceChange(product)

              return (
                <Card key={product.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <Link href={getProductUrl(product, 'bg')}>
                    <CardHeader className="pb-1 p-2">
                      <div className="aspect-square bg-gray-100 rounded-md mb-1 flex items-center justify-center">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover rounded-md"
                          />
                        ) : (
                          <div className="text-gray-400 text-lg">📦</div>
                        )}
                      </div>
                      <CardTitle className="text-xs line-clamp-2 leading-tight">{product.name}</CardTitle>
                      <CardDescription className="line-clamp-1 text-xs">
                        {product.brand && <span className="font-medium">{product.brand}</span>}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-2 pt-0">
                      <div className="space-y-1">
                        {/* Price */}
                        {latestPrice ? (
                          <div>
                            <div className="text-sm font-bold text-green-600">
                              {formatPriceWithEUR(latestPrice.price).bgn}
                            </div>
                            <div className="text-xs text-gray-500 mb-0.5">
                              {formatPriceWithEUR(latestPrice.price).eur}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center justify-between">
                              <span className="truncate">{latestPrice.supermarket.name}</span>
                              {priceChange && priceChange.type !== 'same' && (
                                <div className={`flex items-center text-xs ${
                                  priceChange.type === 'increase' ? 'text-red-500' : 'text-green-500'
                                }`}>
                                  {priceChange.type === 'increase' ? (
                                    <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                                  ) : (
                                    <TrendingDown className="h-2.5 w-2.5 mr-0.5" />
                                  )}
                                  {priceChange.percentage}%
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-gray-500 text-xs">Няма данни за цена</div>
                        )}

                        {/* Category */}
                        <Badge variant="outline" className="text-xs py-0 px-1 h-4">
                          {translateCategory(product.category)}
                        </Badge>

                        {/* Stats */}
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center space-x-1.5">
                            <div className="flex items-center">
                              <MessageCircle className="h-2.5 w-2.5 mr-0.5" />
                              {getProductStats(product.id).comments_count}
                            </div>
                            <div className="flex items-center">
                              <Heart className="h-2.5 w-2.5 mr-0.5" />
                              {getProductStats(product.id).favorites_count}
                            </div>
                            <div className="flex items-center">
                              <Eye className="h-2.5 w-2.5 mr-0.5" />
                              {getProductStats(product.id).tracking_count}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              )
            })}
          </div>
        ) : (
          /* Sheet View */
          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full table-auto responsive-table-custom">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-2 sm:px-4 font-medium text-gray-900">Продукт</th>
                    <th className="text-left py-3 px-2 sm:px-4 font-medium text-gray-900 hidden sm:table-cell">Марка</th>
                    <th className="text-left py-3 px-2 sm:px-4 font-medium text-gray-900 hidden md:table-cell">Категория</th>
                    <th className="text-left py-3 px-2 sm:px-4 font-medium text-gray-900">Цена</th>
                    <th className="text-left py-3 px-2 sm:px-4 font-medium text-gray-900 hidden lg:table-cell">Супермаркет</th>
                    <th className="text-center py-3 px-2 sm:px-4 font-medium text-gray-900 hidden xl:table-cell">Статистики</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {products.map((product) => {
                    const latestPrice = getLatestPrice(product)
                    const priceChange = getPriceChange(product)
                    const stats = getProductStats(product.id)

                    return (
                      <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-2 sm:px-4">
                          <Link href={getProductUrl(product, 'bg')} className="flex items-center space-x-2 sm:space-x-3 hover:text-blue-600">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-md flex items-center justify-center flex-shrink-0">
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="w-full h-full object-cover rounded-md"
                                />
                              ) : (
                                <div className="text-gray-400 text-sm sm:text-lg">📦</div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-gray-900 truncate text-sm sm:text-base">{product.name}</div>
                              <div className="text-xs sm:text-sm text-gray-500">
                                <span className="sm:hidden">{product.brand || 'Без марка'}</span>
                                <span className="hidden sm:inline">ID: {product.id.split('-')[0]}</span>
                              </div>
                              <div className="text-xs text-gray-500 md:hidden">
                                <Badge variant="outline" className="text-xs mt-1">
                                  {translateCategory(product.category)}
                                </Badge>
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="py-3 px-2 sm:px-4 hidden sm:table-cell">
                          <span className="text-gray-900 text-sm">{product.brand || '-'}</span>
                        </td>
                        <td className="py-3 px-2 sm:px-4 hidden md:table-cell">
                          <Badge variant="outline" className="text-xs">
                            {translateCategory(product.category)}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 sm:px-4">
                          {latestPrice ? (
                            <div>
                              <div className="font-bold text-green-600 text-sm sm:text-base">
                                {formatPriceWithEUR(latestPrice.price).bgn}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatPriceWithEUR(latestPrice.price).eur}
                              </div>
                              <div className="text-xs text-gray-500 lg:hidden">
                                {latestPrice.supermarket.name}
                              </div>
                              {priceChange && priceChange.type !== 'same' && (
                                <div className={`flex items-center text-xs mt-1 ${
                                  priceChange.type === 'increase' ? 'text-red-500' : 'text-green-500'
                                }`}>
                                  {priceChange.type === 'increase' ? (
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                  ) : (
                                    <TrendingDown className="h-3 w-3 mr-1" />
                                  )}
                                  {priceChange.percentage}%
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500 text-sm">Няма данни</span>
                          )}
                        </td>
                        <td className="py-3 px-2 sm:px-4 hidden lg:table-cell">
                          <span className="text-gray-900 text-sm">{latestPrice?.supermarket.name || '-'}</span>
                        </td>
                        <td className="py-3 px-2 sm:px-4 hidden xl:table-cell">
                          <div className="flex items-center justify-center space-x-2 sm:space-x-4 text-sm text-gray-500">
                            <div className="flex items-center">
                              <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              {stats.comments_count}
                            </div>
                            <div className="flex items-center">
                              <Heart className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              {stats.favorites_count}
                            </div>
                            <div className="flex items-center">
                              <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              {stats.tracking_count}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {products.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              Няма намерени продукти
            </h3>
            <p className="text-gray-500 mb-6">
              Опитайте да промените филтрите или търсенето
            </p>
            <Button onClick={() => {
              setSearchTerm('')
              setSelectedCategories([])
              setSelectedSupermarkets([])
            }}>
              Изчисти филтрите
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
