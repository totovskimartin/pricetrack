'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { getProductUrl } from '@/lib/slug-utils'
import { ArrowRight, Heart, Bell } from 'lucide-react'
import Link from 'next/link'

interface Product {
  id: string
  name: string
  category: string
  brand?: string
  image_url?: string
  latest_price?: {
    price: number
    supermarket_name: string
  }
}

interface RelatedProductsProps {
  currentProduct: {
    id: string
    category: string
    brand?: string
  }
}

export function RelatedProducts({ currentProduct }: RelatedProductsProps) {
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRelatedProducts()
  }, [currentProduct.id])

  const fetchRelatedProducts = async () => {
    try {
      setLoading(true)

      // Get products from same category, excluding current product
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          category,
          brand,
          image_url
        `)
        .eq('category', currentProduct.category)
        .neq('id', currentProduct.id)
        .eq('is_approved', true)
        .limit(6)

      if (error) {
        console.error('Error fetching related products:', error)
        return
      }

      if (!products || products.length === 0) {
        setRelatedProducts([])
        return
      }

      // Get latest prices for these products
      const productIds = products.map(p => p.id)
      const { data: prices } = await supabase
        .from('prices')
        .select(`
          product_id,
          price_bgn,
          supermarkets (name)
        `)
        .in('product_id', productIds)
        .order('created_at', { ascending: false })

      // Combine products with their latest prices
      const productsWithPrices = products.map(product => {
        const latestPrice = prices?.find(price => price.product_id === product.id) as any
        return {
          ...product,
          latest_price: latestPrice ? {
            price: latestPrice.price_bgn,
            supermarket_name: latestPrice.supermarkets?.name || 'Неизвестен'
          } : undefined
        }
      })

      setRelatedProducts(productsWithPrices)
    } catch (error) {
      console.error('Error fetching related products:', error)
      setRelatedProducts([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ArrowRight className="h-5 w-5 mr-2 text-blue-600" />
            Подобни продукти
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-gray-500">Зареждане на подобни продукти...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (relatedProducts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ArrowRight className="h-5 w-5 mr-2 text-blue-600" />
            Подобни продукти
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-gray-500">Няма намерени подобни продукти в тази категория</p>
          </div>
        </CardContent>
      </Card>
    )
  }

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <ArrowRight className="h-5 w-5 mr-2 text-blue-600" />
            Подобни продукти
          </div>
          <Badge variant="outline">
            {translateCategory(currentProduct.category)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {relatedProducts.map((product) => (
            <Link key={product.id} href={getProductUrl(product, 'bg')}>
              <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="text-muted-foreground text-xl">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                        {product.name}
                      </h4>
                      {product.brand && (
                        <p className="text-xs text-muted-foreground mb-2">{product.brand}</p>
                      )}
                      {product.latest_price ? (
                        <div>
                          <p className="text-sm font-bold text-green-600">
                            {product.latest_price.price.toFixed(2)} лв.
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {product.latest_price.supermarket_name}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Няма данни за цена</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Quick Action Buttons */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 hover:bg-red-50"
                        onClick={(e) => {
                          e.preventDefault()
                          // Add to favorites logic here
                        }}
                      >
                        <Heart className="h-3 w-3 text-muted-foreground hover:text-red-500" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 hover:bg-blue-50"
                        onClick={(e) => {
                          e.preventDefault()
                          // Add to tracking logic here
                        }}
                      >
                        <Bell className="h-3 w-3 text-muted-foreground hover:text-blue-500" />
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                      Виж детайли →
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        
        {relatedProducts.length >= 6 && (
          <div className="text-center mt-4">
            <Link href={`/bg/products?category=${encodeURIComponent(currentProduct.category)}`}>
              <Button variant="outline" size="sm">
                Виж всички в категория "{translateCategory(currentProduct.category)}"
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
