'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUserNotificationPreferences,
  updateNotificationPreferences,
  type Notification,
  type NotificationPreferences
} from '@/lib/notifications'

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  // Fetch notifications
  const fetchNotifications = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!user) return

    setLoading(true)
    try {
      const { notifications: newNotifications, error } = await getUserNotifications(
        user.id, 
        page, 
        20
      )

      if (!error && newNotifications) {
        if (append) {
          setNotifications(prev => [...prev, ...newNotifications])
        } else {
          setNotifications(newNotifications)
        }
        
        setHasMore(newNotifications.length === 20)
        setCurrentPage(page)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return

    try {
      const count = await getUnreadNotificationCount(user.id)
      setUnreadCount(count)
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }, [user])

  // Fetch preferences
  const fetchPreferences = useCallback(async () => {
    if (!user) return

    try {
      const { preferences: userPrefs } = await getUserNotificationPreferences(user.id)
      setPreferences(userPrefs)
    } catch (error) {
      console.error('Error fetching preferences:', error)
    }
  }, [user])

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return

    try {
      const success = await markNotificationAsRead(notificationId, user.id)
      if (success) {
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, is_read: true }
              : notification
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }, [user])

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!user) return

    try {
      const updatedCount = await markAllNotificationsAsRead(user.id)
      if (updatedCount > 0) {
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, is_read: true }))
        )
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }, [user])

  // Update preferences
  const updatePrefs = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    if (!user) return

    try {
      const { preferences: updatedPrefs } = await updateNotificationPreferences(
        user.id, 
        newPreferences
      )
      if (updatedPrefs) {
        setPreferences(updatedPrefs)
      }
    } catch (error) {
      console.error('Error updating preferences:', error)
    }
  }, [user])

  // Load more notifications
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return
    await fetchNotifications(currentPage + 1, true)
  }, [hasMore, loading, currentPage, fetchNotifications])

  // Refresh notifications
  const refresh = useCallback(async () => {
    await Promise.all([
      fetchNotifications(1, false),
      fetchUnreadCount()
    ])
  }, [fetchNotifications, fetchUnreadCount])

  // Initial load
  useEffect(() => {
    if (user) {
      fetchNotifications()
      fetchUnreadCount()
      fetchPreferences()
    } else {
      setNotifications([])
      setUnreadCount(0)
      setPreferences(null)
    }
  }, [user, fetchNotifications, fetchUnreadCount, fetchPreferences])

  // Set up real-time updates for unread count
  useEffect(() => {
    if (!user) return

    // Poll for unread count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)

    return () => clearInterval(interval)
  }, [user, fetchUnreadCount])

  return {
    notifications,
    unreadCount,
    loading,
    preferences,
    hasMore,
    markAsRead,
    markAllAsRead,
    updatePrefs,
    loadMore,
    refresh,
    fetchNotifications
  }
}

// Hook for just the unread count (lighter weight)
export function useUnreadNotificationCount() {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return

    try {
      const count = await getUnreadNotificationCount(user.id)
      setUnreadCount(count)
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchUnreadCount()
      
      // Poll every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000)
      return () => clearInterval(interval)
    } else {
      setUnreadCount(0)
    }
  }, [user, fetchUnreadCount])

  return { unreadCount, refresh: fetchUnreadCount }
}
