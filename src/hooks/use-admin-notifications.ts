'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface AdminNotification {
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

export function useAdminNotifications(userRole?: string) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (userRole && ['admin', 'super_admin', 'moderator'].includes(userRole)) {
      fetchNotifications()
      fetchUnreadCount()

      // Set up real-time subscription
      const subscription = supabase
        .channel('admin_notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'admin_notifications'
          },
          (payload) => {
            console.log('Notification change:', payload)
            fetchNotifications()
            fetchUnreadCount()
          }
        )
        .subscribe()

      // Listen for custom refresh events
      const handleRefresh = () => {
        fetchNotifications()
        fetchUnreadCount()
      }

      window.addEventListener('refreshAdminNotifications', handleRefresh)

      return () => {
        subscription.unsubscribe()
        window.removeEventListener('refreshAdminNotifications', handleRefresh)
      }
    }
  }, [userRole])

  const fetchNotifications = async () => {
    if (!userRole) return

    try {
      setError(null)
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        throw error
      }

      setNotifications(data || [])
    } catch (err) {
      console.error('Error fetching notifications:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications')
    } finally {
      setLoading(false)
    }
  }

  const fetchUnreadCount = async () => {
    if (!userRole) return

    try {
      const { data, error } = await supabase.rpc('get_admin_unread_notifications_count', {
        p_user_role: userRole
      })

      if (error) {
        throw error
      }

      setUnreadCount(data || 0)
    } catch (err) {
      console.error('Error fetching unread count:', err)
      setUnreadCount(0)
    }
  }

  const markAsRead = async (notificationId: string, userId: string) => {
    try {
      const { data, error } = await supabase.rpc('mark_admin_notification_read', {
        p_notification_id: notificationId,
        p_user_id: userId
      })

      if (error) {
        throw error
      }

      // Update local state
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, is_read: true, read_at: new Date().toISOString(), read_by: userId }
            : notification
        )
      )

      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1))

      return data
    } catch (err) {
      console.error('Error marking notification as read:', err)
      return false
    }
  }

  const markAllAsRead = async (userId: string) => {
    try {
      const unreadNotifications = notifications.filter(n => !n.is_read)

      if (unreadNotifications.length === 0) {
        return true
      }

      const { data, error } = await supabase.rpc('mark_all_admin_notifications_read', {
        p_user_id: userId,
        p_user_role: userRole
      })

      if (error) {
        throw error
      }

      // Update local state
      setNotifications(prev =>
        prev.map(notification => ({
          ...notification,
          is_read: true,
          read_at: new Date().toISOString(),
          read_by: userId
        }))
      )

      setUnreadCount(0)

      return data
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
      return false
    }
  }

  const createNotification = async (
    type: AdminNotification['type'],
    title: string,
    message: string,
    data?: any,
    targetId?: string,
    targetType?: string,
    createdForRole: 'admin' | 'super_admin' | 'moderator' = 'admin'
  ) => {
    try {
      const { data: notification, error } = await supabase
        .from('admin_notifications')
        .insert({
          type,
          title,
          message,
          data,
          target_id: targetId,
          target_type: targetType,
          created_for_role: createdForRole
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      return notification
    } catch (err) {
      console.error('Error creating notification:', err)
      throw err
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .delete()
        .eq('id', notificationId)

      if (error) {
        throw error
      }

      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      
      // Update unread count if the deleted notification was unread
      const deletedNotification = notifications.find(n => n.id === notificationId)
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }

      return true
    } catch (err) {
      console.error('Error deleting notification:', err)
      return false
    }
  }

  const getNotificationsByType = (type: AdminNotification['type']) => {
    return notifications.filter(n => n.type === type)
  }

  const getUnreadNotifications = () => {
    return notifications.filter(n => !n.is_read)
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

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    createNotification,
    deleteNotification,
    getNotificationsByType,
    getUnreadNotifications,
    getNotificationUrl
  }
}
