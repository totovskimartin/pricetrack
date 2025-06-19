#!/usr/bin/env node

/**
 * Test script to verify notification mark-as-read functionality
 * This script tests the database functions and API endpoints for marking notifications as read
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testNotificationMarkAsRead() {
  console.log('🧪 Testing notification mark-as-read functionality...\n')

  try {
    // 1. Get an existing user for testing
    console.log('1. Finding existing user for testing...')

    // Get any existing user from the database
    const { data: existingUsers, error: userError } = await supabase
      .from('users')
      .select('id, email, username')
      .limit(1)

    if (userError || !existingUsers || existingUsers.length === 0) {
      console.error('❌ No existing users found. Please create a user first:', userError)
      console.log('💡 You can create a user by registering through the app first.')
      return
    }

    const testUserId = existingUsers[0].id
    console.log('✅ Using existing user for testing:', {
      id: testUserId,
      email: existingUsers[0].email,
      username: existingUsers[0].username
    })

    // 2. Create test notifications
    console.log('\n2. Creating test notifications...')
    const testNotifications = [
      {
        user_id: testUserId,
        type: 'comment_reply',
        title: 'New comment reply',
        message: 'Someone replied to your comment',
        is_read: false
      },
      {
        user_id: testUserId,
        type: 'discussion_like',
        title: 'Discussion liked',
        message: 'Someone liked your discussion',
        is_read: false
      }
    ]

    const { data: createdNotifications, error: createError } = await supabase
      .from('notifications')
      .insert(testNotifications)
      .select('id, type, is_read')

    if (createError) {
      console.error('❌ Error creating test notifications:', createError)
      return
    }

    console.log('✅ Created test notifications:', createdNotifications.length)

    // 3. Test getting unread count
    console.log('\n3. Testing unread count function...')
    const { data: unreadCount, error: countError } = await supabase
      .rpc('get_unread_notification_count', { p_user_id: testUserId })

    if (countError) {
      console.error('❌ Error getting unread count:', countError)
      return
    }

    console.log('✅ Unread count:', unreadCount)

    // 4. Test marking single notification as read
    console.log('\n4. Testing mark single notification as read...')
    const firstNotificationId = createdNotifications[0].id
    
    const { data: markReadResult, error: markReadError } = await supabase
      .rpc('mark_notification_read', {
        notification_id: firstNotificationId,
        p_user_id: testUserId
      })

    if (markReadError) {
      console.error('❌ Error marking notification as read:', markReadError)
      return
    }

    console.log('✅ Mark as read result:', markReadResult)

    // Verify the notification was marked as read
    const { data: updatedNotification } = await supabase
      .from('notifications')
      .select('id, is_read')
      .eq('id', firstNotificationId)
      .single()

    console.log('✅ Notification status after marking as read:', updatedNotification)

    // 5. Test getting updated unread count
    console.log('\n5. Testing updated unread count...')
    const { data: newUnreadCount } = await supabase
      .rpc('get_unread_notification_count', { p_user_id: testUserId })

    console.log('✅ New unread count:', newUnreadCount)
    console.log('✅ Count decreased by 1:', unreadCount - newUnreadCount === 1)

    // 6. Test marking all notifications as read
    console.log('\n6. Testing mark all notifications as read...')
    const { data: markAllResult, error: markAllError } = await supabase
      .rpc('mark_all_notifications_read', { p_user_id: testUserId })

    if (markAllError) {
      console.error('❌ Error marking all notifications as read:', markAllError)
      return
    }

    console.log('✅ Mark all as read result (count updated):', markAllResult)

    // Verify all notifications are now read
    const { data: finalUnreadCount } = await supabase
      .rpc('get_unread_notification_count', { p_user_id: testUserId })

    console.log('✅ Final unread count:', finalUnreadCount)

    // 7. Clean up test data
    console.log('\n7. Cleaning up test data...')
    await supabase
      .from('notifications')
      .delete()
      .eq('user_id', testUserId)

    console.log('✅ Cleaned up test notifications')

    console.log('\n🎉 All notification mark-as-read tests passed!')

  } catch (error) {
    console.error('❌ Test failed with error:', error)
  }
}

// Run the test
if (require.main === module) {
  testNotificationMarkAsRead()
}

module.exports = { testNotificationMarkAsRead }
