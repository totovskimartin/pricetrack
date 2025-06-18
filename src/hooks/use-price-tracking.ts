'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { supabase } from '@/lib/supabase'

export interface TrackedProduct {
  id: string
  user_id: string
  product_id: string
  target_price_bgn?: number
  is_active: boolean
  created_at: string
  updated_at: string
  product?: {
    id: string
    name: string
    category: string
    brand?: string
    image_url?: string
  }
  latest_price?: {
    price: number
    currency: string
    supermarket_name: string
    created_at: string
  }
}

export function usePriceTracking() {
  const { user } = useAuth()
  const [trackedProducts, setTrackedProducts] = useState<TrackedProduct[]>([])
  const [trackingIds, setTrackingIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Load tracked products from database
  useEffect(() => {
    if (user) {
      fetchUserTracking()
    } else {
      setTrackedProducts([])
      setTrackingIds([])
    }
  }, [user])

  const fetchUserTracking = async () => {
    if (!user) return

    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 3000)
      )

      const queryPromise = supabase
        .from('user_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any

      if (!error && data) {
        const productIds = data.map(track => track.product_id)
        setTrackingIds(productIds)

        // Fetch full tracking data with product details (non-blocking)
        fetchTrackedProductsDetails(data).catch(err =>
          console.log('Failed to fetch tracked product details:', err)
        )
      } else {
        // Fallback to localStorage if database isn't set up yet
        const localTracking = JSON.parse(localStorage.getItem(`tracking_${user.id}`) || '[]')
        setTrackingIds(localTracking)
      }
    } catch (error) {
      console.log('Tracking query failed, using localStorage fallback:', error)
      // Fallback to localStorage
      const localTracking = JSON.parse(localStorage.getItem(`tracking_${user.id}`) || '[]')
      setTrackingIds(localTracking)
    }
  }

  const fetchTrackedProductsDetails = async (trackingData: any[]) => {
    if (!trackingData.length) {
      setTrackedProducts([])
      return
    }

    setLoading(true)
    try {
      const productIds = trackingData.map(t => t.product_id)

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000)
      )

      // Run both queries in parallel for better performance
      const [productsResult, pricesResult] = await Promise.race([
        Promise.all([
          supabase
            .from('products')
            .select('id, name, category, brand, image_url')
            .in('id', productIds),
          supabase
            .from('prices')
            .select(`
              product_id,
              price_bgn,
              created_at,
              supermarkets (name)
            `)
            .in('product_id', productIds)
            .order('created_at', { ascending: false })
        ]),
        timeoutPromise
      ]) as any

      const { data: productsData } = productsResult
      const { data: pricesData } = pricesResult

      // Combine tracking data with product and price info
      const trackedWithDetails: TrackedProduct[] = trackingData.map(tracking => {
        const product = productsData?.find(p => p.id === tracking.product_id)
        const latestPrice = pricesData?.find(price => price.product_id === tracking.product_id)

        return {
          ...tracking,
          product,
          latest_price: latestPrice ? {
            price: latestPrice.price_bgn,
            currency: 'BGN',
            supermarket_name: latestPrice.supermarkets?.name || 'Неизвестен',
            created_at: latestPrice.created_at
          } : undefined
        }
      })

      setTrackedProducts(trackedWithDetails)
    } catch (error) {
      console.log('Failed to fetch tracked product details:', error)
      setTrackedProducts([])
    } finally {
      setLoading(false)
    }
  }

  const addToTracking = async (productId: string, targetPrice?: number) => {
    if (!user) return false

    try {
      // First check if a record already exists (active or inactive)
      const { data: existingRecord } = await supabase
        .from('user_tracking')
        .select('id, is_active')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .single()

      let error = null

      if (existingRecord) {
        // Update existing record to active
        const result = await supabase
          .from('user_tracking')
          .update({
            is_active: true,
            target_price_bgn: targetPrice,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('product_id', productId)
        error = result.error
      } else {
        // Insert new record
        const result = await supabase
          .from('user_tracking')
          .insert({
            user_id: user.id,
            product_id: productId,
            target_price_bgn: targetPrice,
            is_active: true
          })
        error = result.error
      }

      if (!error) {
        // Success - update local state
        const newTrackingIds = [...trackingIds, productId]
        setTrackingIds(newTrackingIds)
        // Also update localStorage as backup
        localStorage.setItem(`tracking_${user.id}`, JSON.stringify(newTrackingIds))

        // Refresh tracked products
        await fetchUserTracking()
        return true
      } else {
        console.log('Database error:', error)
        // Fallback to localStorage
        const currentTracking = JSON.parse(localStorage.getItem(`tracking_${user.id}`) || '[]')
        if (currentTracking.includes(productId)) return false

        const newTrackingIds = [...currentTracking, productId]
        localStorage.setItem(`tracking_${user.id}`, JSON.stringify(newTrackingIds))
        setTrackingIds(newTrackingIds)
        return true
      }
    } catch (error) {
      console.log('Tracking error:', error)
      // Fallback to localStorage
      const currentTracking = JSON.parse(localStorage.getItem(`tracking_${user.id}`) || '[]')
      if (currentTracking.includes(productId)) return false

      const newTrackingIds = [...currentTracking, productId]
      localStorage.setItem(`tracking_${user.id}`, JSON.stringify(newTrackingIds))
      setTrackingIds(newTrackingIds)
      return true
    }
  }

  const removeFromTracking = async (productId: string) => {
    if (!user) return false

    try {
      // Try to remove from database first
      const { error } = await supabase
        .from('user_tracking')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('product_id', productId)

      if (!error) {
        // Success - update local state
        const newTrackingIds = trackingIds.filter(id => id !== productId)
        setTrackingIds(newTrackingIds)
        // Also update localStorage as backup
        localStorage.setItem(`tracking_${user.id}`, JSON.stringify(newTrackingIds))
        
        // Refresh tracked products
        await fetchUserTracking()
        return true
      } else {
        // Fallback to localStorage
        const currentTracking = JSON.parse(localStorage.getItem(`tracking_${user.id}`) || '[]')
        const newTrackingIds = currentTracking.filter((id: string) => id !== productId)
        localStorage.setItem(`tracking_${user.id}`, JSON.stringify(newTrackingIds))
        setTrackingIds(newTrackingIds)
        return true
      }
    } catch (error) {
      // Fallback to localStorage
      const currentTracking = JSON.parse(localStorage.getItem(`tracking_${user.id}`) || '[]')
      const newTrackingIds = currentTracking.filter((id: string) => id !== productId)
      localStorage.setItem(`tracking_${user.id}`, JSON.stringify(newTrackingIds))
      setTrackingIds(newTrackingIds)
      return true
    }
  }

  const updateTargetPrice = async (productId: string, targetPrice: number) => {
    if (!user) return false

    try {
      const { error } = await supabase
        .from('user_tracking')
        .update({ 
          target_price_bgn: targetPrice,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('product_id', productId)

      if (!error) {
        // Refresh tracked products to show updated target price
        await fetchUserTracking()
        return true
      }
    } catch (error) {
      // Handle error silently
    }
    return false
  }

  const toggleTracking = async (productId: string, targetPrice?: number) => {
    if (!user) return false

    const isTrackingNow = trackingIds.includes(productId)
    
    if (isTrackingNow) {
      return await removeFromTracking(productId)
    } else {
      return await addToTracking(productId, targetPrice)
    }
  }

  const isTracking = (productId: string) => {
    return trackingIds.includes(productId)
  }

  const clearAllTracking = () => {
    if (!user) return

    localStorage.removeItem(`tracking_${user.id}`)
    setTrackingIds([])
    setTrackedProducts([])
  }

  return {
    trackedProducts,
    trackingIds,
    loading,
    addToTracking,
    removeFromTracking,
    updateTargetPrice,
    toggleTracking,
    isTracking,
    clearAllTracking,
    refetch: fetchUserTracking
  }
}
