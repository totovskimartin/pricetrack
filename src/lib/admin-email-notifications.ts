import { supabase } from './supabase'
import { emailNotificationService } from './email/email-service'

interface PriceSuggestionData {
  id: string
  product_id: string
  supermarket_id: string
  suggested_price_bgn: number
  current_price_bgn?: number
  notes?: string
  suggested_by: string
}

/**
 * Send email notifications to admins when a new price suggestion is submitted
 */
export async function notifyAdminsOfPriceSuggestion(suggestionData: PriceSuggestionData) {
  try {
    // Get admin users with email notification preferences
    const { data: admins, error: adminsError } = await supabase
      .from('users')
      .select('id, email, full_name, username, notification_preferences')
      .in('role', ['admin', 'super_admin', 'moderator'])
      .eq('is_active', true)

    if (adminsError) {
      console.error('Error fetching admin users:', adminsError)
      return false
    }

    if (!admins || admins.length === 0) {
      console.log('No admin users found for email notifications')
      return false
    }

    // Get product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('name, slug')
      .eq('id', suggestionData.product_id)
      .single()

    if (productError) {
      console.error('Error fetching product details:', productError)
      return false
    }

    // Get supermarket details
    const { data: supermarket, error: supermarketError } = await supabase
      .from('supermarkets')
      .select('name')
      .eq('id', suggestionData.supermarket_id)
      .single()

    if (supermarketError) {
      console.error('Error fetching supermarket details:', supermarketError)
      return false
    }

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('full_name, username, email')
      .eq('id', suggestionData.suggested_by)
      .single()

    if (userError) {
      console.error('Error fetching user details:', userError)
      return false
    }

    const userName = user.full_name || user.username || user.email
    const productUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/bg/products/${product.slug}`
    const adminPanelUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/bg/admin/price-suggestions`

    // Send email to each admin who has email notifications enabled
    const emailPromises = admins
      .filter(admin => {
        // Check if admin has email notifications enabled
        const prefs = admin.notification_preferences || {}
        return prefs.email_admin_notifications !== false // Default to true if not set
      })
      .map(async (admin) => {
        const adminName = admin.full_name || admin.username || admin.email

        try {
          const details = `Потребител ${userName} предложи цена ${suggestionData.suggested_price_bgn} лв. за "${product.name}" в ${supermarket.name}.

Текуща цена: ${suggestionData.current_price_bgn || 'Неизвестна'} лв.
${suggestionData.notes ? `Бележки: ${suggestionData.notes}` : ''}

Продукт: ${productUrl}
Администрация: ${adminPanelUrl}`

          await emailNotificationService.sendAdminNotification(
            'Ново предложение за цена',
            details,
            adminPanelUrl,
            {
              suggestion_id: suggestionData.id,
              product_id: suggestionData.product_id,
              supermarket_id: suggestionData.supermarket_id,
              suggested_price: suggestionData.suggested_price_bgn,
              current_price: suggestionData.current_price_bgn,
              user_id: suggestionData.suggested_by
            }
          )

          console.log(`✅ Admin email notification sent to ${admin.email}`)
          return true
        } catch (error) {
          console.error(`❌ Failed to send admin email notification to ${admin.email}:`, error)
          return false
        }
      })

    const results = await Promise.allSettled(emailPromises)
    const successCount = results.filter(result => result.status === 'fulfilled' && result.value).length
    const totalCount = emailPromises.length

    console.log(`📧 Admin email notifications: ${successCount}/${totalCount} sent successfully`)

    return successCount > 0
  } catch (error) {
    console.error('Error in notifyAdminsOfPriceSuggestion:', error)
    return false
  }
}

/**
 * Add email notification preferences to user notification preferences
 */
export async function updateAdminEmailPreferences(userId: string, enableEmailNotifications: boolean) {
  try {
    const { data: currentPrefs, error: fetchError } = await supabase
      .from('users')
      .select('notification_preferences')
      .eq('id', userId)
      .single()

    if (fetchError) {
      console.error('Error fetching current preferences:', fetchError)
      return false
    }

    const updatedPrefs = {
      ...(currentPrefs?.notification_preferences || {}),
      email_admin_notifications: enableEmailNotifications
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ notification_preferences: updatedPrefs })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating email preferences:', updateError)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in updateAdminEmailPreferences:', error)
    return false
  }
}
