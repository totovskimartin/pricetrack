'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import {
  Bell,
  DollarSign,
  Users,
  Package,
  MessageSquare,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Trash2,
  CheckCheck,
  Calendar,
  Clock,
  FileText
} from 'lucide-react'
import { format } from 'date-fns'
import { bg } from 'date-fns/locale'
import Link from 'next/link'
import { useToast } from '@/components/providers/toast-provider'
import { NotificationDetailModal } from './notification-detail-modal'
import { MobileAlertsManagement } from './mobile-alerts-management'

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

export default function AlertsManagement() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([])
  const [selectedNotification, setSelectedNotification] = useState<AdminNotification | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { showSuccess, showError } = useToast()

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotifications(data || [])
    } catch (error) {
      console.error('Error fetching notifications:', error)
      showError('Грешка', 'Неуспешно зареждане на известията')
    } finally {
      setLoading(false)
    }
  }

  const getNotificationIcon = (type: string) => {
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

  const markAsRead = async (notificationIds: string[]) => {
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .in('id', notificationIds)

      if (error) throw error

      setNotifications(prev =>
        prev.map(notification =>
          notificationIds.includes(notification.id)
            ? { ...notification, is_read: true, read_at: new Date().toISOString() }
            : notification
        )
      )

      // Trigger a custom event to refresh the admin counter
      window.dispatchEvent(new CustomEvent('refreshAdminNotifications'))

      showSuccess('Успех', `${notificationIds.length} известия бяха маркирани като прочетени`)
    } catch (error) {
      console.error('Error marking as read:', error)
      showError('Грешка', 'Неуспешно маркиране като прочетени')
    }
  }

  const handleViewNotification = (notification: AdminNotification) => {
    setSelectedNotification(notification)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedNotification(null)
  }

  const handleMarkAsReadFromModal = async (notificationId: string) => {
    await markAsRead([notificationId])
    // Update the selected notification state if it's the same one
    if (selectedNotification?.id === notificationId) {
      setSelectedNotification(prev =>
        prev ? { ...prev, is_read: true, read_at: new Date().toISOString() } : null
      )
    }
  }

  const deleteNotifications = async (notificationIds: string[]) => {
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .delete()
        .in('id', notificationIds)

      if (error) throw error

      setNotifications(prev => 
        prev.filter(notification => !notificationIds.includes(notification.id))
      )

      setSelectedNotifications([])
      showSuccess('Успех', `${notificationIds.length} известия бяха изтрити`)
    } catch (error) {
      console.error('Error deleting notifications:', error)
      showError('Грешка', 'Неуспешно изтриване на известията')
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === 'all' || notification.type === typeFilter
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'read' && notification.is_read) ||
                         (statusFilter === 'unread' && !notification.is_read)
    
    return matchesSearch && matchesType && matchesStatus
  })

  const unreadCount = notifications.filter(n => !n.is_read).length
  const totalCount = notifications.length

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Зареждане на известията...</p>
          </div>
        </div>
      </div>
    )
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <>
        <MobileAlertsManagement
          alerts={filteredNotifications}
          loading={loading}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          onView={handleViewNotification}
          onDelete={(alert) => deleteNotifications([alert.id])}
          onMarkAsRead={(alert) => markAsRead([alert.id])}
          formatDate={(date) => format(new Date(date), 'dd.MM.yyyy', { locale: bg })}
          formatRelativeTime={(date) => format(new Date(date), 'dd.MM.yyyy HH:mm', { locale: bg })}
        />

        {/* Notification Detail Modal */}
        <NotificationDetailModal
          notification={selectedNotification}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onMarkAsRead={handleMarkAsReadFromModal}
        />
      </>
    )
  }

  // Desktop Layout
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Bell className="h-6 w-6 text-blue-600" />
            <span>Известия</span>
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Управление на административни известия и уведомления
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-sm">
            Общо: {totalCount}
          </Badge>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-sm">
              Непрочетени: {unreadCount}
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Общо известия</p>
                <p className="text-xl font-bold text-gray-900">{totalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Прочетени</p>
                <p className="text-xl font-bold text-gray-900">{totalCount - unreadCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Непрочетени</p>
                <p className="text-xl font-bold text-gray-900">{unreadCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Днес</p>
                <p className="text-xl font-bold text-gray-900">
                  {notifications.filter(n => 
                    new Date(n.created_at).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 items-center flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Търсене в известията..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Тип известие" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Всички типове</SelectItem>
                  <SelectItem value="price_suggestion">Предложения за цени</SelectItem>
                  <SelectItem value="new_user">Нови потребители</SelectItem>
                  <SelectItem value="new_product">Нови продукти</SelectItem>
                  <SelectItem value="new_discussion">Нови дискусии</SelectItem>
                  <SelectItem value="new_comment">Нови коментари</SelectItem>
                  <SelectItem value="system_alert">Системни известия</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Всички</SelectItem>
                  <SelectItem value="unread">Непрочетени</SelectItem>
                  <SelectItem value="read">Прочетени</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bulk Actions */}
            {selectedNotifications.length > 0 && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAsRead(selectedNotifications)}
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Маркирай като прочетени ({selectedNotifications.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteNotifications(selectedNotifications)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Изтрий ({selectedNotifications.length})
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notifications Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Списък с известия</span>
            <span className="text-sm font-normal text-gray-500">
              {filteredNotifications.length} от {totalCount} известия
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">Няма известия</p>
              <p className="text-sm">Не са намерени известия, отговарящи на критериите за търсене.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedNotifications.length === filteredNotifications.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedNotifications(filteredNotifications.map(n => n.id))
                          } else {
                            setSelectedNotifications([])
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Тип
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Заглавие
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Съобщение
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Дата
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredNotifications.map((notification) => (
                    <tr
                      key={notification.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        !notification.is_read ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedNotifications.includes(notification.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedNotifications(prev => [...prev, notification.id])
                            } else {
                              setSelectedNotifications(prev => prev.filter(id => id !== notification.id))
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-2">
                          {getNotificationIcon(notification.type)}
                          <Badge variant="outline" className="text-xs">
                            {getNotificationTypeLabel(notification.type)}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-2">
                          <p className={`text-sm font-medium ${
                            !notification.is_read ? 'text-gray-900' : 'text-gray-600'
                          }`}>
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-600 max-w-md truncate">
                          {notification.message}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <Badge
                          variant={notification.is_read ? "secondary" : "default"}
                          className="text-xs"
                        >
                          {notification.is_read ? 'Прочетено' : 'Непрочетено'}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-600">
                          <p>{format(new Date(notification.created_at), 'dd MMM yyyy', { locale: bg })}</p>
                          <p className="text-xs text-gray-400">
                            {format(new Date(notification.created_at), 'HH:mm', { locale: bg })}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewNotification(notification)}
                            title="Виж детайли"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Link href={getNotificationUrl(notification)}>
                            <Button variant="ghost" size="sm" title="Отиди към секцията">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead([notification.id])}
                              title="Маркирай като прочетено"
                            >
                              <CheckCheck className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNotifications([notification.id])}
                            className="text-red-600 hover:text-red-700"
                            title="Изтрий известието"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Detail Modal */}
      <NotificationDetailModal
        notification={selectedNotification}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onMarkAsRead={handleMarkAsReadFromModal}
      />
    </div>
  )
}
