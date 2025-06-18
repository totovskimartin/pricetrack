import { useState, useEffect, useCallback, useRef } from 'react'
import { cachedQuery, CACHE_DURATIONS } from '@/lib/cache'

interface UseCachedQueryOptions {
  enabled?: boolean
  refetchOnMount?: boolean
  refetchOnWindowFocus?: boolean
  staleTime?: number
  cacheTime?: number
  onSuccess?: (data: any) => void
  onError?: (error: any) => void
}

interface UseCachedQueryResult<T> {
  data: T | null
  error: any
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
  isFetching: boolean
  fromCache: boolean
  refetch: () => Promise<void>
  invalidate: () => void
}

export function useCachedQuery<T>(
  queryKey: string | string[],
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options: UseCachedQueryOptions = {}
): UseCachedQueryResult<T> {
  const {
    enabled = true,
    refetchOnMount = true,
    refetchOnWindowFocus = false,
    staleTime = CACHE_DURATIONS.MEDIUM,
    cacheTime = CACHE_DURATIONS.MEDIUM,
    onSuccess,
    onError
  } = options

  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [fromCache, setFromCache] = useState(false)

  const queryKeyString = Array.isArray(queryKey) ? queryKey.join('_') : queryKey
  const mountedRef = useRef(true)
  const lastFetchRef = useRef<number>(0)

  const executeQuery = useCallback(async (force = false) => {
    if (!enabled) return
    
    const now = Date.now()
    
    // Skip if recently fetched and not forced
    if (!force && now - lastFetchRef.current < 1000) {
      return
    }

    setIsFetching(true)
    if (!data) {
      setIsLoading(true)
    }
    setError(null)

    try {
      const result = await cachedQuery(queryFn, queryKeyString, cacheTime)
      
      if (!mountedRef.current) return

      if (result.error) {
        setError(result.error)
        onError?.(result.error)
      } else {
        setData(result.data)
        setFromCache(result.fromCache || false)
        onSuccess?.(result.data)
      }
      
      lastFetchRef.current = now
    } catch (err) {
      if (!mountedRef.current) return
      setError(err)
      onError?.(err)
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
        setIsFetching(false)
      }
    }
  }, [enabled, queryFn, queryKeyString, cacheTime, data, onSuccess, onError])

  const refetch = useCallback(() => executeQuery(true), [executeQuery])

  const invalidate = useCallback(() => {
    setData(null)
    setError(null)
    setFromCache(false)
    executeQuery(true)
  }, [executeQuery])

  // Initial fetch
  useEffect(() => {
    if (enabled && refetchOnMount) {
      executeQuery()
    }
  }, [enabled, refetchOnMount, executeQuery])

  // Window focus refetch
  useEffect(() => {
    if (!refetchOnWindowFocus) return

    const handleFocus = () => {
      if (enabled) {
        executeQuery()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [enabled, refetchOnWindowFocus, executeQuery])

  // Cleanup
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const isError = !!error
  const isSuccess = !!data && !error

  return {
    data,
    error,
    isLoading,
    isError,
    isSuccess,
    isFetching,
    fromCache,
    refetch,
    invalidate
  }
}

// Specialized hooks for common queries
export function useCachedProducts(filters?: {
  category?: string
  approved?: boolean
  limit?: number
  offset?: number
}) {
  return useCachedQuery(
    ['products', 'list', JSON.stringify(filters)],
    async () => {
      const { getCachedProducts } = await import('@/lib/cache')
      return getCachedProducts(filters)
    },
    {
      staleTime: CACHE_DURATIONS.MEDIUM,
      cacheTime: CACHE_DURATIONS.LONG
    }
  )
}

export function useCachedSupermarkets(activeOnly: boolean = true) {
  return useCachedQuery(
    ['supermarkets', 'list', activeOnly.toString()],
    async () => {
      const { getCachedSupermarkets } = await import('@/lib/cache')
      return getCachedSupermarkets(activeOnly)
    },
    {
      staleTime: CACHE_DURATIONS.LONG,
      cacheTime: CACHE_DURATIONS.VERY_LONG
    }
  )
}

export function useCachedDiscussions(filters?: {
  approved?: boolean
  category?: string
  limit?: number
  offset?: number
}) {
  return useCachedQuery(
    ['discussions', 'list', JSON.stringify(filters)],
    async () => {
      const { getCachedDiscussions } = await import('@/lib/cache')
      return getCachedDiscussions(filters)
    },
    {
      staleTime: CACHE_DURATIONS.SHORT,
      cacheTime: CACHE_DURATIONS.MEDIUM
    }
  )
}

export function useCachedProduct(id: string) {
  return useCachedQuery(
    ['products', 'single', id],
    async () => {
      const { getCachedProduct } = await import('@/lib/cache')
      return getCachedProduct(id)
    },
    {
      enabled: !!id,
      staleTime: CACHE_DURATIONS.MEDIUM,
      cacheTime: CACHE_DURATIONS.LONG
    }
  )
}

// Hook for cache management
export function useCacheManager() {
  const invalidateProducts = useCallback(() => {
    import('@/lib/cache').then(({ invalidateProductCache }) => {
      invalidateProductCache()
    })
  }, [])

  const invalidateDiscussions = useCallback(() => {
    import('@/lib/cache').then(({ invalidateDiscussionCache }) => {
      invalidateDiscussionCache()
    })
  }, [])

  const invalidateSupermarkets = useCallback(() => {
    import('@/lib/cache').then(({ invalidateSupermarketCache }) => {
      invalidateSupermarketCache()
    })
  }, [])

  const invalidateAll = useCallback(() => {
    import('@/lib/cache').then(({ invalidateCache }) => {
      invalidateCache()
    })
  }, [])

  return {
    invalidateProducts,
    invalidateDiscussions,
    invalidateSupermarkets,
    invalidateAll
  }
}
