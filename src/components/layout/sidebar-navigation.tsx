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
import { MobileHeader } from './mobile-header'
import { PriceTrackLogoMedium } from '@/components/ui/pricetrack-logo'
import {
  Home,
  ShoppingCart,
  Store,
  MessageCircle,
  User,
  Settings,
  LogOut,
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
        .select('id, email, username, full_name, first_name, last_name, avatar_url, role')
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
      {/* Mobile Header */}
      <MobileHeader
        isMenuOpen={isOpen}
        onMenuToggle={() => setIsOpen(!isOpen)}
      />

      {/* Backdrop Overlay for mobile - allows closing by clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 lg:hidden bg-black/20 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed left-0 w-64 bg-white border-r border-border shadow-lg z-50 transform transition-transform duration-300 ease-in-out
          mobile-sidebar lg:desktop-sidebar lg:bg-background lg:shadow-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
        style={{
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
          paddingBottom: 'env(safe-area-inset-bottom)'
        }}
      >
        <div className="flex flex-col h-full">
          {/* Header - Hidden on mobile since we have mobile header */}
          <div className="p-4 border-b border-border hidden lg:block">
            <div className="flex items-center justify-between">
              <Link
                href="/bg/dashboard"
                className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setIsOpen(false)}
              >
                <PriceTrackLogoMedium />
                <div>
                  <h1 className="text-xl font-bold text-foreground">PriceTrack</h1>
                  <p className="text-xs text-muted-foreground">България</p>
                </div>
              </Link>
            </div>
          </div>

          {/* User Info */}
          {user && (
            <div className="border-b border-border bg-muted">
              {userProfile?.username ? (
                <Link
                  href={`/bg/profile/${userProfile.username}`}
                  onClick={() => setIsOpen(false)}
                  className="block p-4 hover:bg-muted/80 transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 relative">
                      {userProfile.avatar_url ? (
                        <img
                          src={userProfile.avatar_url}
                          alt="Профилна снимка"
                          className="w-10 h-10 rounded-full object-cover border-2 border-blue-200 shadow-sm"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center ${userProfile.avatar_url ? 'hidden' : ''}`}>
                        <User className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary hover:text-primary/80 truncate">
                        {(() => {
                          // Try first_name + last_name combination
                          if (userProfile.first_name || userProfile.last_name) {
                            const firstName = userProfile.first_name?.trim() || ''
                            const lastName = userProfile.last_name?.trim() || ''
                            const fullName = `${firstName} ${lastName}`.trim()
                            if (fullName) return fullName
                          }

                          // Try full_name
                          if (userProfile.full_name?.trim()) {
                            return userProfile.full_name.trim()
                          }

                          // Fallback to @username
                          return `@${userProfile.username}`
                        })()}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 relative">
                      {userProfile?.avatar_url ? (
                        <img
                          src={userProfile.avatar_url}
                          alt="Профилна снимка"
                          className="w-10 h-10 rounded-full object-cover border-2 border-blue-200 shadow-sm"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center ${userProfile?.avatar_url ? 'hidden' : ''}`}>
                        <User className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Потребител'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                </div>
              )}
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
                        ? 'bg-blue-50/80 text-blue-700 border border-blue-100/60'
                        : 'text-foreground hover:bg-muted hover:text-foreground'
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
                <div className="pt-4 mt-4 border-t border-border">
                  <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
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
                              ? 'bg-blue-50/80 text-blue-700 border border-blue-100/60'
                              : 'text-foreground hover:bg-muted hover:text-foreground'
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
                <div className="pt-4 mt-4 border-t border-border">
                  <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
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
                              : 'text-foreground hover:bg-red-50 hover:text-red-900'
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

            {/* Exit Button - positioned right below the last navlink */}
            {user && (
              <div className={`pt-4 mt-4 ${(userItems.length > 0 || adminItems.length > 0) ? 'border-t border-border' : ''}`}>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4 mr-3" />
                  Изход
                </Button>
              </div>
            )}
          </nav>

          {/* Footer - Login/Register buttons for non-authenticated users */}
          {!user && (
            <div className="p-4 border-t border-border">
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
            </div>
          )}
        </div>
      </div>
    </>
  )
}
