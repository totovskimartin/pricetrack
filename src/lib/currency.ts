import { Currency, CurrencyRate } from './types'

// Fixed exchange rate for BGN to EUR (1 EUR = 1.95583 BGN)
// This is the official fixed rate for Bulgaria's Euro adoption
export const BGN_TO_EUR_RATE = 1.95583

/**
 * Convert BGN to EUR using the fixed exchange rate
 */
export function convertBGNToEUR(amountBGN: number): number {
  return Number((amountBGN / BGN_TO_EUR_RATE).toFixed(2))
}

/**
 * Convert EUR to BGN using the fixed exchange rate
 */
export function convertEURToBGN(amountEUR: number): number {
  return Number((amountEUR * BGN_TO_EUR_RATE).toFixed(2))
}

/**
 * Convert between currencies
 */
export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency
): number {
  if (from === to) return amount
  
  if (from === 'BGN' && to === 'EUR') {
    return convertBGNToEUR(amount)
  }
  
  if (from === 'EUR' && to === 'BGN') {
    return convertEURToBGN(amount)
  }
  
  return amount
}

/**
 * Format currency amount with proper symbol and locale
 */
export function formatCurrency(
  amount: number,
  currency: Currency,
  locale: string = 'bg-BG'
): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  
  return formatter.format(amount)
}

/**
 * Format price with both BGN and EUR
 */
export function formatPriceWithBothCurrencies(
  priceBGN: number,
  locale: string = 'bg-BG'
): string {
  const priceEUR = convertBGNToEUR(priceBGN)
  return `${formatCurrency(priceBGN, 'BGN', locale)} / ${formatCurrency(priceEUR, 'EUR', locale)}`
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: Currency): string {
  switch (currency) {
    case 'BGN':
      return 'лв.'
    case 'EUR':
      return '€'
    default:
      return ''
  }
}

/**
 * Parse currency string to number
 */
export function parseCurrencyString(currencyString: string): number {
  // Remove currency symbols and spaces, then parse
  const cleanString = currencyString
    .replace(/[лв.€\s]/g, '')
    .replace(',', '.')
  
  return parseFloat(cleanString) || 0
}

/**
 * Validate currency amount
 */
export function isValidCurrencyAmount(amount: number): boolean {
  return !isNaN(amount) && amount >= 0 && amount <= 999999.99
}

/**
 * Get exchange rate information
 */
export function getExchangeRateInfo(): CurrencyRate {
  return {
    from: 'BGN',
    to: 'EUR',
    rate: BGN_TO_EUR_RATE,
    lastUpdated: new Date().toISOString()
  }
}

/**
 * Calculate price difference percentage
 */
export function calculatePriceDifference(
  oldPrice: number,
  newPrice: number
): {
  difference: number
  percentage: number
  isIncrease: boolean
} {
  const difference = newPrice - oldPrice
  const percentage = oldPrice > 0 ? (difference / oldPrice) * 100 : 0
  
  return {
    difference: Math.abs(difference),
    percentage: Math.abs(percentage),
    isIncrease: difference > 0
  }
}

/**
 * Format price difference for display
 */
export function formatPriceDifference(
  oldPrice: number,
  newPrice: number,
  currency: Currency = 'BGN'
): string {
  const { difference, percentage, isIncrease } = calculatePriceDifference(oldPrice, newPrice)
  const sign = isIncrease ? '+' : '-'
  const arrow = isIncrease ? '↑' : '↓'
  
  return `${arrow} ${sign}${formatCurrency(difference, currency)} (${percentage.toFixed(1)}%)`
}
