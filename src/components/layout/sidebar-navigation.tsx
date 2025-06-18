'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { canAccessAdminPanel, getPendingApprovalsCount } from '@/lib/admin'
import { useUnreadNotificationCount } from '@/hooks/use-notifications'
import {
  Home,
  ShoppingCart,
  Store,
  MessageCircle,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  BarChart3,
  Heart,
  Bell,
  Search,
  Shield
} from 'lucide-react'

export function SidebarNavigation() {
  const [isOpen, setIsOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const { user, signOut } = useAuth()
  const { unreadCount } = useUnreadNotificationCount()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      fetchUserProfile()
    }
  }, [user])

  useEffect(() => {
    if (userProfile && canAccessAdminPanel(userProfile)) {
      fetchPendingCount()
      // Set up interval to refresh pending count every 30 seconds
      const interval = setInterval(fetchPendingCount, 30000)

      // Listen for custom events to refresh count immediately
      const handleRefreshPendingCount = () => {
        fetchPendingCount()
      }

      window.addEventListener('refreshPendingCount', handleRefreshPendingCount)

      return () => {
        clearInterval(interval)
        window.removeEventListener('refreshPendingCount', handleRefreshPendingCount)
      }
    }
  }, [userProfile])

  const fetchUserProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, username, full_name, role')
        .eq('id', user.id)
        .single()

      if (!error && data) {
        setUserProfile(data)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const fetchPendingCount = async () => {
    try {
      const countData = await getPendingApprovalsCount()
      setPendingCount(countData.total)
    } catch (error) {
      console.error('Error fetching pending count:', error)
      setPendingCount(0)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/bg/login')
  }

  const navigationItems = [
    {
      name: 'Табло',
      href: '/bg/dashboard',
      icon: BarChart3,
      description: 'Лично табло',
      requiresAuth: true
    },
    {
      name: 'Продукти',
      href: '/bg/products',
      icon: ShoppingCart,
      description: 'Търсене на продукти'
    },
    {
      name: 'Супермаркети',
      href: '/bg/supermarkets',
      icon: Store,
      description: 'Магазини и вериги'
    },
    {
      name: 'Дискусии',
      href: '/bg/discussions',
      icon: MessageCircle,
      description: 'Общност и коментари'
    }
  ]

  const userItems = user ? [
    {
      name: 'Любими',
      href: '/bg/favorites',
      icon: Heart,
      description: 'Любими продукти'
    },
    {
      name: 'Известия',
      href: '/bg/notifications',
      icon: Bell,
      description: 'Ценови известия'
    },
    {
      name: 'Настройки',
      href: '/bg/settings',
      icon: Settings,
      description: 'Профил и настройки'
    }
  ] : []

  const adminItems = userProfile && canAccessAdminPanel(userProfile) ? [
    {
      name: 'Администрация',
      href: '/bg/admin',
      icon: Shield,
      description: 'Админ панел'
    }
  ] : []

  const isActive = (href: string) => {
    if (href === '/bg/dashboard') {
      return pathname === '/bg/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="outline"
        size="sm"
        className="fixed top-4 left-4 z-50 lg:hidden cursor-pointer bg-white shadow-lg border-gray-200 hover:bg-gray-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Transparent Overlay for mobile - allows closing by clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <Link
              href="/bg/dashboard"
              className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setIsOpen(false)}
            >
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">PriceTrack</h1>
                <p className="text-xs text-gray-500">България</p>
              </div>
            </Link>
          </div>

          {/* User Info */}
          {user && (
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  {userProfile?.username ? (
                    <Link
                      href={`/bg/profile/${userProfile.username}`}
                      onClick={() => setIsOpen(false)}
                      className="block"
                    >
                      <p className="text-sm font-medium text-blue-600 hover:text-blue-700 truncate cursor-pointer">
                        @{userProfile.username}
                      </p>
                    </Link>
                  ) : (
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Потребител'}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {/* Main Navigation */}
            <div className="space-y-1">
              {navigationItems.map((item) => {
                if (item.requiresAuth && !user) return null
                
                const Icon = item.icon
                const active = isActive(item.href)
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`
                      flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer
                      ${active 
                        ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>

            {/* User Items */}
            {userItems.length > 0 && (
              <>
                <div className="pt-4 mt-4 border-t border-gray-200">
                  <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Лично
                  </p>
                  <div className="space-y-1">
                    {userItems.map((item) => {
                      const Icon = item.icon
                      const active = isActive(item.href)
                      const isNotifications = item.href === '/bg/notifications'

                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className={`
                            flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer
                            ${active
                              ? 'bg-blue-100 text-blue-700 border border-blue-200'
                              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                            }
                          `}
                        >
                          <Icon className="h-5 w-5" />
                          <span>{item.name}</span>
                          {isNotifications && unreadCount > 0 && (
                            <Badge
                              variant="destructive"
                              className="ml-auto bg-blue-500 text-white text-xs px-2 py-1 min-w-[20px] h-5 flex items-center justify-center rounded-full"
                            >
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </Badge>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Admin Items */}
            {adminItems.length > 0 && (
              <>
                <div className="pt-4 mt-4 border-t border-gray-200">
                  <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Администрация
                  </p>
                  <div className="space-y-1">
                    {adminItems.map((item) => {
                      const Icon = item.icon
                      const active = isActive(item.href)

                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className={`
                            flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer
                            ${active
                              ? 'bg-red-100 text-red-700 border border-red-200'
                              : 'text-gray-700 hover:bg-red-50 hover:text-red-900'
                            }
                          `}
                        >
                          <Icon className="h-5 w-5" />
                          <span>{item.name}</span>
                          {pendingCount > 0 && (
                            <Badge
                              variant="destructive"
                              className="ml-auto bg-red-500 text-white text-xs px-2 py-1 min-w-[20px] h-5 flex items-center justify-center rounded-full"
                            >
                              {pendingCount > 99 ? '99+' : pendingCount}
                            </Badge>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            {user ? (
              <Button
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-3" />
                Изход
              </Button>
            ) : (
              <div className="space-y-2">
                <Link href="/bg/login" onClick={() => setIsOpen(false)}>
                  <Button className="w-full cursor-pointer hover:bg-blue-700">
                    Вход
                  </Button>
                </Link>
                <Link href="/bg/register" onClick={() => setIsOpen(false)}>
                  <Button variant="outline" className="w-full cursor-pointer hover:bg-gray-50">
                    Регистрация
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
