'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Target, TrendingDown } from 'lucide-react'

interface TargetPriceModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (targetPrice?: number) => void
  productName: string
  currentPrice: number
  isTracking?: boolean
  currentTargetPrice?: number
}

export function TargetPriceModal({
  isOpen,
  onClose,
  onConfirm,
  productName,
  currentPrice,
  isTracking = false,
  currentTargetPrice
}: TargetPriceModalProps) {
  const [targetPrice, setTargetPrice] = useState<string>(
    currentTargetPrice ? currentTargetPrice.toString() : ''
  )
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const price = targetPrice ? parseFloat(targetPrice) : undefined
      await onConfirm(price)
      onClose()
    } catch (error) {
      // Handle error
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

  const targetPriceNum = targetPrice ? parseFloat(targetPrice) : 0
  const savings = targetPriceNum > 0 ? currentPrice - targetPriceNum : 0

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white text-gray-900">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">
                {isTracking ? 'Редактирай следенето' : 'Следи цената'}
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
            {isTracking 
              ? 'Промени целевата цена за известяване'
              : 'Задай целева цена за известяване при намаление'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Product Info */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-2 line-clamp-2 text-gray-900">{productName}</h4>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Текуща цена:</span>
              <div className="text-right">
                <div className="font-bold text-green-600">{formatPrice(currentPrice)}</div>
                <div className="text-xs text-gray-500">{getEurPrice(currentPrice)}</div>
              </div>
            </div>
          </div>

          {/* Target Price Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Целева цена (незадължително)
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="Например: 2.50"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="text-lg"
            />
            <p className="text-xs text-gray-500">
              Ще получиш известие когато цената падне под тази стойност
            </p>
          </div>

          {/* Savings Preview */}
          {targetPriceNum > 0 && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingDown className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Очаквани спестявания</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700">При достигане на целевата цена:</span>
                <div className="text-right">
                  <div className="font-bold text-blue-800">
                    {savings > 0 ? `${formatPrice(savings)} спестени` : 'Няма спестявания'}
                  </div>
                  {savings > 0 && (
                    <div className="text-xs text-blue-600">
                      {getEurPrice(savings)} спестени
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Отказ
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1"
              disabled={loading}
            >
              {loading ? 'Запазване...' : (isTracking ? 'Обнови' : 'Започни следене')}
            </Button>
          </div>

          {/* Info Note */}
          <div className="text-xs text-gray-500 text-center pt-2 border-t">
            {isTracking
              ? 'Ще продължиш да получаваш известия за промени в цената'
              : 'Ще получаваш известия по имейл при промени в цената'
            }
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
