import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { notifyAdminsOfPriceSuggestion } from '@/lib/admin-email-notifications'

// This endpoint processes pending email notifications from the queue
// It should be called periodically (e.g., every minute) by a cron job or similar

export async function POST(request: NextRequest) {
  try {
    // Verify this is an internal request (you might want to add authentication)
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.INTERNAL_API_TOKEN || 'your-secret-token'
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get pending email notifications
    const { data: notifications, error } = await supabase
      .rpc('get_pending_email_notifications', { limit_count: 10 })

    if (error) {
      console.error('Error fetching pending notifications:', error)
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({ 
        message: 'No pending notifications to process',
        processed: 0 
      })
    }

    let processedCount = 0
    let failedCount = 0

    // Process each notification
    for (const notification of notifications) {
      try {
        let success = false

        switch (notification.type) {
          case 'admin_price_suggestion':
            success = await processAdminPriceSuggestionEmail(notification)
            break
          
          default:
            // Log unknown notification types for monitoring
            console.warn(`Unknown notification type: ${notification.type}`)
            // Mark as failed for unknown types
            await supabase.rpc('mark_email_notification_failed', {
              notification_id: notification.id,
              error_msg: `Unknown notification type: ${notification.type}`
            })
            failedCount++
            continue
        }

        if (success) {
          // Mark as sent
          await supabase.rpc('mark_email_notification_sent', {
            notification_id: notification.id
          })
          processedCount++
        } else {
          // Mark as failed
          await supabase.rpc('mark_email_notification_failed', {
            notification_id: notification.id,
            error_msg: 'Email sending failed'
          })
          failedCount++
        }

      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error)
        
        // Mark as failed
        await supabase.rpc('mark_email_notification_failed', {
          notification_id: notification.id,
          error_msg: error instanceof Error ? error.message : 'Unknown error'
        })
        failedCount++
      }
    }

    return NextResponse.json({
      message: 'Email notifications processed',
      total: notifications.length,
      processed: processedCount,
      failed: failedCount
    })

  } catch (error) {
    console.error('Error in email notification processing:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

async function processAdminPriceSuggestionEmail(notification: any): Promise<boolean> {
  try {
    const payload = notification.payload

    // Call the admin notification function
    const success = await notifyAdminsOfPriceSuggestion({
      id: payload.suggestion_id,
      product_id: payload.product_id,
      supermarket_id: payload.supermarket_id,
      suggested_price_bgn: payload.suggested_price,
      current_price_bgn: payload.current_price,
      notes: payload.notes,
      suggested_by: payload.user_id
    })

    return success
  } catch (error) {
    console.error('Error processing admin price suggestion email:', error)
    return false
  }
}

// GET endpoint for health check
export async function GET() {
  return NextResponse.json({ 
    status: 'Email notification processor is running',
    timestamp: new Date().toISOString()
  })
}
