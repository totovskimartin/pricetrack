import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { emailQueue, emailNotificationService } from '@/lib/email/server-only'
import { createClient } from '@supabase/supabase-js'

// Helper function to create admin Supabase client
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Helper function to check admin authentication
async function checkAdminAuth(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })

  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized', status: 401, user: null }
  }

  // Check if user is admin
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role, email, username, full_name')
    .eq('id', user.id)
    .single()

  if (userError || !userData || !['admin', 'super_admin'].includes(userData.role)) {
    return { error: 'Forbidden - Admin access required', status: 403, user: null }
  }

  return { error: null, status: 200, user: { ...user, ...userData } }
}

// GET - Get email system status and statistics
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await checkAdminAuth(request)
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    console.log('Admin user accessing email system:', authResult.user?.email)
    
    // Create admin Supabase client
    const supabase = createAdminClient()

    // Get queue statistics
    const stats = await emailQueue.getQueueStats()

    // Get recent emails from queue
    const { data: recentEmails, error: emailsError } = await supabase
      .from('email_queue')
      .select('id, to_email, subject, email_type, status, attempts, created_at, sent_at, error_message')
      .order('created_at', { ascending: false })
      .limit(50)

    if (emailsError) {
      console.error('Error fetching recent emails:', emailsError)
    }

    return NextResponse.json({
      stats,
      recent_emails: recentEmails || [],
      user: authResult.user,
      message: 'Email system data retrieved successfully'
    })
  } catch (error) {
    console.error('Error getting email queue status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Process email queue manually
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await checkAdminAuth(request)
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    console.log('Admin user processing email queue:', authResult.user?.email)

    // Process the email queue
    await emailQueue.processQueue()

    // Get updated queue statistics
    const stats = await emailQueue.getQueueStats()

    return NextResponse.json({
      message: 'Email queue processed successfully',
      stats,
      processed_by: authResult.user?.email
    })
  } catch (error) {
    console.error('Error processing email queue:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Send test email
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await checkAdminAuth(request)
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const body = await request.json()
    const { testType = 'welcome' } = body

    // Use the authenticated admin user's email for test emails
    const userEmail = authResult.user?.email
    if (!userEmail) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 })
    }

    console.log(`Admin ${userEmail} sending test ${testType} email to themselves`)

    let result = false
    let emailType = ''

    // Generate a valid UUID for testing
    const testUserId = '00000000-0000-0000-0000-000000000000'

    switch (testType) {
      case 'welcome':
        result = await emailNotificationService.sendWelcomeEmail(testUserId, userEmail)
        emailType = 'Welcome Email'
        break

      case 'price_drop':
        result = await emailNotificationService.sendPriceDropAlert(
          testUserId,
          userEmail,
          {
            productId: 'test-product-id',
            productName: 'Тестов продукт',
            productBrand: 'Тестова марка',
            productImage: 'https://via.placeholder.com/200x200?text=Test+Product',
            oldPrice: 5.99,
            newPrice: 3.99,
            supermarketName: 'Тестов супермаркет',
            targetPrice: 4.00
          }
        )
        emailType = 'Price Drop Alert'
        break

      case 'target_reached':
        result = await emailNotificationService.sendTargetPriceReachedAlert(
          testUserId,
          userEmail,
          {
            productId: 'test-product-id',
            productName: 'Тестов продукт',
            productBrand: 'Тестова марка',
            productImage: 'https://via.placeholder.com/200x200?text=Test+Product',
            currentPrice: 3.50,
            targetPrice: 4.00,
            supermarketName: 'Тестов супермаркет'
          }
        )
        emailType = 'Target Price Reached'
        break

      case 'admin_notification':
        result = await emailNotificationService.sendAdminNotification(
          'Тестово админ известие',
          'Това е тестово админ известие за проверка на имейл системата.',
          undefined,
          {
            type: 'test',
            timestamp: new Date().toISOString(),
            admin_user: authResult.user?.email
          }
        )
        emailType = 'Admin Notification'
        break

      default:
        return NextResponse.json({ error: 'Invalid test type' }, { status: 400 })
    }

    if (result) {
      return NextResponse.json({
        success: true,
        message: `${emailType} test email queued successfully`,
        recipient: userEmail,
        testType,
        sent_by: authResult.user?.email
      })
    } else {
      return NextResponse.json({
        success: false,
        message: `Failed to queue ${emailType} test email`
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error sending test email:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
