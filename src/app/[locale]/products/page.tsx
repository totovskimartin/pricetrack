'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getProductUrl } from '@/lib/slug-utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Filter, TrendingUp, TrendingDown, Minus, MessageCircle, Heart, Eye, Plus, Grid, List, ShoppingCart, HelpCircle } from 'lucide-react'
import { MultiSelect } from '@/components/ui/multi-select'
import { Collapsible } from '@/components/ui/collapsible'
import { useProductListStats } from '@/hooks/use-product-stats'
import { useAuth } from '@/components/providers/auth-provider'
import { TourGuide, useTour } from '@/components/ui/tour-guide'

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

function ProductsPageContent() {
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedSupermarkets, setSelectedSupermarkets] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('name')
  const [viewMode, setViewMode] = useState<'grid' | 'sheet'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('products-view-mode')
      if (saved === 'grid' || saved === 'sheet') {
        return saved as 'grid' | 'sheet'
      }
    }
    return 'grid'
  })
  const router = useRouter()
  const searchParams = useSearchParams()
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const { user } = useAuth()

  // Tour guide for first-time users (show for all users, but content varies)
  const { isOpen: isTourOpen, setIsOpen: setIsTourOpen, completeTour, neverShowAgain, canShowTour } = useTour('products_page', !loading)

  // Tour steps (conditional based on user authentication)
  const tourSteps = [
    {
      id: 'welcome',
      title: 'Добре дошли в Продукти!',
      description: 'Тук можете да търсите и сравнявате цени на хиляди продукти от различни супермаркети в България.',
      icon: <Search className="h-5 w-5 text-blue-600" />
    },
    {
      id: 'search',
      title: 'Търсене на продукти',
      description: 'Използвайте търсачката, за да намерите продукти по име, марка или описание.',
      target: 'input[placeholder*="Търсете продукти"]',
      position: 'bottom' as const,
      icon: <Search className="h-5 w-5 text-blue-600" />
    },
    {
      id: 'filters',
      title: 'Филтриране',
      description: 'Филтрирайте продуктите по категория и супермаркет, за да намерите точно това, което търсите.',
      target: '.multi-select-trigger',
      position: 'bottom' as const,
      icon: <Filter className="h-5 w-5 text-blue-600" />
    },
    ...(user ? [{
      id: 'add_product',
      title: 'Добавете нов продукт',
      description: 'Не намирате продукта, който търсите? Добавете го сами! Това помага на цялата общност.',
      target: 'a[href="/bg/products/new"]',
      position: 'left' as const,
      icon: <Plus className="h-5 w-5 text-green-600" />,
      action: {
        text: 'Добави продукт сега',
        onClick: () => {
          completeTour()
          router.push('/bg/products/new')
        }
      }
    }] : [{
      id: 'login_prompt',
      title: 'Влезте в профила си',
      description: 'За да добавяте продукти, следите цени и участвате в дискусии, влезте в профила си или се регистрирайте.',
      icon: <Plus className="h-5 w-5 text-blue-600" />
    }])
  ]

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
              id: price.supermarkets?.id || '',
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

  // Initialize search term from URL parameters
  useEffect(() => {
    const searchQuery = searchParams.get('search')
    if (searchQuery) {
      setSearchTerm(searchQuery)
    }
  }, [searchParams])

  // Set responsive default view mode and force grid on mobile
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        if (window.innerWidth < 640) { // sm breakpoint
          // Force grid view on mobile for better UX
          setViewMode('grid')
        } else if (!localStorage.getItem('products-view-mode')) {
          // Only set default on larger screens if no preference is saved
          setViewMode('grid') // Desktop: use cards view by default
        }
      }
    }

    // Set initial view mode
    handleResize()

    // Listen for resize events
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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

  const getLowestPrice = (product: Product) => {
    if (!product.price_entries || product.price_entries.length === 0) {
      return null
    }

    // Get the latest price from each supermarket
    const supermarketLatestPrices = product.price_entries.reduce((acc, entry) => {
      const supermarketId = entry.supermarket.id
      if (!acc[supermarketId] || new Date(entry.recorded_at) > new Date(acc[supermarketId].recorded_at)) {
        acc[supermarketId] = entry
      }
      return acc
    }, {} as Record<string, typeof product.price_entries[0]>)

    // Find the lowest price among the latest prices from each supermarket
    const latestPrices = Object.values(supermarketLatestPrices)
    return latestPrices.reduce((lowest, entry) => {
      return entry.price < lowest.price ? entry : lowest
    })
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

  // Handle view mode change with localStorage persistence
  const handleViewModeChange = (mode: 'grid' | 'sheet') => {
    setViewMode(mode)
    if (typeof window !== 'undefined') {
      localStorage.setItem('products-view-mode', mode)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Зареждане на продуктите...</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Tour Guide */}
      <TourGuide
        steps={tourSteps}
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onComplete={completeTour}
        onNeverShowAgain={neverShowAgain}
        title="Добре дошли в Продукти!"
        description="Нека ви покажем как да използвате тази страница"
      />

      {/* Modern Page Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Продукти
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                Открийте най-добрите цени на вашите любими продукти
              </p>
            </div>
            {canShowTour() && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTourOpen(true)}
                className="hidden sm:flex items-center gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <HelpCircle className="h-4 w-4" />
                <span>Покажи обиколката</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Modern Search */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Търсете продукти по име, марка или описание..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-3 text-base border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm"
            />
          </div>
        </div>

        {/* Modern Filters */}
        <div className="mb-8">
          <Collapsible
            title="Филтри и сортиране"
            defaultOpen={false}
            icon={<Filter className="h-5 w-5 text-blue-600" />}
            className="mb-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-sm"
          >
            <div className="space-y-6 p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Категории
                  </label>
                  <MultiSelect
                    options={categories.filter(cat => cat !== 'all').map(category => ({
                      label: translateCategory(category),
                      value: category
                    }))}
                    selected={selectedCategories}
                    onChange={setSelectedCategories}
                    placeholder="Избери категории"
                    className="w-full multi-select-trigger rounded-xl border-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Супермаркети
                  </label>
                  <MultiSelect
                    options={supermarkets.map(supermarket => ({
                      label: supermarket.name,
                      value: supermarket.id
                    }))}
                    selected={selectedSupermarkets}
                    onChange={setSelectedSupermarkets}
                    placeholder="Избери супермаркети"
                    className="w-full rounded-xl border-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Сортиране
                  </label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full rounded-xl border-gray-200">
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
              </div>

              {/* Modern View Mode Toggle */}
              <div className="flex justify-center sm:justify-start">
                <div className="flex items-center bg-gray-100 rounded-xl p-1">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleViewModeChange('grid')}
                    className={`h-9 px-4 rounded-lg transition-all ${
                      viewMode === 'grid'
                        ? 'bg-white shadow-sm text-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Grid className="h-4 w-4 mr-2" />
                    Карти
                  </Button>
                  <Button
                    variant={viewMode === 'sheet' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleViewModeChange('sheet')}
                    className={`h-9 px-4 rounded-lg transition-all hidden sm:flex ${
                      viewMode === 'sheet'
                        ? 'bg-white shadow-sm text-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <List className="h-4 w-4 mr-2" />
                    Таблица
                  </Button>
                </div>
              </div>
            </div>
          </Collapsible>
        </div>

        {/* Modern Product Count and Add Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
              {products.length} продукта
            </div>
            {products.length > 0 && (
              <span className="text-gray-500 text-sm">
                Намерени резултати
              </span>
            )}
          </div>
          {user && (
            <Link href="/bg/products/new">
              <Button className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-2.5 rounded-xl">
                <Plus className="h-4 w-4 mr-2" />
                Добави продукт
              </Button>
            </Link>
          )}
        </div>

        {/* Products Display */}
        {viewMode === 'grid' ? (
          /* Compact Modern Grid View */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4">
            {products.map((product) => {
              const lowestPrice = getLowestPrice(product)
              const priceChange = getPriceChange(product)

              return (
                <Card key={product.id} className="group overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 bg-white/80 backdrop-blur-sm">
                  <Link href={getProductUrl(product, 'bg')}>
                    <div className="relative">
                      {/* Product Image */}
                      <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="text-gray-300 text-2xl sm:text-3xl">📦</div>
                          </div>
                        )}
                      </div>

                      {/* Category Badge */}
                      <div className="absolute top-1.5 left-1.5">
                        <Badge variant="secondary" className="bg-white/90 text-gray-700 text-xs font-medium px-1.5 py-0.5 backdrop-blur-sm hidden sm:block">
                          {translateCategory(product.category)}
                        </Badge>
                      </div>
                    </div>

                    {/* Product Info */}
                    <CardContent className="p-2 sm:p-3 flex flex-col h-36 sm:h-40">
                      {/* Product Name & Brand - Fixed height section */}
                      <div className="flex-shrink-0 h-10 sm:h-12 flex flex-col justify-start">
                        <h3 className="font-semibold text-gray-900 line-clamp-2 text-xs sm:text-sm leading-tight group-hover:text-blue-600 transition-colors">
                          {product.name}
                        </h3>
                        <div className="h-4 flex items-start">
                          {product.brand && (
                            <p className="text-gray-500 text-xs font-medium truncate">
                              {product.brand}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Flexible spacer */}
                      <div className="flex-1"></div>

                      {/* Bottom section - Fixed height */}
                      <div className="flex-shrink-0 h-16 sm:h-18 flex flex-col justify-end">
                        {/* Price Info - Fixed height */}
                        <div className="h-8 sm:h-10 flex flex-col justify-center">
                          {lowestPrice ? (
                            <div className="space-y-0.5">
                              <div className="flex items-baseline gap-1">
                                <span className="text-sm sm:text-base font-bold text-green-600">
                                  {formatPriceWithEUR(lowestPrice.price).bgn}
                                </span>
                                <span className="text-xs text-gray-500 hidden sm:inline">
                                  {formatPriceWithEUR(lowestPrice.price).eur}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {lowestPrice.supermarket.name}
                              </div>
                            </div>
                          ) : (
                            <div className="text-gray-400 text-xs">Няма данни</div>
                          )}
                        </div>

                        {/* Category for mobile - Fixed height */}
                        <div className="sm:hidden h-5 flex items-center">
                          <Badge variant="outline" className="text-xs py-0 px-1 h-4">
                            {translateCategory(product.category)}
                          </Badge>
                        </div>

                        {/* Stats - Fixed height */}
                        <div className="h-6 flex items-center justify-between pt-1 border-t border-gray-100">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <div className="flex items-center gap-0.5">
                              <MessageCircle className="h-2.5 w-2.5" />
                              <span>{getProductStats(product.id).comments_count}</span>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <Heart className="h-2.5 w-2.5" />
                              <span>{getProductStats(product.id).favorites_count}</span>
                            </div>
                            <div className="hidden sm:flex items-center gap-0.5">
                              <Eye className="h-2.5 w-2.5" />
                              <span>{getProductStats(product.id).tracking_count}</span>
                            </div>
                          </div>

                          {/* Price Change Indicator - Fixed width area */}
                          <div className="w-12 sm:w-16 flex justify-end">
                            {priceChange && priceChange.type !== 'same' && (
                              <div className={`flex items-center gap-0.5 text-xs ${
                                priceChange.type === 'increase' ? 'text-red-500' : 'text-green-500'
                              }`}>
                                {priceChange.type === 'increase' ? (
                                  <TrendingUp className="h-2.5 w-2.5" />
                                ) : (
                                  <TrendingDown className="h-2.5 w-2.5" />
                                )}
                                <span className="hidden sm:inline">{priceChange.percentage}%</span>
                              </div>
                            )}
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
          <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed responsive-table-custom">
                <thead className="bg-muted border-b">
                  <tr>
                    <th className="text-left py-3 px-2 sm:px-4 font-medium text-foreground w-3/5 sm:w-auto">Продукт</th>
                    <th className="text-left py-3 px-2 sm:px-4 font-medium text-foreground hidden sm:table-cell">Марка</th>
                    <th className="text-left py-3 px-2 sm:px-4 font-medium text-foreground hidden md:table-cell">Категория</th>
                    <th className="text-left py-3 px-2 sm:px-4 font-medium text-foreground w-2/5 sm:w-auto">Цена</th>
                    <th className="text-center py-3 px-2 sm:px-4 font-medium text-foreground hidden lg:table-cell">Статистики</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map((product) => {
                    const lowestPrice = getLowestPrice(product)
                    const priceChange = getPriceChange(product)
                    const stats = getProductStats(product.id)

                    return (
                      <tr key={product.id} className="hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-2 sm:px-4 w-3/5 sm:w-auto">
                          <Link href={getProductUrl(product, 'bg')} className="flex items-center space-x-2 sm:space-x-3 hover:text-primary">
                            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="w-full h-full object-cover rounded-md"
                                />
                              ) : (
                                <div className="text-muted-foreground text-xs sm:text-lg">📦</div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-foreground truncate text-xs sm:text-base">{product.name}</div>
                              <div className="text-xs sm:text-sm text-muted-foreground">
                                <span className="sm:hidden">{product.brand || 'Без марка'}</span>
                                <span className="hidden sm:inline">ID: {product.id.split('-')[0]}</span>
                              </div>
                              <div className="text-xs text-muted-foreground md:hidden">
                                <Badge variant="outline" className="text-xs mt-1">
                                  {translateCategory(product.category)}
                                </Badge>
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="py-3 px-2 sm:px-4 hidden sm:table-cell">
                          <span className="text-foreground text-sm">{product.brand || '-'}</span>
                        </td>
                        <td className="py-3 px-2 sm:px-4 hidden md:table-cell">
                          <Badge variant="outline" className="text-xs">
                            {translateCategory(product.category)}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 sm:px-4 w-2/5 sm:w-auto">
                          {lowestPrice ? (
                            <div>
                              <div className="font-bold text-green-600 text-xs sm:text-base">
                                {formatPriceWithEUR(lowestPrice.price).bgn}
                              </div>
                              <div className="text-xs text-muted-foreground hidden sm:block">
                                {formatPriceWithEUR(lowestPrice.price).eur}
                              </div>
                              <div className="text-xs text-green-600 font-medium mt-1 truncate">
                                <span className="hidden sm:inline">Най-ниска в </span>{lowestPrice.supermarket.name}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs sm:text-sm">Няма данни</span>
                          )}
                        </td>
                        <td className="py-3 px-2 sm:px-4 hidden lg:table-cell">
                          <div className="flex items-center justify-center space-x-2 sm:space-x-4 text-sm text-muted-foreground">
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

        {/* Modern Empty State */}
        {products.length === 0 && (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="h-12 w-12 text-blue-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Няма намерени продукти
              </h3>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Не намерихме продукти, които да отговарят на вашите критерии. Опитайте да промените филтрите или търсенето.
              </p>
              <Button
                onClick={() => {
                  setSearchTerm('')
                  setSelectedCategories([])
                  setSelectedSupermarkets([])
                }}
                className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Search className="h-4 w-4 mr-2" />
                Изчисти филтрите
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Зареждане на продуктите...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <ProductsPageContent />
    </Suspense>
  )
}
