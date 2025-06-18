'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { bg } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Bell, 
  User, 
  Package, 
  MessageSquare, 
  DollarSign, 
  AlertTriangle,
  CheckCheck,
  ExternalLink,
  Clock,
  Calendar
} from 'lucide-react'
import Link from 'next/link'

interface AdminNotification {
  id: string
  type: 'price_suggestion' | 'new_user' | 'new_product' | 'new_discussion' | 'new_comment' | 'system_alert'
  title: string
  message: string
  data: any
  target_id: string | null
  target_type: string | null
  is_read: boolean
  created_for_role: 'admin' | 'super_admin' | 'moderator'
  created_at: string
  read_at: string | null
  read_by: string | null
}

interface NotificationDetailModalProps {
  notification: AdminNotification | null
  isOpen: boolean
  onClose: () => void
  onMarkAsRead: (notificationId: string) => Promise<void>
}

export function NotificationDetailModal({
  notification,
  isOpen,
  onClose,
  onMarkAsRead
}: NotificationDetailModalProps) {
  const [loading, setLoading] = useState(false)

  if (!notification) return null

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'price_suggestion':
        return <DollarSign className="h-5 w-5 text-green-600" />
      case 'new_user':
        return <User className="h-5 w-5 text-blue-600" />
      case 'new_product':
        return <Package className="h-5 w-5 text-purple-600" />
      case 'new_discussion':
        return <MessageSquare className="h-5 w-5 text-orange-600" />
      case 'new_comment':
        return <MessageSquare className="h-5 w-5 text-yellow-600" />
      case 'system_alert':
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      default:
        return <Bell className="h-5 w-5 text-gray-600" />
    }
  }

  const getNotificationTypeLabel = (type: string) => {
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

  const getNotificationUrl = (notification: AdminNotification) => {
    switch (notification.type) {
      case 'price_suggestion':
        return '/bg/admin/price-suggestions'
      case 'new_user':
        return '/bg/admin/users'
      case 'new_product':
        return '/bg/admin/products'
      case 'new_discussion':
        return '/bg/admin/discussions'
      case 'new_comment':
        return '/bg/admin/discussions'
      default:
        return '/bg/admin'
    }
  }

  const handleMarkAsRead = async () => {
    if (notification.is_read) return
    
    setLoading(true)
    try {
      await onMarkAsRead(notification.id)
    } catch (error) {
      console.error('Error marking as read:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMMM yyyy, HH:mm', { locale: bg })
  }

  const renderAdditionalData = () => {
    if (!notification.data) return null

    return (
      <Card className="mt-4">
        <CardContent className="p-4">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
            <Package className="h-4 w-4" />
            <span>Допълнителна информация</span>
          </h4>
          <div className="space-y-2 text-sm">
            {Object.entries(notification.data).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}:</span>
                <span className="text-gray-900 font-medium">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            {getNotificationIcon(notification.type)}
            <span>{notification.title}</span>
            {!notification.is_read && (
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            )}
          </DialogTitle>
          <DialogDescription className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {getNotificationTypeLabel(notification.type)}
            </Badge>
            <Badge
              variant={notification.is_read ? "secondary" : "default"}
              className="text-xs"
            >
              {notification.is_read ? 'Прочетено' : 'Непрочетено'}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Message Content */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-gray-900 mb-2">Съобщение</h4>
              <p className="text-gray-700 leading-relaxed">{notification.message}</p>
            </CardContent>
          </Card>

          {/* Timestamp Information */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Информация за времето</span>
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>Създадено:</span>
                  </span>
                  <span className="text-gray-900 font-medium">
                    {formatDate(notification.created_at)}
                  </span>
                </div>
                {notification.read_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 flex items-center space-x-1">
                      <CheckCheck className="h-3 w-3" />
                      <span>Прочетено:</span>
                    </span>
                    <span className="text-gray-900 font-medium">
                      {formatDate(notification.read_at)}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Additional Data */}
          {renderAdditionalData()}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link href={getNotificationUrl(notification)}>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Отиди към секцията
              </Button>
            </Link>
          </div>
          <div className="flex items-center space-x-2">
            {!notification.is_read && (
              <Button
                onClick={handleMarkAsRead}
                disabled={loading}
                size="sm"
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                {loading ? 'Маркиране...' : 'Маркирай като прочетено'}
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Затвори
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
