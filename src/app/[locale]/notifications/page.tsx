'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Bell, 
  Settings, 
  Check, 
  Trash2, 
  MessageCircle, 
  Heart, 
  TrendingDown, 
  TrendingUp, 
  CheckCircle,
  RefreshCw,
  Filter
} from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { useNotifications } from '@/hooks/use-notifications'
import { useConfirmation } from '@/hooks/use-confirmation'
import { 
  getNotificationTypeInfo, 
  formatNotificationTime,
  type Notification 
} from '@/lib/notifications'

const iconMap = {
  MessageCircle,
  Heart,
  TrendingDown,
  TrendingUp,
  CheckCircle,
  Bell
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const { 
    notifications, 
    unreadCount, 
    loading, 
    hasMore,
    markAsRead, 
    markAllAsRead, 
    loadMore, 
    refresh 
  } = useNotifications()
  const { confirm, showSuccess, ConfirmationComponent } = useConfirmation()
  const [activeTab, setActiveTab] = useState('all')

  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'unread') return !notification.is_read
    if (activeTab === 'replies') return ['comment_reply', 'discussion_reply'].includes(notification.type)
    if (activeTab === 'likes') return ['comment_like', 'discussion_like'].includes(notification.type)
    if (activeTab === 'prices') return ['price_drop', 'price_increase'].includes(notification.type)
    return true // 'all'
  })

  const handleMarkAllAsRead = () => {
    if (unreadCount === 0) return
    
    confirm(
      'Маркиране като прочетени',
      `Сигурни ли сте, че искате да маркирате всички ${unreadCount} известия като прочетени?`,
      async () => {
        await markAllAsRead()
        showSuccess('Успех', 'Всички известия бяха маркирани като прочетени.')
      },
      {
        confirmText: 'Маркирай всички',
        cancelText: 'Отказ'
      }
    )
  }

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }

    // Navigate to the related content
    const link = getNotificationLink(notification)
    if (link !== '#') {
      window.location.href = link
    }
  }

  const getNotificationLink = (notification: Notification) => {
    // For comment-related notifications, navigate to the discussion with comment anchor
    if (notification.type === 'comment_reply' || notification.type === 'comment_like') {
      if (notification.discussion_id && notification.comment_id) {
        return `/bg/discussions/${notification.discussion_id}#comment-${notification.comment_id}`
      }
      if (notification.discussion_id) {
        return `/bg/discussions/${notification.discussion_id}`
      }
    }

    // For discussion-related notifications
    if (notification.type === 'discussion_reply' || notification.type === 'discussion_like') {
      if (notification.discussion_id) {
        return `/bg/discussions/${notification.discussion_id}`
      }
    }

    // For price-related notifications
    if (notification.type === 'price_drop' || notification.type === 'price_increase') {
      if (notification.product_id) {
        return `/bg/products/${notification.product_id}`
      }
    }

    // For approval notifications
    if (notification.type === 'product_approved' && notification.product_id) {
      return `/bg/products/${notification.product_id}`
    }

    if (notification.type === 'discussion_approved' && notification.discussion_id) {
      return `/bg/discussions/${notification.discussion_id}`
    }

    if (notification.type === 'comment_approved' && notification.discussion_id && notification.comment_id) {
      return `/bg/discussions/${notification.discussion_id}#comment-${notification.comment_id}`
    }

    // Fallback to generic links
    if (notification.discussion_id) {
      return `/bg/discussions/${notification.discussion_id}`
    }
    if (notification.product_id) {
      return `/bg/products/${notification.product_id}`
    }

    return '#'
  }

  const renderNotificationIcon = (type: Notification['type']) => {
    const { icon, color, bgColor } = getNotificationTypeInfo(type)
    const IconComponent = iconMap[icon as keyof typeof iconMap] || Bell
    
    return (
      <div className={`w-10 h-10 rounded-full ${bgColor} flex items-center justify-center`}>
        <IconComponent className={`h-5 w-5 ${color}`} />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Влезте в профила си</h1>
          <p className="text-gray-600 mb-4">За да видите известията си, моля влезте в профила си.</p>
          <Link href="/bg/login">
            <Button>Вход</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto pl-16 pr-4 sm:px-6 lg:px-8 py-8">
      <ConfirmationComponent />
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
              <Bell className="h-8 w-8 text-blue-600" />
              <span>Известия</span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </h1>
            <p className="text-gray-600 mt-1">Управлявайте вашите известия и настройки</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={refresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Обнови
            </Button>
            <Link href="/bg/notifications/settings">
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Настройки
              </Button>
            </Link>
            {unreadCount > 0 && (
              <Button variant="outline" onClick={handleMarkAllAsRead}>
                <Check className="h-4 w-4 mr-2" />
                Маркирай всички ({unreadCount})
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">Всички</TabsTrigger>
            <TabsTrigger value="unread">
              Непрочетени
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="replies">Отговори</TabsTrigger>
            <TabsTrigger value="likes">Харесвания</TabsTrigger>
            <TabsTrigger value="prices">Цени</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`transition-colors hover:bg-gray-50 cursor-pointer ${
                notification.is_read ? 'bg-white' : 'bg-blue-50 border-blue-200'
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  {renderNotificationIcon(notification.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium text-gray-900 truncate">
                        {notification.title}
                      </h3>
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        {formatNotificationTime(notification.created_at)}
                      </p>
                      {(notification.product?.name || notification.discussion?.title) && (
                        <Badge variant="outline" className="text-xs">
                          {notification.product?.name || notification.discussion?.title}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Load More */}
        {hasMore && filteredNotifications.length > 0 && (
          <div className="text-center mt-6">
            <Button variant="outline" onClick={loadMore} disabled={loading}>
              {loading ? 'Зарежда...' : 'Зареди още'}
            </Button>
          </div>
        )}

        {/* Empty State */}
        {filteredNotifications.length === 0 && !loading && (
          <Card>
            <CardContent className="text-center py-12">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {activeTab === 'unread' ? 'Няма непрочетени известия' : 'Няма известия'}
              </h3>
              <p className="text-gray-600">
                {activeTab === 'unread' 
                  ? 'Всички ваши известия са прочетени.' 
                  : 'Когато получите известия, те ще се появят тук.'
                }
              </p>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && notifications.length === 0 && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Зареждане на известия...</p>
          </div>
        )}
      </div>
    </div>
  )
}
