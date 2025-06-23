'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, DollarSign, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { supabase } from '@/lib/supabase'
import { ensureUserExists } from '@/lib/user-utils'

interface Supermarket {
  id: string
  name: string
  logo_url?: string
}

interface PriceSuggestionModalProps {
  isOpen: boolean
  onClose: () => void
  productId: string
  productName: string
  currentPrices?: Array<{
    supermarket_id: string
    price_bgn: number
    supermarket: { name: string }
  }>
  onSuccess?: () => void
}

export function PriceSuggestionModal({
  isOpen,
  onClose,
  productId,
  productName,
  currentPrices = [],
  onSuccess
}: PriceSuggestionModalProps) {
  const { user } = useAuth()
  const [supermarkets, setSupermarkets] = useState<Supermarket[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    supermarket_id: '',
    suggested_price_bgn: '',
    notes: ''
  })

  useEffect(() => {
    if (isOpen) {
      fetchSupermarkets()
      setSuccess(false)
      setError(null)
      setForm({
        supermarket_id: '',
        suggested_price_bgn: '',
        notes: ''
      })

      // Ensure user exists when modal opens
      if (user) {
        ensureUserExists(user).catch(error => {
          console.error('Error ensuring user exists:', error)
        })
      }
    }
  }, [isOpen, user])

  const fetchSupermarkets = async () => {
    try {
      const { data, error } = await supabase
        .from('supermarkets')
        .select('id, name, logo_url')
        .eq('is_active', true)
        .order('name')

      if (!error && data) {
        setSupermarkets(data)
      }
    } catch (error) {
      console.error('Error fetching supermarkets:', error)
    }
  }

  const getCurrentPrice = (supermarketId: string) => {
    const currentPrice = currentPrices.find(p => p.supermarket_id === supermarketId)
    return currentPrice?.price_bgn || null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!user) {
      setError('Трябва да сте влезли в профила си, за да предложите цена.')
      return
    }

    if (!form.supermarket_id) {
      setError('Моля, изберете магазин.')
      return
    }

    if (!form.suggested_price_bgn || parseFloat(form.suggested_price_bgn) <= 0) {
      setError('Моля, въведете валидна цена.')
      return
    }

    setLoading(true)

    try {
      // Ensure user exists in the database first
      const userExists = await ensureUserExists(user)
      if (!userExists) {
        throw new Error('Не можахме да създадем потребителския профил. Моля, опитайте отново.')
      }

      const currentPrice = getCurrentPrice(form.supermarket_id)
      const suggestedPrice = parseFloat(form.suggested_price_bgn)

      const { data, error } = await supabase
        .from('price_suggestions')
        .insert({
          product_id: productId,
          supermarket_id: form.supermarket_id,
          suggested_price_bgn: suggestedPrice,
          current_price_bgn: currentPrice,
          notes: form.notes || null,
          suggested_by: user.id
        })
        .select()

      if (error) {
        throw error
      }
      setSuccess(true)
      onSuccess?.()

      // Auto close after 2 seconds
      setTimeout(() => {
        onClose()
      }, 2000)

    } catch (error: any) {
      // More specific error messages
      let errorMessage = 'Възникна грешка при изпращане на предложението за цена.'

      if (error?.message) {
        if (error.message.includes('permission') || error.message.includes('RLS')) {
          errorMessage = 'Нямате права да изпращате предложения за цени. Моля, влезте в профила си.'
        } else if (error.message.includes('foreign key') || error.message.includes('not present in table')) {
          errorMessage = 'Потребителският профил не е намерен. Моля, опитайте да се отпишете и впишете отново.'
        } else if (error.message.includes('check constraint')) {
          errorMessage = 'Цената трябва да бъде положително число.'
        } else if (error.message.includes('duplicate key')) {
          errorMessage = 'Вече сте предложили цена за този продукт в този магазин.'
        } else if (error.message.includes('invalid input syntax for type uuid')) {
          errorMessage = 'Проблем с потребителския профил. Моля, опитайте да се отпишете и впишете отново.'
        } else {
          errorMessage = `Грешка: ${error.message}`
        }
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return `${price.toFixed(2)} лв.`
  }

  const getEurPrice = (bgnPrice: number) => {
    return `€${(bgnPrice / 1.96).toFixed(2)}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white text-gray-900">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">
                Добави цена
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Добави нова цена за "{productName}"
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {success ? (
            <div className="text-center py-6">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-700 mb-2">
                Предложението е изпратено!
              </h3>
              <p className="text-sm text-gray-600">
                Благодарим ви! Предложението ви ще бъде прегледано от администратор.
              </p>
            </div>
          ) : (
            <>
              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-red-800 text-sm">
                      <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setError(null)}
                      className="text-red-600 hover:text-red-800 h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
              {/* Supermarket Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Магазин *
                </label>
                <Select
                  value={form.supermarket_id}
                  onValueChange={(value) => setForm(prev => ({ ...prev, supermarket_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Изберете магазин" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg">
                    {supermarkets.map((supermarket) => (
                      <SelectItem key={supermarket.id} value={supermarket.id} className="text-gray-900 hover:bg-gray-100">
                        <div className="flex items-center space-x-2">
                          {supermarket.logo_url && (
                            <img
                              src={supermarket.logo_url}
                              alt={supermarket.name}
                              className="w-4 h-4 object-contain"
                            />
                          )}
                          <span>{supermarket.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Current Price Display */}
              {form.supermarket_id && getCurrentPrice(form.supermarket_id) && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center text-blue-800 text-sm">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Текуща цена: {formatPrice(getCurrentPrice(form.supermarket_id)!)}
                  </div>
                </div>
              )}

              {/* Price Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Цена (лв.) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Например: 2.50"
                  value={form.suggested_price_bgn}
                  onChange={(e) => setForm(prev => ({ ...prev, suggested_price_bgn: e.target.value }))}
                  className="text-lg"
                  required
                />
                {form.suggested_price_bgn && (
                  <p className="text-xs text-gray-500">
                    ≈ {getEurPrice(parseFloat(form.suggested_price_bgn) || 0)}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Бележки (незадължително)
                </label>
                <Textarea
                  placeholder="Допълнителна информация за цената..."
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={loading}
                >
                  Отказ
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={loading || !form.supermarket_id || !form.suggested_price_bgn}
                >
                  {loading ? 'Изпращане...' : 'Изпрати предложение'}
                </Button>
              </div>

              {/* Info Note */}
              <div className="text-xs text-gray-500 text-center pt-2 border-t">
                Предложенията за цени се преглеждат от администратори преди публикуване
              </div>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
