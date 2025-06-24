import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { emailNotificationService, emailQueue } from '@/lib/email/server-only'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, email, username, full_name')
      .eq('id', user.id)
      .single()

    if (userError || !userData || !['admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { test_type = 'welcome' } = body

    let result = false
    let message = ''

    switch (test_type) {
      case 'welcome':
        result = await emailNotificationService.sendWelcomeEmail(user.id, userData.email)
        message = 'Welcome email test'
        break

      case 'admin_notification':
        result = await emailNotificationService.sendAdminNotification(
          'Тест на системата',
          'Това е тестово съобщение за проверка на имейл системата.',
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/bg/admin`,
          { test: true, user_id: user.id }
        )
        message = 'Admin notification test'
        break

      case 'price_alert':
        result = await emailNotificationService.sendPriceDropAlert(
          user.id,
          userData.email,
          {
            productId: 'test-product',
            productName: 'Тестов продукт',
            productBrand: 'Тестова марка',
            oldPrice: 10.00,
            newPrice: 8.50,
            supermarketName: 'Тестов магазин'
          }
        )
        message = 'Price drop alert test'
        break

      case 'target_price':
        result = await emailNotificationService.sendTargetPriceReachedAlert(
          user.id,
          userData.email,
          {
            productId: 'test-product',
            productName: 'Тестов продукт',
            productBrand: 'Тестова марка',
            currentPrice: 7.99,
            targetPrice: 8.00,
            supermarketName: 'Тестов магазин'
          }
        )
        message = 'Target price reached test'
        break

      default:
        return NextResponse.json({ error: 'Invalid test type' }, { status: 400 })
    }

    if (result) {
      return NextResponse.json({
        success: true,
        message: `${message} email queued successfully`,
        test_type
      })
    } else {
      return NextResponse.json({
        success: false,
        message: `Failed to queue ${message} email`,
        test_type
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error in test email:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || !['admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Return available test types
    return NextResponse.json({
      available_tests: [
        {
          type: 'welcome',
          name: 'Welcome Email',
          description: 'Test welcome email for new users'
        },
        {
          type: 'admin_notification',
          name: 'Admin Notification',
          description: 'Test admin notification email'
        },
        {
          type: 'price_alert',
          name: 'Price Drop Alert',
          description: 'Test price drop notification email'
        },
        {
          type: 'target_price',
          name: 'Target Price Reached',
          description: 'Test target price reached notification email'
        }
      ],
      email_service_enabled: process.env.EMAIL_ENABLED !== 'false',
      sendgrid_configured: Boolean(process.env.SENDGRID_API_KEY)
    })

  } catch (error) {
    console.error('Error getting test email info:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
