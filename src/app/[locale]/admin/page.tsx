'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import { supabase } from '@/lib/supabase'
import { getAdminStats, getPendingApprovals, canAccessAdminPanel, moderateContent } from '@/lib/admin'
import { useAuth } from '@/components/providers/auth-provider'
import {
  Users,
  Package,
  Store,
  MessageSquare,
  Clock,
  TrendingUp,
  Activity,
  AlertCircle,
  Shield,
  Settings,
  BarChart3,
  FileText,
  ArrowLeft,
  Check,
  X,
  DollarSign,
  Bell,
  Mail
} from 'lucide-react'
import Link from 'next/link'

// Import admin components
import ProductsManagement from '@/components/admin/products-management'
import SupermarketsManagement from '@/components/admin/supermarkets-management'
import DiscussionsModeration from '@/components/admin/discussions-moderation'
import UsersManagement from '@/components/admin/users-management'
import SettingsManagement from '@/components/admin/settings-management'
import AlertsManagement from '@/components/admin/alerts-management'
import NewsManagement from '@/components/admin/news-management'
import EmailSystemManagement from '@/components/admin/email-system-management'
import { MobileAdminLayout } from '@/components/admin/mobile-admin-layout'
import { MobileAdminDashboard } from '@/components/admin/mobile-admin-dashboard'
import { MobileUsersManagement } from '@/components/admin/mobile-users-management'
import { MobileProductsManagement } from '@/components/admin/mobile-products-management'
import { MobileDiscussionsModeration } from '@/components/admin/mobile-discussions-moderation'
import { useConfirmation } from '@/hooks/use-confirmation'
import { useAdminNotifications } from '@/hooks/use-admin-notifications'

interface AdminStats {
  totalUsers: number
  totalProducts: number
  totalSupermarkets: number
  totalDiscussions: number
  totalAlerts: number
  pendingApprovals: number
  activeUsers: number
  recentActivity: any[]
}

interface PendingItem {
  id: string
  type: 'product' | 'discussion' | 'comment'
  title: string
  created_at: string
  created_by_user?: {
    full_name: string
    email: string
  }
}

