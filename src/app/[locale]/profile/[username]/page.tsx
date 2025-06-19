'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  User, 
  Calendar, 
  Mail, 
  Shield, 
  ArrowLeft,
  MessageCircle,
  Heart,
  ShoppingCart,
  Settings
} from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { getUserProfileByUsername } from '@/lib/user-utils'
import { supabase } from '@/lib/supabase'

interface UserProfile {
  id: string
  email: string
  username: string
  full_name?: string
  first_name?: string
  last_name?: string
  avatar_url?: string
  role: string
  is_active: boolean
  created_at: string
}

interface UserStats {
  discussions_count: number
  comments_count: number
  products_count: number
  favorites_count: number
}

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const username = params.username as string

  useEffect(() => {
    if (username) {
      fetchUserProfile()
    }
  }, [username])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      setError('')

      // Get user profile
      const userProfile = await getUserProfileByUsername(username)
      if (!userProfile) {
        setError('Потребителят не е намерен')
        return
      }

      setProfile(userProfile)

      // Get user statistics
      await fetchUserStats(userProfile.id)
    } catch (err) {
      console.error('Error fetching user profile:', err)
      setError('Възникна грешка при зареждането на профила')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserStats = async (userId: string) => {
    try {
      // Get discussions count (all discussions, not just approved for user profiles)
      const { count: discussionsCount } = await supabase
        .from('discussions')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId)

      // Get comments count (all comments, not just approved for user profiles)
      const { count: commentsCount } = await supabase
        .from('discussion_comments')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId)

      // Get products count (all products, not just approved for user profiles)
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId)

      // Get favorites count
      const { count: favoritesCount } = await supabase
        .from('user_products')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      setStats({
        discussions_count: discussionsCount || 0,
        comments_count: commentsCount || 0,
        products_count: productsCount || 0,
        favorites_count: favoritesCount || 0
      })
    } catch (error) {
      console.error('Error fetching user stats:', error)
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Супер Администратор'
      case 'admin': return 'Администратор'
      case 'moderator': return 'Модератор'
      default: return 'Потребител'
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin': return 'destructive'
      case 'admin': return 'destructive'
      case 'moderator': return 'secondary'
      default: return 'outline'
    }
  }

  const getDisplayName = (profile: UserProfile) => {
    // Try first_name + last_name combination
    if (profile.first_name || profile.last_name) {
      const firstName = profile.first_name?.trim() || ''
      const lastName = profile.last_name?.trim() || ''
      const fullName = `${firstName} ${lastName}`.trim()
      if (fullName) return fullName
    }

    // Try full_name
    if (profile.full_name?.trim()) {
      return profile.full_name.trim()
    }

    // Fallback to @username
    return `@${profile.username}`
  }

  const isOwnProfile = currentUser && profile && currentUser.id === profile.id

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-start space-x-6">
                <div className="w-24 h-24 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {error || 'Потребителят не е намерен'}
          </h1>
          <p className="text-gray-600 mb-4">
            Потребителят с това име не съществува или не е активен.
          </p>
          <Link href="/bg/dashboard">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Обратно към началото
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Назад</span>
              <span className="sm:hidden">Назад</span>
            </Button>
          </div>
          {isOwnProfile && (
            <Link href="/bg/settings">
              <Button variant="outline" className="w-full sm:w-auto">
                <Settings className="h-4 w-4 mr-2" />
                Редактирай профил
              </Button>
            </Link>
          )}
        </div>

        {/* Profile Card */}
        <Card className="mb-6">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0 self-center sm:self-start">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={getDisplayName(profile)}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-gray-200"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`w-20 h-20 sm:w-24 sm:h-24 bg-blue-100 rounded-full flex items-center justify-center border-2 border-gray-200 ${profile.avatar_url ? 'hidden' : ''}`}>
                  <User className="h-10 w-10 sm:h-12 sm:w-12 text-blue-600" />
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <div className="mb-4">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                    {getDisplayName(profile)}
                  </h1>
                  {getDisplayName(profile) !== `@${profile.username}` && (
                    <p className="text-base sm:text-lg text-gray-600 mb-2">@{profile.username}</p>
                  )}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-500">
                    <div className="flex items-center justify-center sm:justify-start">
                      <Calendar className="h-4 w-4 mr-1 flex-shrink-0" />
                      <span>Член от {new Date(profile.created_at).toLocaleDateString('bg-BG')}</span>
                    </div>
                    {isOwnProfile && (
                      <div className="flex items-center justify-center sm:justify-start">
                        <Mail className="h-4 w-4 mr-1 flex-shrink-0" />
                        <span className="truncate">{profile.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-4">
                  <Badge variant={getRoleBadgeVariant(profile.role)}>
                    <Shield className="h-3 w-3 mr-1" />
                    {getRoleLabel(profile.role)}
                  </Badge>
                  <Badge variant={profile.is_active ? 'default' : 'destructive'}>
                    {profile.is_active ? 'Активен' : 'Неактивен'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle>Статистики</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
                  <MessageCircle className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-blue-600">{stats.discussions_count}</div>
                  <div className="text-xs sm:text-sm text-gray-600">Дискусии</div>
                </div>
                <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
                  <MessageCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-green-600">{stats.comments_count}</div>
                  <div className="text-xs sm:text-sm text-gray-600">Коментари</div>
                </div>
                <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-lg">
                  <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-purple-600">{stats.products_count}</div>
                  <div className="text-xs sm:text-sm text-gray-600">Продукти</div>
                </div>
                <div className="text-center p-3 sm:p-4 bg-red-50 rounded-lg">
                  <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-red-600 mx-auto mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-red-600">{stats.favorites_count}</div>
                  <div className="text-xs sm:text-sm text-gray-600">Любими</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
