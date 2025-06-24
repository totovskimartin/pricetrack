import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { emailNotificationService } from '@/lib/email/server-only'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin (only admins can trigger price notifications)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || !['admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { type, userId, userEmail, productData } = body

    if (!type || !userId || !userEmail || !productData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let result = false

    switch (type) {
      case 'price_drop':
        result = await emailNotificationService.sendPriceDropAlert(
          userId,
          userEmail,
          {
            productId: productData.productId,
            productName: productData.productName,
            productBrand: productData.productBrand,
            productImage: productData.productImage,
            oldPrice: productData.oldPrice,
            newPrice: productData.newPrice,
            supermarketName: productData.supermarketName,
            targetPrice: productData.targetPrice
          }
        )
        break

      case 'target_reached':
        result = await emailNotificationService.sendTargetPriceReachedAlert(
          userId,
          userEmail,
          {
            productId: productData.productId,
            productName: productData.productName,
            productBrand: productData.productBrand,
            productImage: productData.productImage,
            currentPrice: productData.currentPrice,
            targetPrice: productData.targetPrice,
            supermarketName: productData.supermarketName
          }
        )
        break

      case 'price_increase':
        result = await emailNotificationService.sendPriceIncreaseAlert(
          userId,
          userEmail,
          {
            productId: productData.productId,
            productName: productData.productName,
            productBrand: productData.productBrand,
            productImage: productData.productImage,
            oldPrice: productData.oldPrice,
            newPrice: productData.newPrice,
            supermarketName: productData.supermarketName
          }
        )
        break

      default:
        return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 })
    }

    if (result) {
      return NextResponse.json({ 
        success: true, 
        message: `${type} notification queued successfully` 
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        message: `Failed to queue ${type} notification` 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error in send-price-notification:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: 'Failed to send price notification'
    }, { status: 500 })
  }
}
