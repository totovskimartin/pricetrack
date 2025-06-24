'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Activity, Clock, Database, Zap } from 'lucide-react'

interface PerformanceMetrics {
  pageLoadTime: number
  domContentLoaded: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  cumulativeLayoutShift: number
  firstInputDelay: number
  cacheHitRate: number
  queryCount: number
  slowQueries: number
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Only show in development or for admin users
    const isDev = process.env.NODE_ENV === 'development'
    const isAdmin = localStorage.getItem('user_role') === 'super_admin'
    
    if (isDev || isAdmin) {
      setIsVisible(true)
      collectMetrics()
    }
  }, [])

  const collectMetrics = () => {
    if (typeof window === 'undefined') return

    // Use Performance API to collect metrics
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    
    // Collect Web Vitals
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
          updateMetric('firstContentfulPaint', entry.startTime)
        }
        if (entry.entryType === 'largest-contentful-paint') {
          updateMetric('largestContentfulPaint', entry.startTime)
        }
        if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
          updateMetric('cumulativeLayoutShift', (entry as any).value)
        }
        if (entry.entryType === 'first-input') {
          updateMetric('firstInputDelay', (entry as any).processingStart - entry.startTime)
        }
      }
    })

    try {
      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift', 'first-input'] })
    } catch (e) {
      // Fallback for browsers that don't support all entry types
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('Some performance metrics not available:', e)
      }
    }

    // Basic navigation timing
    if (navigation) {
      const pageLoadTime = navigation.loadEventEnd - navigation.startTime
      const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.startTime

      setMetrics(prev => ({
        ...prev,
        pageLoadTime,
        domContentLoaded,
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        cumulativeLayoutShift: 0,
        firstInputDelay: 0,
        cacheHitRate: getCacheHitRate(),
        queryCount: getQueryCount(),
        slowQueries: getSlowQueryCount()
      }))
    }
  }

  const updateMetric = (key: keyof PerformanceMetrics, value: number) => {
    setMetrics(prev => prev ? { ...prev, [key]: value } : null)
  }

  const getCacheHitRate = (): number => {
    // Get cache hit rate from our cache implementation
    try {
      const cacheStats = (window as any).__CACHE_STATS__ || { hits: 0, misses: 0 }
      const total = cacheStats.hits + cacheStats.misses
      return total > 0 ? (cacheStats.hits / total) * 100 : 0
    } catch {
      return 0
    }
  }

  const getQueryCount = (): number => {
    // Get query count from Supabase or our query tracker
    return (window as any).__QUERY_COUNT__ || 0
  }

  const getSlowQueryCount = (): number => {
    // Get slow query count (queries > 1000ms)
    return (window as any).__SLOW_QUERY_COUNT__ || 0
  }

  const getPerformanceScore = (): { score: number; color: string } => {
    if (!metrics) return { score: 0, color: 'gray' }

    let score = 100

    // Page load time penalty
    if (metrics.pageLoadTime > 3000) score -= 20
    else if (metrics.pageLoadTime > 2000) score -= 10
    else if (metrics.pageLoadTime > 1000) score -= 5

    // LCP penalty
    if (metrics.largestContentfulPaint > 4000) score -= 20
    else if (metrics.largestContentfulPaint > 2500) score -= 10

    // CLS penalty
    if (metrics.cumulativeLayoutShift > 0.25) score -= 15
    else if (metrics.cumulativeLayoutShift > 0.1) score -= 5

    // FID penalty
    if (metrics.firstInputDelay > 300) score -= 15
    else if (metrics.firstInputDelay > 100) score -= 5

    // Cache hit rate bonus
    if (metrics.cacheHitRate > 80) score += 5
    else if (metrics.cacheHitRate < 50) score -= 10

    // Slow queries penalty
    if (metrics.slowQueries > 5) score -= 15
    else if (metrics.slowQueries > 2) score -= 5

    const color = score >= 90 ? 'green' : score >= 70 ? 'yellow' : 'red'
    return { score: Math.max(0, score), color }
  }

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const clearCache = () => {
    if (typeof window !== 'undefined') {
      // Clear our application cache
      import('@/lib/cache').then(({ invalidateCache }) => {
        invalidateCache()
        // Reset cache stats
        ;(window as any).__CACHE_STATS__ = { hits: 0, misses: 0 }
        collectMetrics()
      })
    }
  }

  if (!isVisible || !metrics) return null

  const { score, color } = getPerformanceScore()

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className="bg-card/95 backdrop-blur-sm border shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Performance
            </div>
            <Badge variant={color === 'green' ? 'default' : color === 'yellow' ? 'secondary' : 'destructive'}>
              {score}/100
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-blue-500" />
              <span>Load: {formatTime(metrics.pageLoadTime)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-green-500" />
              <span>FCP: {formatTime(metrics.firstContentfulPaint)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Database className="h-3 w-3 text-purple-500" />
              <span>Cache: {metrics.cacheHitRate.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-1">
              <Activity className="h-3 w-3 text-orange-500" />
              <span>Queries: {metrics.queryCount}</span>
            </div>
          </div>
          
          {metrics.slowQueries > 0 && (
            <div className="text-red-600 font-medium">
              ⚠️ {metrics.slowQueries} slow queries detected
            </div>
          )}

          <div className="flex gap-1 pt-1">
            <Button size="sm" variant="outline" onClick={collectMetrics} className="text-xs h-6">
              Refresh
            </Button>
            <Button size="sm" variant="outline" onClick={clearCache} className="text-xs h-6">
              Clear Cache
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Hook to track query performance
export function useQueryPerformance() {
  const trackQuery = (queryName: string, startTime: number, endTime: number) => {
    const duration = endTime - startTime
    
    if (typeof window !== 'undefined') {
      // Update query count
      ;(window as any).__QUERY_COUNT__ = ((window as any).__QUERY_COUNT__ || 0) + 1
      
      // Track slow queries (> 1000ms)
      if (duration > 1000) {
        ;(window as any).__SLOW_QUERY_COUNT__ = ((window as any).__SLOW_QUERY_COUNT__ || 0) + 1
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Slow query detected: ${queryName} took ${duration}ms`)
        }
      }
    }
  }

  const trackCacheHit = (hit: boolean) => {
    if (typeof window !== 'undefined') {
      const stats = (window as any).__CACHE_STATS__ || { hits: 0, misses: 0 }
      if (hit) {
        stats.hits++
      } else {
        stats.misses++
      }
      ;(window as any).__CACHE_STATS__ = stats
    }
  }

  return { trackQuery, trackCacheHit }
}
