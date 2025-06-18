const CACHE_NAME = 'pricetrack-bg-v1'
const STATIC_CACHE_NAME = 'pricetrack-bg-static-v1'
const DYNAMIC_CACHE_NAME = 'pricetrack-bg-dynamic-v1'

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/bg',
  '/bg/products',
  '/bg/supermarkets',
  '/bg/discussions',
  '/manifest.json',
  // Add other critical assets
]

// API routes to cache with different strategies
const API_CACHE_PATTERNS = [
  { pattern: /\/api\/products/, strategy: 'staleWhileRevalidate', ttl: 300000 }, // 5 minutes
  { pattern: /\/api\/supermarkets/, strategy: 'cacheFirst', ttl: 3600000 }, // 1 hour
  { pattern: /\/api\/discussions/, strategy: 'networkFirst', ttl: 60000 }, // 1 minute
  { pattern: /\/api\/settings/, strategy: 'cacheFirst', ttl: 1800000 }, // 30 minutes
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets...')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        console.log('Static assets cached successfully')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('Failed to cache static assets:', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('Service Worker activated')
        return self.clients.claim()
      })
  )
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return
  }

  // Handle API requests with specific strategies
  for (const { pattern, strategy, ttl } of API_CACHE_PATTERNS) {
    if (pattern.test(url.pathname)) {
      event.respondWith(handleApiRequest(request, strategy, ttl))
      return
    }
  }

  // Handle static assets
  if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request))
    return
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request))
    return
  }

  // Default: network first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const responseClone = response.clone()
          caches.open(DYNAMIC_CACHE_NAME)
            .then((cache) => cache.put(request, responseClone))
        }
        return response
      })
      .catch(() => {
        return caches.match(request)
      })
  )
})

// Handle API requests with different caching strategies
async function handleApiRequest(request, strategy, ttl) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME)
  const cachedResponse = await cache.match(request)

  switch (strategy) {
    case 'cacheFirst':
      if (cachedResponse && !isExpired(cachedResponse, ttl)) {
        return cachedResponse
      }
      try {
        const networkResponse = await fetch(request)
        if (networkResponse.ok) {
          const responseClone = networkResponse.clone()
          await cache.put(request, addTimestamp(responseClone))
        }
        return networkResponse
      } catch {
        return cachedResponse || new Response('Network error', { status: 503 })
      }

    case 'networkFirst':
      try {
        const networkResponse = await fetch(request)
        if (networkResponse.ok) {
          const responseClone = networkResponse.clone()
          await cache.put(request, addTimestamp(responseClone))
        }
        return networkResponse
      } catch {
        return cachedResponse || new Response('Network error', { status: 503 })
      }

    case 'staleWhileRevalidate':
      const networkPromise = fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone()
            cache.put(request, addTimestamp(responseClone))
          }
          return response
        })
        .catch(() => null)

      if (cachedResponse && !isExpired(cachedResponse, ttl)) {
        networkPromise // Update cache in background
        return cachedResponse
      }

      return networkPromise || cachedResponse || new Response('Network error', { status: 503 })

    default:
      return fetch(request)
  }
}

// Handle static assets (images, CSS, JS)
async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE_NAME)
  const cachedResponse = await cache.match(request)

  if (cachedResponse) {
    return cachedResponse
  }

  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone()
      await cache.put(request, responseClone)
    }
    return networkResponse
  } catch {
    return new Response('Asset not found', { status: 404 })
  }
}

// Handle navigation requests
async function handleNavigation(request) {
  try {
    const networkResponse = await fetch(request)
    return networkResponse
  } catch {
    // Return cached page or offline page
    const cache = await caches.open(STATIC_CACHE_NAME)
    const cachedResponse = await cache.match('/bg') // Fallback to home page
    return cachedResponse || new Response('Offline', { status: 503 })
  }
}

// Utility functions
function isStaticAsset(url) {
  return url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/) ||
         url.pathname.startsWith('/_next/static/') ||
         url.pathname.startsWith('/_next/image/')
}

function addTimestamp(response) {
  const headers = new Headers(response.headers)
  headers.set('sw-cached-at', Date.now().toString())
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

function isExpired(response, ttl) {
  const cachedAt = response.headers.get('sw-cached-at')
  if (!cachedAt) return true
  
  const age = Date.now() - parseInt(cachedAt)
  return age > ttl
}

// Message handling for cache management
self.addEventListener('message', (event) => {
  const { type, payload } = event.data

  switch (type) {
    case 'CLEAR_CACHE':
      clearCache(payload?.pattern)
        .then(() => {
          event.ports[0].postMessage({ success: true })
        })
        .catch((error) => {
          event.ports[0].postMessage({ success: false, error: error.message })
        })
      break

    case 'GET_CACHE_SIZE':
      getCacheSize()
        .then((size) => {
          event.ports[0].postMessage({ size })
        })
        .catch((error) => {
          event.ports[0].postMessage({ error: error.message })
        })
      break

    default:
      console.log('Unknown message type:', type)
  }
})

async function clearCache(pattern) {
  const cacheNames = await caches.keys()
  
  if (pattern) {
    // Clear specific cache entries matching pattern
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName)
      const requests = await cache.keys()
      
      for (const request of requests) {
        if (request.url.includes(pattern)) {
          await cache.delete(request)
        }
      }
    }
  } else {
    // Clear all dynamic caches
    await caches.delete(DYNAMIC_CACHE_NAME)
  }
}

async function getCacheSize() {
  const cacheNames = await caches.keys()
  let totalSize = 0

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName)
    const requests = await cache.keys()
    totalSize += requests.length
  }

  return totalSize
}