function AdminDashboard() {
  const { user: authUser } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { confirm, showSuccess, showError, ConfirmationComponent } = useConfirmation()
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [pendingPriceSuggestions, setPendingPriceSuggestions] = useState(0)
  const [pendingProducts, setPendingProducts] = useState(0)
  const [pendingDiscussions, setPendingDiscussions] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  // Get unread notifications count for alerts tab
  const { unreadCount } = useAdminNotifications(user?.role)

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Initialize active tab from URL parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  useEffect(() => {
    if (authUser) {
      fetchUserProfile()
    } else {
      setLoading(false)
    }
  }, [authUser])

  useEffect(() => {
    if (user) {
      fetchDashboardData()
      fetchPendingCounts()

      // Set up real-time subscriptions for pending counts
      const priceSuggestionsSubscription = supabase
        .channel('price_suggestions_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'price_suggestions'
        }, () => {
          fetchPendingCounts()
        })
        .subscribe()

      const productsSubscription = supabase
        .channel('products_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'products'
        }, () => {
          fetchPendingCounts()
        })
        .subscribe()

      const discussionsSubscription = supabase
        .channel('discussions_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'discussions'
        }, () => {
          fetchPendingCounts()
        })
        .subscribe()

      return () => {
        priceSuggestionsSubscription.unsubscribe()
        productsSubscription.unsubscribe()
        discussionsSubscription.unsubscribe()
      }
    }
  }, [user])

  // Function to handle tab changes with URL update
  const handleTabChange = (tabName: string) => {
    setActiveTab(tabName)

    // Update URL with the new tab parameter
    const params = new URLSearchParams(searchParams.toString())
    if (tabName === 'dashboard') {
      // Remove tab parameter for dashboard (default)
      params.delete('tab')
    } else {
      params.set('tab', tabName)
    }

    const newUrl = params.toString() ? `?${params.toString()}` : ''
    router.replace(`/bg/admin${newUrl}`, { scroll: false })
  }

  const fetchUserProfile = async () => {
    if (!authUser) return

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')  // Make sure we're selecting all fields
        .eq('id', authUser.id)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        router.push('/bg/login')
        return
      }

      // Check if the user has admin access before setting the user state
      if (!canAccessAdminPanel(data)) {
        router.push('/bg/dashboard')
        return
      }

      setUser(data)
    } catch (error) {
      console.error('Error:', error)
      router.push('/bg/login')
    }
  }

  const fetchDashboardData = async () => {
    try {
      const [statsData, pendingData] = await Promise.all([
        getAdminStats().catch(err => {
          console.error('Error fetching admin stats:', err)
          return {
            totalUsers: 0,
            totalProducts: 0,
            totalSupermarkets: 0,
            totalDiscussions: 0,
            totalAlerts: 0,
            pendingApprovals: 0,
            activeUsers: 0,
            recentActivity: []
          }
        }),
        getPendingApprovals().catch(err => {
          console.error('Error fetching pending approvals:', err)
          return {
            pendingProducts: [],
            pendingDiscussions: [],
            pendingComments: []
          }
        })
      ])

      setStats(statsData)
      
      // Transform pending data into unified format
      const allPending: PendingItem[] = [
        ...(pendingData.pendingProducts || []).map((item: any) => ({
          id: item.id,
          type: 'product' as const,
          title: item.name,
          created_at: item.created_at,
          created_by_user: item.created_by_user
        })),
        ...(pendingData.pendingDiscussions || []).map((item: any) => ({
          id: item.id,
          type: 'discussion' as const,
          title: item.title,
          created_at: item.created_at,
          created_by_user: item.created_by_user
        })),
        ...(pendingData.pendingComments || []).map((item: any) => ({
          id: item.id,
          type: 'comment' as const,
          title: `Коментар в ${item.discussion?.title || 'дискусия'}`,
          created_at: item.created_at,
          created_by_user: item.created_by_user
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setPendingItems(allPending)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingCounts = async () => {
    try {
      const [
        { count: priceSuggestionsCount },
        { count: productsCount },
        { count: discussionsCount }
      ] = await Promise.all([
        supabase
          .from('price_suggestions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('is_approved', false),
        supabase
          .from('discussions')
          .select('*', { count: 'exact', head: true })
          .eq('is_approved', false)
      ])

      console.log('🔍 Debug - Pending counts from database:', {
        priceSuggestions: priceSuggestionsCount,
        products: productsCount,
        discussions: discussionsCount
      })

      setPendingPriceSuggestions(priceSuggestionsCount || 0)
      setPendingProducts(productsCount || 0)
      setPendingDiscussions(discussionsCount || 0)

      console.log('🔍 Debug - State after setting:', {
        pendingPriceSuggestions: priceSuggestionsCount || 0,
        pendingProducts: productsCount || 0,
        pendingDiscussions: discussionsCount || 0
      })
    } catch (error) {
      console.error('Error fetching pending counts:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('bg-BG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'product': return 'bg-blue-100 text-blue-800'
      case 'discussion': return 'bg-green-100 text-green-800'
      case 'comment': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'product': return 'Продукт'
      case 'discussion': return 'Дискусия'
      case 'comment': return 'Коментар'
      default: return type
    }
  }

  const getItemUrl = (item: PendingItem) => {
    switch (item.type) {
      case 'product':
        return `/bg/products/${item.id}`
      case 'discussion':
        return `/bg/discussions/${item.id}`
      case 'comment':
        // For comments, we need to link to the discussion they belong to
        // This would require additional data, for now link to discussions page
        return `/bg/discussions`
      default:
        return '#'
    }
  }

  // Show loading while authentication or user profile is loading
  if (loading || !authUser || (authUser && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Зареждане на администрацията...</p>
        </div>
      </div>
    )
  }

  // Show access denied only after we're sure the user is loaded and doesn't have access
  if (!user || !canAccessAdminPanel(user)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Достъп отказан</h1>
          <p className="text-gray-600 mb-4">Нямате права за достъп до администрацията</p>
          <Link href="/bg/dashboard">
            <Button>Обратно към таблото</Button>
          </Link>
        </div>
      </div>
    )
  }

  const canManageProducts = ['moderator', 'admin', 'super_admin'].includes(user.role)
  const canManageSupermarkets = ['admin', 'super_admin'].includes(user.role)
  const canModerateDiscussions = ['moderator', 'admin', 'super_admin'].includes(user.role)
  const canManageUsers = ['admin', 'super_admin'].includes(user.role)

  const handleApprove = async (item: PendingItem) => {
    if (!user) return

    setActionLoading(item.id)
    try {
      console.log('Approving item:', item)
      const success = await moderateContent(
        user.id,
        item.type,
        item.id,
        'approve'
      )

      if (success) {
        console.log('Item approved successfully')
        // Refresh the data
        await fetchDashboardData()
        await fetchPendingCounts()
        // Trigger a custom event to refresh sidebar pending count
        window.dispatchEvent(new CustomEvent('refreshPendingCount'))
        showSuccess('Успешно одобрение', `${getTypeLabel(item.type)} "${item.title}" беше одобрен успешно!`)
      } else {
        console.error('Moderation failed')
        showError('Грешка при одобряване', 'Операцията не беше успешна. Моля, опитайте отново.')
      }
    } catch (error) {
      console.error('Error approving item:', error)
      showError('Грешка при одобряване', 'Възникна грешка при одобряване: ' + (error as Error).message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (item: PendingItem) => {
    if (!user) return

    confirm(
      'Отхвърляне на съдържание',
      `Сигурни ли сте, че искате да отхвърлите "${item.title}"? Това действие не може да бъде отменено.`,
      async () => {
        setActionLoading(item.id)
        try {
          console.log('Rejecting item:', item)
          const success = await moderateContent(
            user.id,
            item.type,
            item.id,
            'reject'
          )

          if (success) {
            console.log('Item rejected successfully')
            // Refresh the data
            await fetchDashboardData()
            await fetchPendingCounts()
            // Trigger a custom event to refresh sidebar pending count
            window.dispatchEvent(new CustomEvent('refreshPendingCount'))
            showSuccess('Успешно отхвърляне', `${getTypeLabel(item.type)} "${item.title}" беше отхвърлен успешно!`)
          } else {
            console.error('Moderation failed')
            showError('Грешка при отхвърляне', 'Операцията не беше успешна. Моля, опитайте отново.')
          }
        } catch (error) {
          console.error('Error rejecting item:', error)
          showError('Грешка при отхвърляне', 'Възникна грешка при отхвърляне: ' + (error as Error).message)
        } finally {
          setActionLoading(null)
        }
      },
      {
        confirmText: 'Отхвърли',
        cancelText: 'Отказ',
        type: 'warning'
      }
    )
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <MobileAdminLayout
        activeTab={activeTab}
        onTabChange={handleTabChange}
        user={user}
        pendingCounts={{
          pendingProducts,
          pendingDiscussions,
          unreadCount,
          pendingPriceSuggestions
        }}
        stats={stats}
        permissions={{
          canManageProducts,
          canManageSupermarkets,
          canModerateDiscussions,
          canManageUsers
        }}
      >
        <ConfirmationComponent />

        {/* Dashboard Content - handled by navigation cards in mobile layout */}

        {/* Users Content */}
        {activeTab === 'users' && canManageUsers && (
          <UsersManagement />
        )}

        {/* Products Content */}
        {activeTab === 'products' && canManageProducts && (
          <ProductsManagement />
        )}

        {/* Supermarkets Content */}
        {activeTab === 'supermarkets' && canManageSupermarkets && (
          <SupermarketsManagement />
        )}

        {/* Discussions Content */}
        {activeTab === 'discussions' && canModerateDiscussions && (
          <DiscussionsModeration />
        )}

        {activeTab === 'alerts' && (
          <AlertsManagement />
        )}

        {activeTab === 'news' && (
          <NewsManagement />
        )}

        {activeTab === 'email-system' && ['admin', 'super_admin'].includes(user.role) && (
          <EmailSystemManagement />
        )}

        {activeTab === 'settings' && user.role === 'super_admin' && (
          <SettingsManagement />
        )}
      </MobileAdminLayout>
    )
  }

  // Desktop Layout
  return (
    <div className="min-h-screen bg-gray-50">
      <ConfirmationComponent />

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 pt-20 lg:pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Link href="/bg/dashboard">
                <Button variant="ghost" size="sm" className="w-full sm:w-auto">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Обратно към сайта</span>
                  <span className="sm:hidden">Назад</span>
                </Button>
              </Link>
              <div className="text-center sm:text-left">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center justify-center sm:justify-start space-x-2">
                  <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  <span>Администрация</span>
                </h1>
              </div>
            </div>
            <div className="flex items-center justify-center sm:justify-end space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-xs sm:text-sm">
                  {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="text-center sm:text-left">
                <p className="font-medium text-gray-900 text-sm">{user.full_name || 'Admin'}</p>
                <Badge variant={user.role === 'super_admin' ? 'default' : 'secondary'} className="text-xs">
                  {user.role}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout with Sidebar */}
      <div className="flex">
        {/* Vertical Navigation Sidebar */}
        <div className="hidden lg:block w-64 bg-white shadow-sm border-r min-h-screen">
          <div className="p-4">
            <nav className="space-y-2">
              {/* Dashboard */}
              <button
                onClick={() => handleTabChange('dashboard')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Activity className="h-5 w-5" />
                <span>Табло</span>
              </button>

              {/* Products */}
              {canManageProducts && (
                <button
                  onClick={() => handleTabChange('products')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                    activeTab === 'products'
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Package className="h-5 w-5" />
                    <span>Продукти</span>
                  </div>
                  {pendingProducts > 0 && (
                    <Badge variant="destructive" className="h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs font-bold bg-red-500 text-white border-0">
                      {pendingProducts > 99 ? '99+' : pendingProducts}
                    </Badge>
                  )}
                </button>
              )}

              {/* Supermarkets */}
              {canManageSupermarkets && (
                <button
                  onClick={() => handleTabChange('supermarkets')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                    activeTab === 'supermarkets'
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Store className="h-5 w-5" />
                  <span>Супермаркети</span>
                </button>
              )}

              {/* Discussions */}
              {canModerateDiscussions && (
                <button
                  onClick={() => handleTabChange('discussions')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                    activeTab === 'discussions'
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="h-5 w-5" />
                    <span>Дискусии</span>
                  </div>
                  {pendingDiscussions > 0 && (
                    <Badge variant="destructive" className="h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs font-bold bg-red-500 text-white border-0">
                      {pendingDiscussions > 99 ? '99+' : pendingDiscussions}
                    </Badge>
                  )}
                </button>
              )}

              {/* Users */}
              {canManageUsers && (
                <button
                  onClick={() => handleTabChange('users')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                    activeTab === 'users'
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Users className="h-5 w-5" />
                  <span>Потребители</span>
                </button>
              )}

              {/* Alerts */}
              <button
                onClick={() => handleTabChange('alerts')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                  activeTab === 'alerts'
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Bell className="h-5 w-5" />
                  <span>Известия</span>
                </div>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs font-bold bg-red-500 text-white border-0">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </button>

              {/* News */}
              <button
                onClick={() => handleTabChange('news')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                  activeTab === 'news'
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <FileText className="h-5 w-5" />
                <span>Новини</span>
              </button>

              {/* Divider */}
              <div className="border-t border-gray-200 my-4"></div>

              {/* Price Management */}
              {canManageProducts && (
                <>
                  <Link href="/bg/admin/price-suggestions">
                    <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left text-gray-700 hover:bg-gray-100 hover:text-gray-900">
                      <div className="flex items-center space-x-3">
                        <DollarSign className="h-5 w-5" />
                        <span>Предложения за цени</span>
                      </div>
                      {pendingPriceSuggestions > 0 && (
                        <Badge variant="destructive" className="h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs font-bold bg-red-500 text-white border-0">
                          {pendingPriceSuggestions > 99 ? '99+' : pendingPriceSuggestions}
                        </Badge>
                      )}
                    </button>
                  </Link>
                  <Link href="/bg/admin/price-updates">
                    <button className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left text-gray-700 hover:bg-gray-100 hover:text-gray-900">
                      <BarChart3 className="h-5 w-5" />
                      <span>Обновяване на цени</span>
                    </button>
                  </Link>
                </>
              )}

              {/* System Management */}
              {['admin', 'super_admin'].includes(user.role) && (
                <>
                  <div className="border-t border-gray-200 my-4"></div>
                  <button
                    onClick={() => handleTabChange('email-system')}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                      activeTab === 'email-system'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Mail className="h-5 w-5" />
                    <span>Имейл система</span>
                  </button>
                </>
              )}

              {/* Settings */}
              {user.role === 'super_admin' && (
                <>
                  <button
                    onClick={() => handleTabChange('settings')}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                      activeTab === 'settings'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Settings className="h-5 w-5" />
                    <span>Настройки</span>
                  </button>
                </>
              )}
            </nav>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden bg-white border-b shadow-sm">
          <div className="px-4 py-3">
            <select
              value={activeTab}
              onChange={(e) => handleTabChange(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg bg-white text-sm"
            >
              <option value="dashboard">📊 Табло</option>
              {canManageProducts && <option value="products">📦 Продукти {pendingProducts > 0 ? `(${pendingProducts})` : ''}</option>}
              {canManageSupermarkets && <option value="supermarkets">🏪 Супермаркети</option>}
              {canModerateDiscussions && <option value="discussions">💬 Дискусии {pendingDiscussions > 0 ? `(${pendingDiscussions})` : ''}</option>}
              {canManageUsers && <option value="users">👥 Потребители</option>}
              <option value="alerts">🔔 Известия {unreadCount > 0 ? `(${unreadCount})` : ''}</option>
              <option value="news">📰 Новини</option>
              {['admin', 'super_admin'].includes(user.role) && <option value="email-system">📧 Имейл система</option>}
              {user.role === 'super_admin' && <option value="settings">⚙️ Настройки</option>}
            </select>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-4 lg:p-6">

          {/* Dashboard Content */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              <Card className="bg-white shadow-sm border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Потребители</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.activeUsers || 0} активни
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-sm border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Продукти</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalProducts || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Общо в каталога
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-sm border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Супермаркети</CardTitle>
                  <Store className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalSupermarkets || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Регистрирани вериги
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-sm border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Чакащи одобрения</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.pendingApprovals || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Изискват внимание
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Pending Approvals */}
            <Card className="bg-white shadow-sm border">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>Чакащи одобрения</span>
                </CardTitle>
                <CardDescription>
                  Съдържание, което изисква модерация
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingItems.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    Няма чакащи одобрения
                  </p>
                ) : (
                  <div className="space-y-3">
                    {pendingItems.slice(0, 5).map((item) => (
                      <div key={`${item.type}-${item.id}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-white border rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                        <Link
                          href={getItemUrl(item)}
                          className="flex-1 cursor-pointer min-w-0"
                          target="_blank"
                        >
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <Badge className={getTypeColor(item.type)}>
                              {getTypeLabel(item.type)}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {formatDate(item.created_at)}
                            </span>
                          </div>
                          <p className="font-medium text-sm hover:text-blue-600 transition-colors truncate">{item.title}</p>
                          {item.created_by_user && (
                            <p className="text-xs text-gray-500 truncate">
                              от {item.created_by_user.full_name || item.created_by_user.email}
                            </p>
                          )}
                        </Link>
                        <div className="flex items-center justify-center sm:justify-end space-x-2 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(item)}
                            disabled={actionLoading === item.id}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(item)}
                            disabled={actionLoading === item.id}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {pendingItems.length > 5 && (
                      <div className="text-center pt-2">
                        <Button variant="ghost" size="sm">
                          Виж всички ({pendingItems.length})
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            {stats?.recentActivity && stats.recentActivity.length > 0 && (
              <Card className="bg-white shadow-sm border">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Скорошна активност</span>
                  </CardTitle>
                  <CardDescription>
                    Последни действия в администрацията
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.recentActivity.slice(0, 5).map((activity: any) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                        <div>
                          <p className="font-medium text-sm">{activity.action}</p>
                          <p className="text-xs text-gray-500">
                            {activity.admin?.full_name || activity.admin?.email} • {formatDate(activity.created_at)}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {activity.target_type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            </div>
          )}

          {/* Products Content */}
          {activeTab === 'products' && canManageProducts && (
            <ProductsManagement />
          )}

          {/* Supermarkets Content */}
          {activeTab === 'supermarkets' && canManageSupermarkets && (
            <SupermarketsManagement />
          )}

          {/* Discussions Content */}
          {activeTab === 'discussions' && canModerateDiscussions && (
            <DiscussionsModeration />
          )}

          {/* Users Content */}
          {activeTab === 'users' && canManageUsers && (
            <UsersManagement />
          )}

          {/* Alerts Content */}
          {activeTab === 'alerts' && (
            <AlertsManagement />
          )}

          {/* News Content */}
          {activeTab === 'news' && (
            <NewsManagement />
          )}

          {/* Email System Content */}
          {activeTab === 'email-system' && ['admin', 'super_admin'].includes(user.role) && (
            <EmailSystemManagement />
          )}

          {/* Settings Content */}
          {activeTab === 'settings' && user.role === 'super_admin' && (
            <SettingsManagement />
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Зареждане на администрацията...</p>
        </div>
      </div>
    }>
      <AdminDashboard />
    </Suspense>
  )
}
