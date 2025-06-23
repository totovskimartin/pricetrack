'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Calendar, ExternalLink, Crown, TrendingUp, TrendingDown } from 'lucide-react'

interface PriceEntry {
  id: string
  price: number
  currency: string
  recorded_at: string
  supermarket: {
    id: string
    name: string
    logo_url: string
    location: string
  }
}

interface Product {
  id: string
  name: string
  price_entries: PriceEntry[]
}

interface PriceComparisonProps {
  product: Product
}

interface SupermarketComparison {
  supermarket: {
    id: string
    name: string
    logo_url: string
    location: string
  }
  latestPrice: PriceEntry
  lowestPrice: PriceEntry
  averagePrice: number
  priceCount: number
  lastUpdated: string
}

export function PriceComparison({ product }: PriceComparisonProps) {
  const [comparisons, setComparisons] = useState<SupermarketComparison[]>([])

  useEffect(() => {
    generateComparisons()
  }, [product])

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'BGN') {
      return `${price.toFixed(2)} лв.`
    } else if (currency === 'EUR') {
      return `€${price.toFixed(2)}`
    }
    return `${price.toFixed(2)} ${currency}`
  }

  const generateComparisons = () => {
    if (!product.price_entries || product.price_entries.length === 0) {
      setComparisons([])
      return
    }

    // Group entries by supermarket
    const supermarketGroups = product.price_entries.reduce((groups, entry) => {
      const supermarketId = entry.supermarket.id
      if (!groups[supermarketId]) {
        groups[supermarketId] = []
      }
      groups[supermarketId].push(entry)
      return groups
    }, {} as Record<string, PriceEntry[]>)

    // Generate comparison data for each supermarket
    const comparisonData: SupermarketComparison[] = Object.entries(supermarketGroups).map(([supermarketId, entries]) => {
      // Sort entries by date (newest first)
      const sortedEntries = entries.sort((a, b) => 
        new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
      )

      const latestPrice = sortedEntries[0]
      const lowestPrice = entries.reduce((lowest, entry) => 
        entry.price < lowest.price ? entry : lowest
      )

      const averagePrice = entries.reduce((sum, entry) => sum + entry.price, 0) / entries.length

      return {
        supermarket: latestPrice.supermarket,
        latestPrice,
        lowestPrice,
        averagePrice,
        priceCount: entries.length,
        lastUpdated: latestPrice.recorded_at
      }
    })

    // Sort by latest price (lowest first)
    comparisonData.sort((a, b) => a.latestPrice.price - b.latestPrice.price)

    setComparisons(comparisonData)
  }

  const getLowestCurrentPrice = () => {
    if (comparisons.length === 0) return null
    return comparisons[0]
  }

  const getPriceDifference = (price: number, lowestPrice: number) => {
    const difference = price - lowestPrice
    const percentage = (difference / lowestPrice) * 100
    return { absolute: difference, percentage }
  }

  const lowestPriceComparison = getLowestCurrentPrice()

  if (comparisons.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Сравнение на цени</CardTitle>
          <CardDescription>
            Няма налични данни за цени в различни супермаркети
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>Все още няма записани цени за този продукт</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Обобщение на цените</CardTitle>
          <CardDescription>
            Сравнение на текущите цени в {comparisons.length} супермаркета
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {lowestPriceComparison && formatPrice(
                  lowestPriceComparison.latestPrice.price,
                  lowestPriceComparison.latestPrice.currency
                )}
              </div>
              <div className="text-sm text-muted-foreground">Най-ниска цена</div>
              <div className="text-xs text-muted-foreground mt-1">
                {lowestPriceComparison?.supermarket.name}
              </div>
            </div>

            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-red-600">
                {comparisons.length > 0 && formatPrice(
                  comparisons[comparisons.length - 1].latestPrice.price,
                  comparisons[comparisons.length - 1].latestPrice.currency
                )}
              </div>
              <div className="text-sm text-muted-foreground">Най-висока цена</div>
              <div className="text-xs text-muted-foreground mt-1">
                {comparisons[comparisons.length - 1]?.supermarket.name}
              </div>
            </div>

            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">
                {lowestPriceComparison && comparisons.length > 1 && formatPrice(
                  getPriceDifference(
                    comparisons[comparisons.length - 1].latestPrice.price,
                    lowestPriceComparison.latestPrice.price
                  ).absolute,
                  lowestPriceComparison.latestPrice.currency
                )}
              </div>
              <div className="text-sm text-muted-foreground">Разлика</div>
              <div className="text-xs text-muted-foreground mt-1">
                {lowestPriceComparison && comparisons.length > 1 &&
                  `${getPriceDifference(
                    comparisons[comparisons.length - 1].latestPrice.price,
                    lowestPriceComparison.latestPrice.price
                  ).percentage.toFixed(1)}% по-скъпо`
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Comparison */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Подробно сравнение</h3>
        
        {comparisons.map((comparison, index) => {
          const isLowest = index === 0
          const priceDiff = lowestPriceComparison ? 
            getPriceDifference(comparison.latestPrice.price, lowestPriceComparison.latestPrice.price) : 
            null

          return (
            <Card key={comparison.supermarket.id} className={`${isLowest ? 'ring-2 ring-green-500' : ''}`}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    {/* Supermarket Logo */}
                    <div className="relative flex-shrink-0">
                      {comparison.supermarket.logo_url && (
                        <img
                          src={comparison.supermarket.logo_url}
                          alt={comparison.supermarket.name}
                          className="w-12 h-12 sm:w-16 sm:h-16 object-contain"
                        />
                      )}
                      {isLowest && (
                        <Crown className="absolute -top-2 -right-2 h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
                      )}
                    </div>

                    {/* Supermarket Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base sm:text-lg font-semibold flex flex-wrap items-center gap-2">
                        <span className="truncate">{comparison.supermarket.name}</span>
                        {isLowest && (
                          <Badge variant="default" className="bg-green-600 text-xs">
                            Най-ниска цена
                          </Badge>
                        )}
                      </h4>
                      {comparison.supermarket.location && (
                        <div className="flex items-center text-muted-foreground text-sm mt-1">
                          <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                          <span className="truncate">{comparison.supermarket.location}</span>
                        </div>
                      )}
                      <div className="flex items-center text-muted-foreground text-sm mt-1">
                        <Calendar className="h-4 w-4 mr-1 flex-shrink-0" />
                        <span>Обновено: {new Date(comparison.lastUpdated).toLocaleDateString('bg-BG')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Price Info */}
                  <div className="text-center sm:text-right flex-shrink-0">
                    <div className="text-2xl sm:text-3xl font-bold text-foreground">
                      {formatPrice(comparison.latestPrice.price, comparison.latestPrice.currency)}
                    </div>

                    {priceDiff && priceDiff.absolute > 0 && (
                      <div className="text-sm text-red-600 mt-1">
                        +{formatPrice(priceDiff.absolute, comparison.latestPrice.currency)}
                        ({priceDiff.percentage.toFixed(1)}%)
                      </div>
                    )}

                    {isLowest && (
                      <Badge variant="default" className="mt-2 bg-green-600 text-xs">
                        Най-добра цена
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Additional Stats */}
                <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm">
                  <div className="text-center sm:text-left">
                    <div className="text-muted-foreground">Най-ниска историческа</div>
                    <div className="font-semibold text-foreground">
                      {formatPrice(comparison.lowestPrice.price, comparison.lowestPrice.currency)}
                    </div>
                  </div>
                  <div className="text-center sm:text-left">
                    <div className="text-muted-foreground">Средна цена</div>
                    <div className="font-semibold text-foreground">
                      {formatPrice(comparison.averagePrice, comparison.latestPrice.currency)}
                    </div>
                  </div>
                  <div className="text-center sm:text-left">
                    <div className="text-muted-foreground">Брой записи</div>
                    <div className="font-semibold text-foreground">{comparison.priceCount}</div>
                  </div>
                </div>

                {/* Price Trend */}
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Тенденция на цената:</span>
                    <div className="flex items-center">
                      {comparison.latestPrice.price > comparison.averagePrice ? (
                        <div className="flex items-center text-red-600 text-sm">
                          <TrendingUp className="h-4 w-4 mr-1 flex-shrink-0" />
                          Над средната
                        </div>
                      ) : comparison.latestPrice.price < comparison.averagePrice ? (
                        <div className="flex items-center text-green-600 text-sm">
                          <TrendingDown className="h-4 w-4 mr-1 flex-shrink-0" />
                          Под средната
                        </div>
                      ) : (
                        <div className="flex items-center text-muted-foreground text-sm">
                          Средна цена
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">💡 Съвети за пазаруване</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>• Най-добрата цена в момента е в <strong>{lowestPriceComparison?.supermarket.name}</strong></p>
            {comparisons.length > 1 && lowestPriceComparison && (
              <p>• Можете да спестите до <strong>
                {formatPrice(
                  getPriceDifference(
                    comparisons[comparisons.length - 1].latestPrice.price,
                    lowestPriceComparison.latestPrice.price
                  ).absolute,
                  lowestPriceComparison.latestPrice.currency
                )}
              </strong> като пазарувате в най-евтиния магазин</p>
            )}
            <p>• Цените се обновяват редовно - проверявайте за най-актуална информация</p>
            <p>• Следете продукта за да получавате известия при промяна на цената</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
