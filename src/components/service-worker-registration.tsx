'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      registerServiceWorker()
    }
  }, [])

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      })

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available, notify user
              if (window.confirm('New version available! Refresh to update?')) {
                window.location.reload()
              }
            }
          })
        }
      })

      // Handle controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service Worker controller changed')
        window.location.reload()
      })

    } catch (error) {
      console.error('Service Worker registration failed:', error)
    }
  }

  return null // This component doesn't render anything
}

// Utility functions for cache management
export const cacheManager = {
  async clearCache(pattern?: string): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      return false
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel()
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.success)
      }

      navigator.serviceWorker.controller!.postMessage(
        { type: 'CLEAR_CACHE', payload: { pattern } },
        [messageChannel.port2]
      )
    })
  },

  async getCacheSize(): Promise<number> {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      return 0
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel()
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.size || 0)
      }

      navigator.serviceWorker.controller!.postMessage(
        { type: 'GET_CACHE_SIZE' },
        [messageChannel.port2]
      )
    })
  },

  async isOnline(): Promise<boolean> {
    return navigator.onLine
  },

  async preloadCriticalResources(): Promise<void> {
    if (!('serviceWorker' in navigator)) return

    const criticalUrls = [
      '/bg/products',
      '/bg/supermarkets',
      '/bg/discussions',
      '/api/supermarkets',
      '/api/settings'
    ]

    // Preload critical resources
    await Promise.allSettled(
      criticalUrls.map(url => 
        fetch(url, { 
          method: 'GET',
          cache: 'force-cache' 
        }).catch(() => {
          // Ignore errors for preloading
        })
      )
    )
  }
}
