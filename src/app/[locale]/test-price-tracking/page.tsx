'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EnhancedPriceChart } from '@/components/product/enhanced-price-chart'
import { PriceAnalyticsDashboard } from '@/components/product/price-analytics-dashboard'
import { PriceSuggestionModal } from '@/components/product/price-suggestion-modal'

// Mock data for testing
const mockProduct = {
  id: 'test-product-1',
  name: 'Тестов продукт за проследяване на цени',
  price_entries: [
    {
      id: '1',
      price: 2.50,
      recorded_at: '2024-01-01T10:00:00Z',
      supermarket: {
        id: 'lidl',
        name: 'Lidl',
        logo_url: 'https://example.com/lidl-logo.png'
      }
    },
    {
      id: '2',
      price: 2.80,
      recorded_at: '2024-01-05T10:00:00Z',
      supermarket: {
        id: 'fantastico',
        name: 'Fantastico',
        logo_url: 'https://example.com/fantastico-logo.png'
      }
    },
    {
      id: '3',
      price: 2.45,
      recorded_at: '2024-01-10T10:00:00Z',
      supermarket: {
        id: 'lidl',
        name: 'Lidl',
        logo_url: 'https://example.com/lidl-logo.png'
      }
    },
    {
      id: '4',
      price: 2.75,
      recorded_at: '2024-01-15T10:00:00Z',
      supermarket: {
        id: 'billa',
        name: 'Billa',
        logo_url: 'https://example.com/billa-logo.png'
      }
    },
    {
      id: '5',
      price: 2.60,
      recorded_at: '2024-01-20T10:00:00Z',
      supermarket: {
        id: 'fantastico',
        name: 'Fantastico',
        logo_url: 'https://example.com/fantastico-logo.png'
      }
    }
  ]
}

const mockCurrentPrices = [
  {
    supermarket_id: 'lidl',
    price_bgn: 2.45,
    supermarket: { name: 'Lidl' }
  },
  {
    supermarket_id: 'fantastico',
    price_bgn: 2.60,
    supermarket: { name: 'Fantastico' }
  },
  {
    supermarket_id: 'billa',
    price_bgn: 2.75,
    supermarket: { name: 'Billa' }
  }
]

export default function TestPriceTrackingPage() {
  const [showPriceSuggestionModal, setShowPriceSuggestionModal] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Тест на функциите за проследяване на цени
          </h1>
          <p className="text-gray-600">
            Тази страница демонстрира новите функции за проследяване на цени с примерни данни.
          </p>
        </div>

        <div className="space-y-8">
          {/* Test Price Suggestion Modal */}
          <Card>
            <CardHeader>
              <CardTitle>Предложение за цена</CardTitle>
              <CardDescription>
                Тест на модала за предложение на нови цени
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowPriceSuggestionModal(true)}>
                Отвори модал за предложение на цена
              </Button>
            </CardContent>
          </Card>

          {/* Test Enhanced Price Chart */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Подобрена графика на цените
            </h2>
            <EnhancedPriceChart product={mockProduct} />
          </div>

          {/* Test Price Analytics Dashboard */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Аналитично табло за цени
            </h2>
            <PriceAnalyticsDashboard product={mockProduct} />
          </div>

          {/* Component Status */}
          <Card>
            <CardHeader>
              <CardTitle>Статус на компонентите</CardTitle>
              <CardDescription>
                Проверка дали всички компоненти се зареждат правилно
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>EnhancedPriceChart - Заредена</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>PriceAnalyticsDashboard - Заредена</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>PriceSuggestionModal - Готова за тест</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mock Data Info */}
          <Card>
            <CardHeader>
              <CardTitle>Примерни данни</CardTitle>
              <CardDescription>
                Информация за използваните тестови данни
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold">Продукт:</h4>
                  <p>{mockProduct.name}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Брой цени:</h4>
                  <p>{mockProduct.price_entries.length} записа</p>
                </div>
                <div>
                  <h4 className="font-semibold">Магазини:</h4>
                  <ul className="list-disc list-inside">
                    {Array.from(new Set(mockProduct.price_entries.map(p => p.supermarket.name))).map(name => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold">Ценови диапазон:</h4>
                  <p>
                    {Math.min(...mockProduct.price_entries.map(p => p.price)).toFixed(2)} лв. - 
                    {Math.max(...mockProduct.price_entries.map(p => p.price)).toFixed(2)} лв.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Price Suggestion Modal */}
        <PriceSuggestionModal
          isOpen={showPriceSuggestionModal}
          onClose={() => setShowPriceSuggestionModal(false)}
          productId={mockProduct.id}
          productName={mockProduct.name}
          currentPrices={mockCurrentPrices}
          onSuccess={() => {
            console.log('Price suggestion submitted successfully!')
            setShowPriceSuggestionModal(false)
          }}
        />
      </div>
    </div>
  )
}
