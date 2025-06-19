import { useState, useEffect, useCallback } from 'react'
import { getProductCommentCount, checkCommentsTableExists } from '@/lib/comments'

interface UseCommentCountReturn {
  commentCount: number
  loading: boolean
  error: string | null
  tableExists: boolean
  refetch: () => Promise<void>
}

/**
 * Hook to fetch and manage comment count for a product
 * @param productId - The ID of the product
 * @param enabled - Whether to fetch the comment count (default: true)
 * @returns Object with comment count, loading state, error, and refetch function
 */
export function useCommentCount(productId: string | null, enabled: boolean = true): UseCommentCountReturn {
  const [commentCount, setCommentCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tableExists, setTableExists] = useState(true)

  const fetchCommentCount = useCallback(async () => {
    if (!productId || !enabled) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Check if comments table exists
      const exists = await checkCommentsTableExists()
      setTableExists(exists)
      
      if (!exists) {
        setCommentCount(0)
        setLoading(false)
        return
      }

      // Fetch comment count
      const count = await getProductCommentCount(productId)
      setCommentCount(count)
    } catch (err) {
      console.error('Error fetching comment count:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setCommentCount(0)
      setTableExists(false)
    } finally {
      setLoading(false)
    }
  }, [productId, enabled])

  useEffect(() => {
    fetchCommentCount()
  }, [fetchCommentCount])

  return {
    commentCount,
    loading,
    error,
    tableExists,
    refetch: fetchCommentCount
  }
}

/**
 * Hook to fetch comment counts for multiple products
 * @param productIds - Array of product IDs
 * @param enabled - Whether to fetch the comment counts (default: true)
 * @returns Object with comment counts, loading state, error, and refetch function
 */
export function useMultipleCommentCounts(productIds: string[], enabled: boolean = true) {
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tableExists, setTableExists] = useState(true)

  const fetchCommentCounts = useCallback(async () => {
    if (!enabled || productIds.length === 0) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Check if comments table exists
      const exists = await checkCommentsTableExists()
      setTableExists(exists)
      
      if (!exists) {
        const emptyCounts: Record<string, number> = {}
        productIds.forEach(id => emptyCounts[id] = 0)
        setCommentCounts(emptyCounts)
        setLoading(false)
        return
      }

      // Fetch comment counts for all products
      const counts: Record<string, number> = {}
      await Promise.all(
        productIds.map(async (productId) => {
          const count = await getProductCommentCount(productId)
          counts[productId] = count
        })
      )
      
      setCommentCounts(counts)
    } catch (err) {
      console.error('Error fetching multiple comment counts:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      const emptyCounts: Record<string, number> = {}
      productIds.forEach(id => emptyCounts[id] = 0)
      setCommentCounts(emptyCounts)
      setTableExists(false)
    } finally {
      setLoading(false)
    }
  }, [productIds, enabled])

  useEffect(() => {
    fetchCommentCounts()
  }, [fetchCommentCounts])

  return {
    commentCounts,
    loading,
    error,
    tableExists,
    refetch: fetchCommentCounts
  }
}
