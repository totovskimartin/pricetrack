'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { supabase } from '@/lib/supabase'

export interface PriceSuggestion {
  id: string
  product_id: string
  supermarket_id: string
  suggested_price_bgn: number
  suggested_price_eur: number | null
  current_price_bgn: number | null
  notes: string | null
  status: 'pending' | 'approved' | 'rejected' | 'duplicate'
  suggested_by: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  product?: {
    id: string
    name: string
    image_url?: string
  }
  supermarket?: {
    id: string
    name: string
    logo_url?: string
  }
  user?: {
    id: string
    username: string
    email: string
  }
}

export function usePriceSuggestions() {
  const { user } = useAuth()
  const [suggestions, setSuggestions] = useState<PriceSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchSuggestions()
    }
  }, [user])

  const fetchSuggestions = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('price_suggestions')
        .select(`
          *,
          product:products (
            id,
            name,
            image_url
          ),
          supermarket:supermarkets (
            id,
            name,
            logo_url
          ),
          user:users!price_suggestions_suggested_by_fkey (
            id,
            username,
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      setSuggestions(data || [])
    } catch (err) {
      console.error('Error fetching price suggestions:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch price suggestions')
    } finally {
      setLoading(false)
    }
  }

  const submitSuggestion = async (
    productId: string,
    supermarketId: string,
    suggestedPrice: number,
    currentPrice?: number,
    notes?: string
  ) => {
    if (!user) {
      throw new Error('User must be logged in to submit price suggestions')
    }

    try {
      const { data, error } = await supabase
        .from('price_suggestions')
        .insert({
          product_id: productId,
          supermarket_id: supermarketId,
          suggested_price_bgn: suggestedPrice,
          current_price_bgn: currentPrice || null,
          notes: notes || null,
          suggested_by: user.id
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Refresh suggestions list
      await fetchSuggestions()

      return data
    } catch (err) {
      console.error('Error submitting price suggestion:', err)
      throw err
    }
  }

  const updateSuggestionStatus = async (
    suggestionId: string,
    status: 'approved' | 'rejected' | 'duplicate',
    createPrice: boolean = false
  ) => {
    if (!user) {
      throw new Error('User must be logged in to update price suggestions')
    }

    try {
      const suggestion = suggestions.find(s => s.id === suggestionId)
      if (!suggestion) {
        throw new Error('Suggestion not found')
      }

      // Update suggestion status
      const { error: updateError } = await supabase
        .from('price_suggestions')
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', suggestionId)

      if (updateError) {
        throw updateError
      }

      // If approving and should create price, add to prices table
      if (status === 'approved' && createPrice) {
        const { error: priceError } = await supabase
          .from('prices')
          .insert({
            product_id: suggestion.product_id,
            supermarket_id: suggestion.supermarket_id,
            price_bgn: suggestion.suggested_price_bgn,
            is_verified: true,
            created_by: user.id
          })

        if (priceError) {
          console.error('Error creating price:', priceError)
          // Don't throw here, suggestion was still updated
        }
      }

      // Refresh suggestions list
      await fetchSuggestions()

      return true
    } catch (err) {
      console.error('Error updating price suggestion:', err)
      throw err
    }
  }

  const getUserSuggestions = () => {
    if (!user) return []
    return suggestions.filter(s => s.suggested_by === user.id)
  }

  const getPendingSuggestions = () => {
    return suggestions.filter(s => s.status === 'pending')
  }

  const getApprovedSuggestions = () => {
    return suggestions.filter(s => s.status === 'approved')
  }

  const getRejectedSuggestions = () => {
    return suggestions.filter(s => s.status === 'rejected')
  }

  const getSuggestionsByProduct = (productId: string) => {
    return suggestions.filter(s => s.product_id === productId)
  }

  const getSuggestionsBySupermarket = (supermarketId: string) => {
    return suggestions.filter(s => s.supermarket_id === supermarketId)
  }

  const getStats = () => {
    const total = suggestions.length
    const pending = getPendingSuggestions().length
    const approved = getApprovedSuggestions().length
    const rejected = getRejectedSuggestions().length
    const userSuggestions = getUserSuggestions().length

    return {
      total,
      pending,
      approved,
      rejected,
      userSuggestions
    }
  }

  return {
    suggestions,
    loading,
    error,
    fetchSuggestions,
    submitSuggestion,
    updateSuggestionStatus,
    getUserSuggestions,
    getPendingSuggestions,
    getApprovedSuggestions,
    getRejectedSuggestions,
    getSuggestionsByProduct,
    getSuggestionsBySupermarket,
    getStats
  }
}
