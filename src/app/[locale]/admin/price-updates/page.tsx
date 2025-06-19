'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { emailService } from '@/lib/email-notifications'
import { Search, Plus, Save, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'

interface Product {
  id: string
  name: string
  category: string
  brand?: string
  image_url?: string
}

interface Supermarket {
  id: string
  name: string
  logo_url?: string
}

interface PriceUpdate {
  productId: string
  supermarketId: string
  priceBgn: number
  priceEur: number
}

export default function PriceUpdatesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [supermarkets, setSupermarkets] = useState<Supermarket[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [priceUpdates, setPriceUpdates] = useState<PriceUpdate[]>([])
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchProducts()
    fetchSupermarkets()
  }, [])

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category, brand, image_url')
        .eq('is_approved', true)
        .order('name')

      if (!error && data) {
        setProducts(data)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const fetchSupermarkets = async () => {
    try {
      const { data, error } = await supabase
        .from('supermarkets')
        .select('id, name, logo_url')
        .order('name')

      if (!error && data) {
        setSupermarkets(data)
      }
    } catch (error) {
      console.error('Error fetching supermarkets:', error)
    }
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const addPriceUpdate = () => {
    if (!selectedProduct) return

    setPriceUpdates(prev => [...prev, {
      productId: selectedProduct.id,
      supermarketId: '',
      priceBgn: 0,
      priceEur: 0
    }])
  }

  const updatePriceUpdate = (index: number, field: keyof PriceUpdate, value: string | number) => {
    setPriceUpdates(prev => prev.map((update, i) => 
      i === index ? { ...update, [field]: value } : update
    ))
  }

  const removePriceUpdate = (index: number) => {
    setPriceUpdates(prev => prev.filter((_, i) => i !== index))
  }

  const calculateEurPrice = (bgnPrice: number) => {
    return Number((bgnPrice / 1.96).toFixed(2))
  }

  const submitPriceUpdates = async () => {
    if (!selectedProduct || priceUpdates.length === 0) return

    setLoading(true)

    try {
      // Get current prices for comparison
      const { data: currentPrices } = await supabase
        .from('prices')
        .select(`
          price_bgn,
          supermarket_id,
          supermarkets (name)
        `)
        .eq('product_id', selectedProduct.id)
        .order('created_at', { ascending: false })

      // Insert new prices
      const newPrices = priceUpdates
        .filter(update => update.supermarketId && update.priceBgn > 0)
        .map(update => ({
          product_id: selectedProduct.id,
          supermarket_id: update.supermarketId,
          price_bgn: update.priceBgn,
          price_eur: update.priceEur || calculateEurPrice(update.priceBgn),
          created_at: new Date().toISOString()
        }))

      if (newPrices.length === 0) {
        setSuccessMessage('Няма валидни цени за добавяне')
        setLoading(false)
        return
      }

      const { error } = await supabase
        .from('prices')
        .insert(newPrices)

      if (error) {
        throw error
      }

      // Check for price changes and send notifications
      await checkAndSendNotifications(selectedProduct, newPrices, currentPrices || [])

      setSuccessMessage(`Успешно добавени ${newPrices.length} нови цени за ${selectedProduct.name}`)
      setPriceUpdates([])
      setSelectedProduct(null)

    } catch (error) {
      console.error('Error submitting price updates:', error)
      setSuccessMessage('Възникна грешка при добавянето на цените')
    } finally {
      setLoading(false)
    }
  }

  const checkAndSendNotifications = async (
    product: Product, 
    newPrices: any[], 
    currentPrices: any[]
  ) => {
    try {
      // Get users tracking this product with their emails
      const { data: trackingUsers } = await supabase
        .from('user_tracking')
        .select(`
          user_id,
          target_price_bgn,
          users!inner(email)
        `)
        .eq('product_id', product.id)
        .eq('is_active', true)

      if (!trackingUsers || trackingUsers.length === 0) return

      // Check each new price against tracking criteria
      for (const newPrice of newPrices) {
        const supermarket = supermarkets.find(s => s.id === newPrice.supermarket_id)
        const currentPrice = currentPrices?.find(p => p.supermarket_id === newPrice.supermarket_id)

        for (const tracking of trackingUsers) {
          const shouldNotify = 
            // Price dropped below target price
            (tracking.target_price_bgn && newPrice.price_bgn <= tracking.target_price_bgn) ||
            // Significant price drop (more than 10%)
            (currentPrice && ((currentPrice.price_bgn - newPrice.price_bgn) / currentPrice.price_bgn) > 0.1)

          // Extract email from the users array (Supabase returns joined tables as arrays)
          const userEmail = tracking.users?.[0]?.email

          if (shouldNotify && userEmail) {
            await emailService.sendPriceDropNotification({
              userId: tracking.user_id,
              userEmail: userEmail,
              productId: product.id,
              productName: product.name,
              oldPrice: currentPrice?.price_bgn || newPrice.price_bgn,
              newPrice: newPrice.price_bgn,
              targetPrice: tracking.target_price_bgn,
              supermarketName: supermarket?.name || 'Неизвестен',
              productUrl: `${window.location.origin}/bg/products/${product.id}`
            })
          }
        }
      }
    } catch (error) {
      console.error('Error sending notifications:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto pl-16 pr-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/bg/admin">
            <Button variant="outline" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Обратно към админ панела
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Ръчно обновяване на цени
          </h1>
          <p className="text-gray-600">
            Добавете нови цени за продукти и автоматично известете потребителите
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Избор на продукт</CardTitle>
              <CardDescription>
                Търсете и изберете продукт за обновяване на цени
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Търсене на продукт..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedProduct?.id === product.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedProduct(product)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <div className="text-gray-400">📦</div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{product.name}</h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {product.category}
                            </Badge>
                            {product.brand && (
                              <Badge variant="secondary" className="text-xs">
                                {product.brand}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Price Updates */}
          <Card>
            <CardHeader>
              <CardTitle>Обновяване на цени</CardTitle>
              <CardDescription>
                {selectedProduct 
                  ? `Добавете нови цени за: ${selectedProduct.name}`
                  : 'Изберете продукт за да започнете'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedProduct ? (
                <div className="space-y-4">
                  {priceUpdates.map((update, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Цена #{index + 1}</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removePriceUpdate(index)}
                        >
                          Премахни
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <Select
                          value={update.supermarketId}
                          onValueChange={(value) => updatePriceUpdate(index, 'supermarketId', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Изберете магазин" />
                          </SelectTrigger>
                          <SelectContent>
                            {supermarkets.map((supermarket) => (
                              <SelectItem key={supermarket.id} value={supermarket.id}>
                                {supermarket.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-sm font-medium">Цена (лв.)</label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={update.priceBgn || ''}
                              onChange={(e) => {
                                const bgnPrice = parseFloat(e.target.value) || 0
                                updatePriceUpdate(index, 'priceBgn', bgnPrice)
                                updatePriceUpdate(index, 'priceEur', calculateEurPrice(bgnPrice))
                              }}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Цена (€)</label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={update.priceEur || ''}
                              onChange={(e) => updatePriceUpdate(index, 'priceEur', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={addPriceUpdate}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Добави цена
                    </Button>
                    {priceUpdates.length > 0 && (
                      <Button
                        onClick={submitPriceUpdates}
                        disabled={loading}
                        className="flex-1"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {loading ? 'Запазване...' : 'Запази цените'}
                      </Button>
                    )}
                  </div>

                  {priceUpdates.length > 0 && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center text-blue-800 text-sm">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Потребителите ще получат автоматични известия при значителни промени в цените
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-4">📦</div>
                  <p>Изберете продукт от лявата страна за да започнете добавяне на цени</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
