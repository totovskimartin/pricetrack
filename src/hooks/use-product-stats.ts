'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface ProductStats {
  product_id: string
  favorites_count: number
  tracking_count: number
  comments_count: number
  total_upvotes: number
}

export function useProductStats(productId?: string) {
  const [stats, setStats] = useState<ProductStats | null>(null)
  const [allStats, setAllStats] = useState<Record<string, ProductStats>>({})
  const [loading, setLoading] = useState(false)

  // Fetch stats for a single product from actual tables
  const fetchProductStats = async (id: string) => {
    try {
      // Fetch favorites count
      const { count: favoritesCount } = await supabase
        .from('user_favorites')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', id)

      // Fetch tracking count
      const { count: trackingCount } = await supabase
        .from('user_tracking')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', id)
        .eq('is_active', true)

      // Fetch comments count
      const { count: commentsCount } = await supabase
        .from('product_comments')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', id)
        .is('parent_comment_id', null) // Only top-level comments

      // Fetch total upvotes from comments
      const { data: commentsData } = await supabase
        .from('product_comments')
        .select('likes')
        .eq('product_id', id)

      const totalUpvotes = commentsData?.reduce((sum, comment) => sum + (comment.likes || 0), 0) || 0

      return {
        product_id: id,
        favorites_count: favoritesCount || 0,
        tracking_count: trackingCount || 0,
        comments_count: commentsCount || 0,
        total_upvotes: totalUpvotes
      }
    } catch (error) {
      console.error('Error fetching product stats:', error)
      // Return default stats if there's an error
      return {
        product_id: id,
        favorites_count: 0,
        tracking_count: 0,
        comments_count: 0,
        total_upvotes: 0
      }
    }
  }

  // Fetch stats for multiple products using database function
  const fetchMultipleProductStats = async (productIds: string[]) => {
    if (productIds.length === 0) return {}

    setLoading(true)
    try {
      // Use the database function for better performance
      const { data, error } = await supabase
        .rpc('get_multiple_products_stats', {
          p_product_ids: productIds
        })

      if (error) {
        console.error('Database function error:', error)
        throw error
      }

      // Process the data into stats map
      const statsMap: Record<string, ProductStats> = {}

      // Initialize all products with zero stats
      productIds.forEach(id => {
        statsMap[id] = {
          product_id: id,
          favorites_count: 0,
          tracking_count: 0,
          comments_count: 0,
          total_upvotes: 0
        }
      })

      // Update with actual data
      data?.forEach((item: any) => {
        statsMap[item.product_id] = {
          product_id: item.product_id,
          favorites_count: item.favorites_count || 0,
          tracking_count: item.tracking_count || 0,
          comments_count: item.comments_count || 0,
          total_upvotes: item.total_likes || 0
        }
      })

      console.log('Product stats fetched:', statsMap)
      setAllStats(statsMap)
      setLoading(false)
      return statsMap
    } catch (error) {
      console.error('Error fetching multiple product stats:', error)

      // Fallback to manual queries if function doesn't exist
      return await fetchMultipleProductStatsManual(productIds)
    }
  }

  // Fallback manual method
  const fetchMultipleProductStatsManual = async (productIds: string[]) => {
    try {
      // Fetch all favorites counts
      const { data: favoritesData } = await supabase
        .from('user_favorites')
        .select('product_id')
        .in('product_id', productIds)

      // Fetch all tracking counts
      const { data: trackingData } = await supabase
        .from('user_tracking')
        .select('product_id')
        .in('product_id', productIds)
        .eq('is_active', true)

      // Fetch all comments counts
      const { data: commentsData } = await supabase
        .from('product_comments')
        .select('product_id')
        .in('product_id', productIds)
        .is('parent_comment_id', null)

      // Fetch all likes for upvotes calculation
      const { data: likesData } = await supabase
        .from('product_comments')
        .select('product_id, likes')
        .in('product_id', productIds)

      // Process the data into stats
      const statsMap: Record<string, ProductStats> = {}

      // Initialize all products with zero stats
      productIds.forEach(id => {
        statsMap[id] = {
          product_id: id,
          favorites_count: 0,
          tracking_count: 0,
          comments_count: 0,
          total_upvotes: 0
        }
      })

      // Count favorites
      favoritesData?.forEach(item => {
        if (statsMap[item.product_id]) {
          statsMap[item.product_id].favorites_count++
        }
      })

      // Count tracking
      trackingData?.forEach(item => {
        if (statsMap[item.product_id]) {
          statsMap[item.product_id].tracking_count++
        }
      })

      // Count comments
      commentsData?.forEach(item => {
        if (statsMap[item.product_id]) {
          statsMap[item.product_id].comments_count++
        }
      })

      // Sum upvotes
      likesData?.forEach(item => {
        if (statsMap[item.product_id]) {
          statsMap[item.product_id].total_upvotes += item.likes || 0
        }
      })

      console.log('Product stats fetched (manual):', statsMap)
      setAllStats(statsMap)
      setLoading(false)
      return statsMap
    } catch (error) {
      console.error('Error in manual stats fetch:', error)

      // Return default stats for all products
      const defaultStats: Record<string, ProductStats> = {}
      productIds.forEach(id => {
        defaultStats[id] = {
          product_id: id,
          favorites_count: 0,
          tracking_count: 0,
          comments_count: 0,
          total_upvotes: 0
        }
      })

      setAllStats(defaultStats)
      setLoading(false)
      return defaultStats
    }
  }

  // Load stats for single product
  useEffect(() => {
    if (productId) {
      setLoading(true)
      fetchProductStats(productId).then(productStats => {
        setStats(productStats)
        setLoading(false)
      })
    }
  }, [productId])

  // Get stats for a specific product from the cache
  const getProductStats = (id: string): ProductStats => {
    return allStats[id] || {
      product_id: id,
      favorites_count: 0,
      tracking_count: 0,
      comments_count: 0,
      total_upvotes: 0
    }
  }

  // Refresh stats for a single product
  const refreshProductStats = async (id: string) => {
    const newStats = await fetchProductStats(id)
    if (id === productId) {
      setStats(newStats)
    }
    setAllStats(prev => ({
      ...prev,
      [id]: newStats
    }))
    return newStats
  }

  // Increment a specific stat (for optimistic updates)
  const incrementStat = (id: string, statType: keyof Omit<ProductStats, 'product_id'>, increment: number = 1) => {
    setAllStats(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [statType]: (prev[id]?.[statType] || 0) + increment
      }
    }))

    if (id === productId && stats) {
      setStats(prev => prev ? {
        ...prev,
        [statType]: (prev[statType] || 0) + increment
      } : null)
    }
  }

  return {
    stats, // Single product stats
    allStats, // All product stats cache
    loading,
    fetchProductStats,
    fetchMultipleProductStats,
    getProductStats,
    refreshProductStats,
    incrementStat
  }
}

// Hook for getting stats for multiple products (for product lists)
export function useProductListStats(productIds: string[]) {
  const { allStats, loading, fetchMultipleProductStats, getProductStats } = useProductStats()

  useEffect(() => {
    if (productIds.length > 0) {
      fetchMultipleProductStats(productIds)
    }
  }, [productIds.join(',')])

  return {
    getProductStats,
    loading,
    refresh: () => fetchMultipleProductStats(productIds)
  }
}
