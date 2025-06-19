'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Activity,
  Package,
  Store,
  MessageSquare,
  Users,
  Bell,
  FileText,
  Settings,
  DollarSign,
  BarChart3,
  ArrowLeft,
  Shield,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'

interface MobileAdminLayoutProps {
  activeTab: string
  onTabChange: (tab: string) => void
  user: any
  pendingCounts: {
    pendingProducts: number
    pendingDiscussions: number
    unreadCount: number
    pendingPriceSuggestions: number
  }
  stats: {
    totalUsers: number
    totalProducts: number
    totalSupermarkets: number
    totalDiscussions: number
    totalAlerts: number
  } | null
  permissions: {
    canManageProducts: boolean
    canManageSupermarkets: boolean
    canModerateDiscussions: boolean
    canManageUsers: boolean
  }
  children: React.ReactNode
}

export function MobileAdminLayout({
  activeTab,
  onTabChange,
  user,
  pendingCounts,
  stats,
  permissions,
  children
}: MobileAdminLayoutProps) {
  const [showNavigation, setShowNavigation] = useState(false)

  const navigationItems = [
    {
      id: 'products',
      label: 'Продукти',
      icon: Package,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      available: permissions.canManageProducts,
      badge: pendingCounts.pendingProducts,
      count: stats?.totalProducts || 0
    },
    {
      id: 'supermarkets',
      label: 'Супермаркети',
      icon: Store,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      available: permissions.canManageSupermarkets,
      count: stats?.totalSupermarkets || 0
    },
    {
      id: 'discussions',
      label: 'Дискусии',
      icon: MessageSquare,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      available: permissions.canModerateDiscussions,
      badge: pendingCounts.pendingDiscussions,
      count: stats?.totalDiscussions || 0
    },
    {
      id: 'users',
      label: 'Потребители',
      icon: Users,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      available: permissions.canManageUsers,
      count: stats?.totalUsers || 0
    },
    {
      id: 'alerts',
      label: 'Известия',
      icon: Bell,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      available: true,
      badge: pendingCounts.unreadCount,
      count: stats?.totalAlerts || 0
    },
    {
      id: 'news',
      label: 'Новини',
      icon: FileText,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      available: true
    }
  ]

  const additionalItems = [
    {
      id: 'price-suggestions',
      label: 'Предложения за цени',
      icon: DollarSign,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      available: permissions.canManageProducts,
      badge: pendingCounts.pendingPriceSuggestions,
      href: '/bg/admin/price-suggestions'
    },
    {
      id: 'price-updates',
      label: 'Обновяване на цени',
      icon: BarChart3,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      available: permissions.canManageProducts,
      href: '/bg/admin/price-updates'
    }
  ]

  const getCurrentPageTitle = () => {
    const item = navigationItems.find(item => item.id === activeTab)
    return item?.label || 'Администрация'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-30">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {activeTab === 'dashboard' ? (
                <Link href="/bg/dashboard">
                  <Button variant="ghost" size="sm" className="p-2">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2"
                  onClick={() => onTabChange('dashboard')}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{getCurrentPageTitle()}</h1>
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <Shield className="h-3 w-3" />
                  <span>Администрация</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-xs">
                  {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Grid */}
      {activeTab === 'dashboard' && (
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3 mb-6">
            {navigationItems.filter(item => item.available).map((item) => {
              const Icon = item.icon
              return (
                <Card
                  key={item.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onTabChange(item.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 ${item.bgColor} rounded-lg flex items-center justify-center`}>
                          <Icon className={`h-5 w-5 ${item.color}`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {item.label}
                          </p>
                          {item.badge && item.badge > 0 && (
                            <Badge variant="destructive" className="text-xs mt-1">
                              {item.badge > 99 ? '99+' : item.badge} чакащи
                            </Badge>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Additional Actions */}
          {additionalItems.some(item => item.available) && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3 px-1">Допълнителни действия</h3>
              <div className="space-y-2">
                {additionalItems.filter(item => item.available).map((item) => {
                  const Icon = item.icon
                  const content = (
                    <Card className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 ${item.bgColor} rounded-lg flex items-center justify-center`}>
                              <Icon className={`h-5 w-5 ${item.color}`} />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{item.label}</p>
                              {item.badge && item.badge > 0 && (
                                <Badge variant="destructive" className="text-xs mt-1">
                                  {item.badge > 99 ? '99+' : item.badge}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </CardContent>
                    </Card>
                  )

                  return item.href ? (
                    <Link key={item.id} href={item.href}>
                      {content}
                    </Link>
                  ) : (
                    <div key={item.id} onClick={() => onTabChange(item.id)}>
                      {content}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Settings */}
          {user.role === 'super_admin' && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3 px-1">Системни настройки</h3>
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onTabChange('settings')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                        <Settings className="h-5 w-5 text-gray-600" />
                      </div>
                      <p className="font-medium text-gray-900 text-sm">Настройки</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Content Area */}
      {activeTab !== 'dashboard' && (
        <div className="p-4">
          {children}
        </div>
      )}

      {/* Dashboard Content is handled above in the navigation cards */}
    </div>
  )
}
