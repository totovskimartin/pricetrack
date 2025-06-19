'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { Bell, Check, CheckCheck, DollarSign, Users, Package, MessageSquare, AlertTriangle, X } from 'lucide-react'
import { useAdminNotifications, type AdminNotification } from '@/hooks/use-admin-notifications'
import { format } from 'date-fns'
import { bg } from 'date-fns/locale'
import Link from 'next/link'

interface AdminNotificationsProps {
  userRole: string
  userId: string
}

export function AdminNotifications({ userRole, userId }: AdminNotificationsProps) {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getNotificationUrl
  } = useAdminNotifications(userRole)

  const [isOpen, setIsOpen] = useState(false)

  const getNotificationIcon = (type: AdminNotification['type']) => {
    switch (type) {
      case 'price_suggestion':
        return <DollarSign className="h-4 w-4 text-green-600" />
      case 'new_user':
        return <Users className="h-4 w-4 text-blue-600" />
      case 'new_product':
        return <Package className="h-4 w-4 text-orange-600" />
      case 'new_discussion':
      case 'new_comment':
        return <MessageSquare className="h-4 w-4 text-purple-600" />
      case 'system_alert':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <Bell className="h-4 w-4 text-gray-600" />
    }
  }

  const getNotificationTypeLabel = (type: AdminNotification['type']) => {
    switch (type) {
      case 'price_suggestion':
        return 'Предложение за цена'
      case 'new_user':
        return 'Нов потребител'
      case 'new_product':
        return 'Нов продукт'
      case 'new_discussion':
        return 'Нова дискусия'
      case 'new_comment':
        return 'Нов коментар'
      case 'system_alert':
        return 'Системно известие'
      default:
        return 'Известие'
    }
  }

  const handleMarkAsRead = async (notificationId: string, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    await markAsRead(notificationId, userId)
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead(userId)
  }

  const handleDeleteNotification = async (notificationId: string, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    await deleteNotification(notificationId)
  }

  const recentNotifications = notifications.slice(0, 10)

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={unreadCount > 0 ? "default" : "ghost"}
          size="sm"
          className={`relative transition-all duration-200 ${
            unreadCount > 0
              ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg'
              : 'hover:bg-gray-100'
          }`}
        >
          <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'text-white' : 'text-gray-600'}`} />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-3 -right-3 h-7 w-7 rounded-full p-0 flex items-center justify-center text-sm font-bold shadow-xl border-3 border-white bg-red-500 text-white"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-white shadow-2xl border-2 border-gray-200 rounded-lg">
        <DropdownMenuLabel className="flex items-center justify-between bg-gray-50 px-4 py-3 border-b border-gray-200">
          <span className="font-semibold text-gray-900">Известия</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-6 px-2 text-xs hover:bg-gray-200"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Маркирай всички
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {loading ? (
          <div className="p-4 text-center text-sm text-gray-500 bg-white">
            Зареждане...
          </div>
        ) : recentNotifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500 bg-white">
            Няма известия
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto bg-white">
            {recentNotifications.map((notification) => (
              <DropdownMenuItem key={notification.id} className="p-0 border-b border-gray-100 last:border-b-0">
                <div
                  className={`w-full p-4 block transition-colors cursor-pointer ${
                    !notification.is_read
                      ? 'bg-blue-50 hover:bg-blue-100 border-l-4 border-l-blue-500'
                      : 'bg-white hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    if (!notification.is_read) {
                      markAsRead(notification.id, userId)
                    }
                    setIsOpen(false)
                    // Navigate to the notification URL
                    const url = getNotificationUrl(notification)
                    window.location.href = url
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-sm font-medium truncate ${
                          notification.is_read ? 'text-gray-600' : 'text-gray-900'
                        }`}>
                          {notification.title}
                        </p>
                        <div className="flex items-center space-x-1 ml-2">
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                            onClick={(e) => handleDeleteNotification(notification.id, e)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className={`text-xs truncate ${
                        notification.is_read ? 'text-gray-500' : 'text-gray-700'
                      }`}>
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <Badge variant="outline" className="text-xs">
                          {getNotificationTypeLabel(notification.type)}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {format(new Date(notification.created_at), 'dd MMM, HH:mm', { locale: bg })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
        
        {notifications.length > 10 && (
          <>
            <DropdownMenuSeparator className="bg-gray-200" />
            <DropdownMenuItem asChild className="bg-gray-50">
              <Link
                href="/bg/admin/notifications"
                className="w-full text-center text-sm text-blue-600 hover:text-blue-700 p-3 font-medium"
                onClick={() => setIsOpen(false)}
              >
                Виж всички известия
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Notification Bell Component for Admin Header
export function AdminNotificationBell({ userRole, userId }: AdminNotificationsProps) {
  const { unreadCount } = useAdminNotifications(userRole)

  return (
    <div className="relative">
      <AdminNotifications userRole={userRole} userId={userId} />
      {unreadCount > 0 && (
        <>
          {/* Pulsing ring effect */}
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75"></div>
          {/* Solid indicator */}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
        </>
      )}
    </div>
  )
}
