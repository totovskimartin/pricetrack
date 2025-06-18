import { supabase } from './supabase'

export interface Notification {
  id: string
  user_id: string
  type: 'comment_reply' | 'discussion_reply' | 'comment_like' | 'discussion_like' | 
        'price_drop' | 'price_increase' | 'product_approved' | 'discussion_approved' | 'comment_approved'
  title: string
  message: string
  is_read: boolean
  product_id?: string
  discussion_id?: string
  comment_id?: string
  price_id?: string
  metadata: any
  created_at: string
  updated_at: string
  
  // Related data (populated via joins)
  product?: {
    id: string
    name: string
    image_url?: string
  }
  discussion?: {
    id: string
    title: string
    slug: string
  }
  price?: {
    id: string
    price_bgn: number
    supermarket?: {
      name: string
    }
  }
}

export interface NotificationPreferences {
  id: string
  user_id: string
  email_comment_replies: boolean
  email_discussion_replies: boolean
  email_likes: boolean
  email_price_changes: boolean
  email_approvals: boolean
  app_comment_replies: boolean
  app_discussion_replies: boolean
  app_likes: boolean
  app_price_changes: boolean
  app_approvals: boolean
  price_drop_threshold_percent: number
  price_increase_threshold_percent: number
  created_at: string
  updated_at: string
}

// Get user's notifications with pagination
export async function getUserNotifications(
  userId: string, 
  page: number = 1, 
  limit: number = 20,
  unreadOnly: boolean = false
) {
  try {
    let query = supabase
      .from('notifications')
      .select(`
        *,
        product:products(id, name, image_url),
        discussion:discussions(id, title, slug),
        price:prices(
          id, 
          price_bgn,
          supermarket:supermarkets(name)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching notifications:', error)
      return { notifications: [], error }
    }

    return { notifications: data as Notification[], error: null }
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return { notifications: [], error }
  }
}

// Get unread notification count
export async function getUnreadNotificationCount(userId: string) {
  try {
    const { data, error } = await supabase.rpc('get_unread_notification_count', {
      p_user_id: userId
    })

    if (error) {
      console.error('Error getting unread count:', error)
      return 0
    }

    return data || 0
  } catch (error) {
    console.error('Error getting unread count:', error)
    return 0
  }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string, userId: string) {
  try {
    const { data, error } = await supabase.rpc('mark_notification_read', {
      notification_id: notificationId,
      p_user_id: userId
    })

    if (error) {
      console.error('Error marking notification as read:', error)
      return false
    }

    return data
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return false
  }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(userId: string) {
  try {
    const { data, error } = await supabase.rpc('mark_all_notifications_read', {
      p_user_id: userId
    })

    if (error) {
      console.error('Error marking all notifications as read:', error)
      return 0
    }

    return data || 0
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return 0
  }
}

// Get user's notification preferences
export async function getUserNotificationPreferences(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching notification preferences:', error)
      return { preferences: null, error }
    }

    // If no preferences exist, create default ones
    if (!data) {
      const { data: newPrefs, error: createError } = await supabase
        .from('user_notification_preferences')
        .insert({ user_id: userId })
        .select()
        .single()

      if (createError) {
        console.error('Error creating default preferences:', createError)
        return { preferences: null, error: createError }
      }

      return { preferences: newPrefs as NotificationPreferences, error: null }
    }

    return { preferences: data as NotificationPreferences, error: null }
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return { preferences: null, error }
  }
}

// Update user's notification preferences
export async function updateNotificationPreferences(
  userId: string, 
  preferences: Partial<NotificationPreferences>
) {
  try {
    const { data, error } = await supabase
      .from('user_notification_preferences')
      .update(preferences)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating notification preferences:', error)
      return { preferences: null, error }
    }

    return { preferences: data as NotificationPreferences, error: null }
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return { preferences: null, error }
  }
}

// Create a manual notification (for admin use)
export async function createNotification(
  userId: string,
  type: Notification['type'],
  title: string,
  message: string,
  options: {
    productId?: string
    discussionId?: string
    commentId?: string
    priceId?: string
    metadata?: any
  } = {}
) {
  try {
    const { data, error } = await supabase.rpc('create_notification', {
      p_user_id: userId,
      p_type: type,
      p_title: title,
      p_message: message,
      p_product_id: options.productId || null,
      p_discussion_id: options.discussionId || null,
      p_comment_id: options.commentId || null,
      p_price_id: options.priceId || null,
      p_metadata: options.metadata || {}
    })

    if (error) {
      console.error('Error creating notification:', error)
      return { notificationId: null, error }
    }

    return { notificationId: data, error: null }
  } catch (error) {
    console.error('Error creating notification:', error)
    return { notificationId: null, error }
  }
}

// Delete old notifications (cleanup function)
export async function deleteOldNotifications(userId: string, daysOld: number = 30) {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .lt('created_at', cutoffDate.toISOString())

    if (error) {
      console.error('Error deleting old notifications:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting old notifications:', error)
    return false
  }
}

// Get notification type icon and color
export function getNotificationTypeInfo(type: Notification['type']) {
  switch (type) {
    case 'comment_reply':
    case 'discussion_reply':
      return { icon: 'MessageCircle', color: 'text-blue-600', bgColor: 'bg-blue-100' }
    case 'comment_like':
    case 'discussion_like':
      return { icon: 'Heart', color: 'text-red-600', bgColor: 'bg-red-100' }
    case 'price_drop':
      return { icon: 'TrendingDown', color: 'text-green-600', bgColor: 'bg-green-100' }
    case 'price_increase':
      return { icon: 'TrendingUp', color: 'text-orange-600', bgColor: 'bg-orange-100' }
    case 'product_approved':
    case 'discussion_approved':
    case 'comment_approved':
      return { icon: 'CheckCircle', color: 'text-green-600', bgColor: 'bg-green-100' }
    default:
      return { icon: 'Bell', color: 'text-gray-600', bgColor: 'bg-gray-100' }
  }
}

// Format notification time
export function formatNotificationTime(createdAt: string) {
  const now = new Date()
  const notificationTime = new Date(createdAt)
  const diffInSeconds = Math.floor((now.getTime() - notificationTime.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'преди няколко секунди'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `преди ${diffInMinutes} минути`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `преди ${diffInHours} часа`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `преди ${diffInDays} дни`
  }

  return notificationTime.toLocaleDateString('bg-BG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
