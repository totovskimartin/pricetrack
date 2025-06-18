'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Heart, Search, Filter, ShoppingCart, Trash2, Eye, TrendingUp, AlertCircle } from 'lucide-react'
import { useFavorites } from '@/hooks/use-favorites'
import { usePriceTracking } from '@/hooks/use-price-tracking'
import { getProductUrl } from '@/lib/slug-utils'
import { AuthGuard } from '@/components/auth/auth-guard'
import { useToast } from '@/components/providers/toast-provider'

function FavoritesContent() {
  const { favoriteProducts, loading, removeFromFavorites, clearAllFavorites } = useFavorites()
  const { toggleTracking, isTracking } = usePriceTracking()
  const { showSuccess, showError } = useToast()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')

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

  // Get unique categories from favorite products
  const availableCategories = Array.from(new Set(favoriteProducts.map(p => p.category)))

  // Filter and sort products
  const filteredProducts = favoriteProducts
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'price':
          const priceA = a.latest_price?.price || 0
          const priceB = b.latest_price?.price || 0
          return priceA - priceB
        case 'category':
          return a.category.localeCompare(b.category)
        default:
          return 0
      }
    })

  const handleRemoveFromFavorites = async (productId: string, productName: string) => {
    try {
      const success = await removeFromFavorites(productId)
      if (success) {
        showSuccess(`${productName} беше премахнат от любимите ви продукти.`, "Премахнато от любими")
      } else {
        showError("Възникна грешка при премахването от любими.", "Грешка")
      }
    } catch (error) {
      console.error('Error removing from favorites:', error)
      showError("Възникна грешка при премахването от любими.", "Грешка")
    }
  }

  const handleClearAll = async () => {
    if (window.confirm('Сигурни ли сте, че искате да премахнете всички любими продукти?')) {
      clearAllFavorites()
      showSuccess("Всички любими продукти бяха премахнати.", "Любимите продукти са изчистени")
    }
  }

  const handleToggleTracking = async (productId: string, productName: string) => {
    try {
      // Check the current state BEFORE toggling
      const wasTracking = isTracking(productId)
      const success = await toggleTracking(productId)
      if (success) {
        // Now we know what the new state should be (opposite of what it was)
        const isNowTracking = !wasTracking
        showSuccess(
          `${productName} ${isNowTracking ? 'беше добавен към' : 'беше премахнат от'} следените продукти.`,
          isNowTracking ? "Започнахте да следите цената" : "Спряхте да следите цената"
        )
      } else {
        showError("Възникна грешка при обновяването на следенето на цената.", "Грешка")
      }
    } catch (error) {
      console.error('Error toggling tracking:', error)
      showError("Възникна грешка при обновяването на следенето на цената.", "Грешка")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto pl-16 pr-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Heart className="h-6 w-6 mr-2 text-red-500" />
                Любими продукти
              </h1>
              <p className="text-gray-600">
                Управлявайте вашите запазени продукти ({favoriteProducts.length})
              </p>
            </div>
            {favoriteProducts.length > 0 && (
              <Button 
                variant="outline" 
                onClick={handleClearAll}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Изчисти всички
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Зареждане на любими продукти...</p>
          </div>
        ) : favoriteProducts.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Няма любими продукти</h3>
              <p className="text-gray-600 mb-6">
                Започнете да добавяте продукти в любими, за да ги виждате тук.
              </p>
              <Link href="/bg/products">
                <Button>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Разгледайте продукти
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Filters and Search */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Filter className="h-5 w-5 mr-2 text-blue-500" />
                  Филтри и търсене
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Търсене
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Търсете по име или марка..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Категория
                    </label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Всички категории" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Всички категории</SelectItem>
                        {availableCategories.map(category => (
                          <SelectItem key={category} value={category}>
                            {categoryTranslations[category] || category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Сортиране
                    </label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">По име</SelectItem>
                        <SelectItem value="price">По цена</SelectItem>
                        <SelectItem value="category">По категория</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results Summary */}
            {filteredProducts.length !== favoriteProducts.length && (
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Показани {filteredProducts.length} от {favoriteProducts.length} продукта
                </p>
              </div>
            )}

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <Card className="text-center py-8">
                <CardContent>
                  <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Няма намерени продукти</h3>
                  <p className="text-gray-600">
                    Опитайте с различни филтри или търсене.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="hover:shadow-lg transition-shadow duration-200">
                    <CardContent className="p-4">
                      <div className="flex flex-col h-full">
                        {/* Product Image and Info */}
                        <Link href={getProductUrl(product, 'bg')} className="block mb-4">
                          <div className="flex items-start space-x-3 mb-3">
                            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <div className="text-gray-400 text-xl">📦</div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-sm line-clamp-2 mb-1 hover:text-blue-600 transition-colors">
                                {product.name}
                              </h3>
                              {product.brand && (
                                <p className="text-xs text-gray-500 mb-1">{product.brand}</p>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {categoryTranslations[product.category] || product.category}
                              </Badge>
                            </div>
                          </div>
                        </Link>

                        {/* Price Info */}
                        <div className="mb-4">
                          {product.latest_price ? (
                            <div>
                              <p className="text-lg font-bold text-green-600">
                                {product.latest_price.price.toFixed(2)} лв.
                              </p>
                              <p className="text-xs text-gray-500">
                                {product.latest_price.supermarket_name}
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">Няма данни за цена</p>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-auto space-y-2">
                          <div className="flex space-x-2">
                            <Link href={getProductUrl(product, 'bg')} className="flex-1">
                              <Button variant="outline" size="sm" className="w-full">
                                <Eye className="h-4 w-4 mr-1" />
                                Виж
                              </Button>
                            </Link>
                            <Button
                              variant={isTracking(product.id) ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleToggleTracking(product.id, product.name)}
                              className={`flex-1 ${isTracking(product.id) ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                            >
                              <TrendingUp className="h-4 w-4 mr-1" />
                              {isTracking(product.id) ? 'Следи се' : 'Следи цената'}
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFromFavorites(product.id, product.name)}
                            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Heart className="h-4 w-4 mr-1 fill-current" />
                            Премахни от любими
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default function FavoritesPage() {
  return (
    <AuthGuard>
      <FavoritesContent />
    </AuthGuard>
  )
}
