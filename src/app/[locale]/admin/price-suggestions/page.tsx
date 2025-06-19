'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/providers/auth-provider'
import { PriceSuggestionsManagement } from '@/components/admin/price-suggestions-management'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: string
}

export default function PriceSuggestionsPage() {
  const { user: authUser, loading: authLoading } = useAuth()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (authUser) {
      fetchUserProfile()
    } else if (!authLoading) {
      router.push('/bg/login')
    }
  }, [authUser, authLoading, router])

  const fetchUserProfile = async () => {
    if (!authUser) return

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role')
        .eq('id', authUser.id)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        router.push('/bg/login')
        return
      }

      if (!data || !['admin', 'super_admin', 'moderator'].includes(data.role)) {
        router.push('/bg/dashboard')
        return
      }

      setUserProfile(data)
    } catch (error) {
      console.error('Error:', error)
      router.push('/bg/login')
    } finally {
      setLoading(false)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Зареждане...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              Достъпът е ограничен
            </h3>
            <p className="text-gray-500 mb-6">
              Нямате права за достъп до тази страница.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto pl-16 pr-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="mb-4">
            <Link href="/bg/admin">
              <Button variant="outline" size="sm" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Обратно към админ панела
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">
              Предложения за цени
            </h1>
            <p className="text-gray-600">
              Управлявайте предложения за цени от потребители
            </p>
          </div>
        </div>

        {/* Price Suggestions Management */}
        <PriceSuggestionsManagement />
      </div>
    </div>
  )
}
