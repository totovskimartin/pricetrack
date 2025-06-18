import { supabase } from './supabase'

// In-memory cache with TTL support
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.clear()
  }
}

// Global cache instance
const cache = new MemoryCache()

// Cache durations in milliseconds
export const CACHE_DURATIONS = {
  SHORT: 1 * 60 * 1000,      // 1 minute
  MEDIUM: 5 * 60 * 1000,     // 5 minutes
  LONG: 15 * 60 * 1000,      // 15 minutes
  VERY_LONG: 60 * 60 * 1000, // 1 hour
  STATIC: 24 * 60 * 60 * 1000 // 24 hours
} as const

// Generate cache key from query parameters
function generateCacheKey(table: string, query: any, filters?: Record<string, any>): string {
  const baseKey = `${table}_${JSON.stringify(query)}`
  if (filters) {
    return `${baseKey}_${JSON.stringify(filters)}`
  }
  return baseKey
}

// Cached Supabase query wrapper
export async function cachedQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  cacheKey: string,
  ttl: number = CACHE_DURATIONS.MEDIUM
): Promise<{ data: T | null; error: any; fromCache?: boolean }> {
  // Try to get from cache first
  const cached = cache.get<{ data: T | null; error: any }>(cacheKey)
  if (cached) {
    return { ...cached, fromCache: true }
  }

  // Execute query
  const result = await queryFn()
  
  // Cache successful results
  if (!result.error && result.data) {
    cache.set(cacheKey, result, ttl)
  }

  return { ...result, fromCache: false }
}

// Specific caching functions for common queries
export async function getCachedProducts(filters?: {
  category?: string
  approved?: boolean
  limit?: number
  offset?: number
}) {
  const cacheKey = generateCacheKey('products', 'list', filters)
  
  return cachedQuery(
    async () => {
      let query = supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })

      if (filters?.category) {
        query = query.eq('category', filters.category)
      }
      if (filters?.approved !== undefined) {
        query = query.eq('is_approved', filters.approved)
      }
      if (filters?.limit) {
        query = query.limit(filters.limit)
      }
      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
      }

      return await query
    },
    cacheKey,
    CACHE_DURATIONS.MEDIUM
  )
}

export async function getCachedSupermarkets(activeOnly: boolean = true) {
  const cacheKey = generateCacheKey('supermarkets', 'list', { activeOnly })
  
  return cachedQuery(
    async () => {
      let query = supabase
        .from('supermarkets')
        .select('*')
        .order('name')

      if (activeOnly) {
        query = query.eq('is_active', true)
      }

      return await query
    },
    cacheKey,
    CACHE_DURATIONS.LONG // Supermarkets change less frequently
  )
}

export async function getCachedDiscussions(filters?: {
  approved?: boolean
  category?: string
  limit?: number
  offset?: number
}) {
  const cacheKey = generateCacheKey('discussions', 'list', filters)
  
  return cachedQuery(
    async () => {
      let query = supabase
        .from('discussions')
        .select(`
          *,
          created_by_user:users!created_by(full_name, email, username)
        `)
        .order('created_at', { ascending: false })

      if (filters?.approved !== undefined) {
        query = query.eq('is_approved', filters.approved)
      }
      if (filters?.category) {
        query = query.eq('category', filters.category)
      }
      if (filters?.limit) {
        query = query.limit(filters.limit)
      }
      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
      }

      return await query
    },
    cacheKey,
    CACHE_DURATIONS.SHORT // Discussions change more frequently
  )
}

export async function getCachedProduct(id: string) {
  const cacheKey = generateCacheKey('products', 'single', { id })
  
  return cachedQuery(
    async () => {
      return await supabase
        .from('products')
        .select(`
          *,
          prices(*, supermarket:supermarkets(*))
        `)
        .eq('id', id)
        .single()
    },
    cacheKey,
    CACHE_DURATIONS.MEDIUM
  )
}

// Cache invalidation functions
export function invalidateCache(pattern?: string) {
  if (pattern) {
    // Clear specific cache entries matching pattern
    for (const key of cache['cache'].keys()) {
      if (key.includes(pattern)) {
        cache.delete(key)
      }
    }
  } else {
    // Clear all cache
    cache.clear()
  }
}

export function invalidateProductCache(productId?: string) {
  if (productId) {
    invalidateCache(`products_single_${productId}`)
  }
  invalidateCache('products_list')
}

export function invalidateDiscussionCache() {
  invalidateCache('discussions_list')
}

export function invalidateSupermarketCache() {
  invalidateCache('supermarkets_list')
}

// Export cache instance for direct access if needed
export { cache }
