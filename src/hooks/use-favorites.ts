'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { supabase } from '@/lib/supabase'

export interface FavoriteProduct {
  id: string
  name: string
  category: string
  brand?: string
  image_url?: string
  latest_price?: {
    price: number
    currency: string
    supermarket_name: string
  }
}

export function useFavorites() {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState<string[]>([])
  const [favoriteProducts, setFavoriteProducts] = useState<FavoriteProduct[]>([])
  const [loading, setLoading] = useState(false)

  // Load favorites from database
  useEffect(() => {
    if (user) {
      fetchUserFavorites()
    } else {
      setFavorites([])
      setFavoriteProducts([])
    }
  }, [user])

  const fetchUserFavorites = useCallback(async () => {
    if (!user) return

    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 3000)
      )

      const queryPromise = supabase
        .from('user_favorites')
        .select('product_id')
        .eq('user_id', user.id)

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any

      if (!error && data) {
        const favoriteIds = data.map((fav: any) => fav.product_id)
        setFavorites(favoriteIds)
      } else {
        // Fallback to localStorage if database isn't set up yet
        const localFavorites = JSON.parse(localStorage.getItem(`favorites_${user.id}`) || '[]')
        setFavorites(localFavorites)
      }
    } catch (error) {
      console.log('Favorites query failed, using localStorage fallback:', error)
      // Fallback to localStorage
      const localFavorites = JSON.parse(localStorage.getItem(`favorites_${user.id}`) || '[]')
      setFavorites(localFavorites)
    }
  }, [user])

  const fetchFavoriteProducts = useCallback(async () => {
    if (!favorites.length) return

    setLoading(true)
    try {
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
            .in('id', favorites),
          supabase
            .from('prices')
            .select(`
              product_id,
              price_bgn,
              created_at,
              supermarkets (name)
            `)
            .in('product_id', favorites)
            .order('created_at', { ascending: false })
        ]),
        timeoutPromise
      ]) as any

      const { data: productsData, error: productsError } = productsResult
      const { data: pricesData } = pricesResult

      if (productsError || !productsData) {
        console.log('Failed to fetch favorite products:', productsError)
        setFavoriteProducts([])
        return
      }

      // Combine products with their latest prices
      const productsWithPrices: FavoriteProduct[] = productsData.map((product: any) => {
        const latestPrice = pricesData?.find((price: any) => price.product_id === product.id)

        return {
          ...product,
          latest_price: latestPrice ? {
            price: latestPrice.price_bgn,
            currency: 'BGN',
            supermarket_name: latestPrice.supermarkets?.name || 'Неизвестен'
          } : undefined
        }
      })

      setFavoriteProducts(productsWithPrices)
    } catch (error) {
      console.log('Favorite products query failed:', error)
      setFavoriteProducts([])
    } finally {
      setLoading(false)
    }
  }, [favorites])

  // Fetch product details for favorites
  useEffect(() => {
    if (favorites.length > 0) {
      fetchFavoriteProducts()
    } else {
      setFavoriteProducts([])
    }
  }, [favorites, fetchFavoriteProducts])

  const addToFavorites = useCallback(async (productId: string) => {
    if (!user) return false

    try {
      // Try to add to database first
      const { error } = await supabase
        .from('user_favorites')
        .insert({
          user_id: user.id,
          product_id: productId
        })

      if (!error) {
        // Success - update local state immediately
        const newFavorites = [...favorites, productId]
        setFavorites(newFavorites)
        // Also update localStorage as backup
        localStorage.setItem(`favorites_${user.id}`, JSON.stringify(newFavorites))
        return true
      } else {
        // Fallback to localStorage
        const currentFavorites = JSON.parse(localStorage.getItem(`favorites_${user.id}`) || '[]')
        if (currentFavorites.includes(productId)) return false

        const newFavorites = [...currentFavorites, productId]
        localStorage.setItem(`favorites_${user.id}`, JSON.stringify(newFavorites))
        setFavorites(newFavorites)
        return true
      }
    } catch (error) {
      // Fallback to localStorage
      const currentFavorites = JSON.parse(localStorage.getItem(`favorites_${user.id}`) || '[]')
      if (currentFavorites.includes(productId)) return false

      const newFavorites = [...currentFavorites, productId]
      localStorage.setItem(`favorites_${user.id}`, JSON.stringify(newFavorites))
      setFavorites(newFavorites)
      return true
    }
  }, [user, favorites])

  const removeFromFavorites = useCallback(async (productId: string) => {
    if (!user) return false

    try {
      // Try to remove from database first
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId)

      if (!error) {
        // Success - update local state immediately
        const newFavorites = favorites.filter(id => id !== productId)
        setFavorites(newFavorites)
        // Also update localStorage as backup
        localStorage.setItem(`favorites_${user.id}`, JSON.stringify(newFavorites))
        return true
      } else {
        // Fallback to localStorage
        const currentFavorites = JSON.parse(localStorage.getItem(`favorites_${user.id}`) || '[]')
        const newFavorites = currentFavorites.filter((id: string) => id !== productId)
        localStorage.setItem(`favorites_${user.id}`, JSON.stringify(newFavorites))
        setFavorites(newFavorites)
        return true
      }
    } catch (error) {
      // Fallback to localStorage
      const currentFavorites = JSON.parse(localStorage.getItem(`favorites_${user.id}`) || '[]')
      const newFavorites = currentFavorites.filter((id: string) => id !== productId)
      localStorage.setItem(`favorites_${user.id}`, JSON.stringify(newFavorites))
      setFavorites(newFavorites)
      return true
    }
  }, [user, favorites])

  const toggleFavorite = useCallback(async (productId: string) => {
    if (!user) return false

    const isFavoriteNow = favorites.includes(productId)

    if (isFavoriteNow) {
      return await removeFromFavorites(productId)
    } else {
      return await addToFavorites(productId)
    }
  }, [user, favorites, removeFromFavorites, addToFavorites])

  const isFavorite = useCallback((productId: string) => {
    return favorites.includes(productId)
  }, [favorites])

  const clearAllFavorites = () => {
    if (!user) return

    localStorage.removeItem(`favorites_${user.id}`)
    setFavorites([])
    setFavoriteProducts([])
  }

  return {
    favorites,
    favoriteProducts,
    loading,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    isFavorite,
    clearAllFavorites,
    refetch: fetchFavoriteProducts,
    refetchFavorites: fetchUserFavorites
  }
}
