'use client'

import dynamic from 'next/dynamic'

// Dynamically import the actual notifications component to prevent SSR hydration issues
const NotificationsContent = dynamic(() => import('@/components/notifications/notifications-content'), {
  ssr: false,
  loading: () => (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Зареждане...</p>
      </div>
    </div>
  )
})

export default function NotificationsPage() {
  return <NotificationsContent />
}
