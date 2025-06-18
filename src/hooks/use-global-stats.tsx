'use client'

import { createContext, useContext, useState, useCallback } from 'react'

interface GlobalStatsContextType {
  refreshTrigger: number
  triggerRefresh: () => void
  incrementFavorites: (productId: string) => void
  decrementFavorites: (productId: string) => void
}

const GlobalStatsContext = createContext<GlobalStatsContextType>({
  refreshTrigger: 0,
  triggerRefresh: () => {},
  incrementFavorites: () => {},
  decrementFavorites: () => {}
})

export function GlobalStatsProvider({ children }: { children: React.ReactNode }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [localStats, setLocalStats] = useState<Record<string, { favorites: number }>>({})

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1)
  }, [])

  const incrementFavorites = useCallback((productId: string) => {
    setLocalStats(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        favorites: (prev[productId]?.favorites || 0) + 1
      }
    }))
    triggerRefresh()
  }, [triggerRefresh])

  const decrementFavorites = useCallback((productId: string) => {
    setLocalStats(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        favorites: Math.max((prev[productId]?.favorites || 0) - 1, 0)
      }
    }))
    triggerRefresh()
  }, [triggerRefresh])

  return (
    <GlobalStatsContext.Provider value={{
      refreshTrigger,
      triggerRefresh,
      incrementFavorites,
      decrementFavorites
    }}>
      {children}
    </GlobalStatsContext.Provider>
  )
}

export function useGlobalStats() {
  const context = useContext(GlobalStatsContext)
  if (!context) {
    throw new Error('useGlobalStats must be used within a GlobalStatsProvider')
  }
  return context
}