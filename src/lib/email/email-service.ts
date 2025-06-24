import { createClient } from '@supabase/supabase-js'
import { emailQueue } from './email-queue'
import {
  getPriceDropTemplate,
  getPriceIncreaseTemplate,
  getTargetPriceReachedTemplate,
  getWelcomeEmailTemplate,
  getAdminNotificationTemplate,
  type PriceAlertData,
  type WelcomeEmailData,
  type AdminNotificationData
} from './templates'

export interface UserEmailPreferences {
  price_alerts_enabled: boolean
  admin_notifications_enabled: boolean
  marketing_emails_enabled: boolean
  email_frequency: 'immediate' | 'daily' | 'weekly' | 'never'
  unsubscribe_token: string
}

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

class EmailNotificationService {
  /**
   * Send price drop alert
   */
  async sendPriceDropAlert(
    userId: string,
    userEmail: string,
    productData: {
      productId: string
      productName: string
      productBrand?: string
      productImage?: string
      oldPrice: number
      newPrice: number
      supermarketName: string
      targetPrice?: number
    }
  ): Promise<boolean> {
    try {
      // Check user email preferences
      const preferences = await this.getUserEmailPreferences(userId)
      if (!preferences?.price_alerts_enabled || preferences.email_frequency === 'never') {
        console.log(`Price alerts disabled for user ${userId}`)
        return false
      }

      // Get user name
      const supabase = createAdminClient()
      const { data: userData } = await supabase
        .from('users')
        .select('username, full_name')
        .eq('id', userId)
        .single()

      const userName = userData?.full_name || userData?.username || 'Потребител'
      
      // Calculate price difference and percentage
      const priceDifference = productData.oldPrice - productData.newPrice
      const percentageChange = (priceDifference / productData.oldPrice) * 100

      // Prepare template data
      const templateData: PriceAlertData = {
        userName,
        productName: productData.productName,
        productBrand: productData.productBrand,
        productImage: productData.productImage,
        oldPrice: productData.oldPrice,
        newPrice: productData.newPrice,
        priceDifference,
        percentageChange,
        supermarketName: productData.supermarketName,
        targetPrice: productData.targetPrice,
        productUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/bg/products/${productData.productId}`,
        unsubscribeUrl: this.getUnsubscribeUrl(preferences.unsubscribe_token)
      }

      // Generate email content
      const { html, text } = getPriceDropTemplate(templateData)
      const subject = `🎉 Цената на ${productData.productName} падна с ${percentageChange.toFixed(1)}%!`

      // Queue email
      return await emailQueue.queuePriceAlert(userEmail, subject, html, text, 'high')
    } catch (error) {
      console.error('Error sending price drop alert:', error)
      return false
    }
  }

  /**
   * Send price increase alert
   */
  async sendPriceIncreaseAlert(
    userId: string,
    userEmail: string,
    productData: {
      productId: string
      productName: string
      productBrand?: string
      productImage?: string
      oldPrice: number
      newPrice: number
      supermarketName: string
    }
  ): Promise<boolean> {
    try {
      // Check user email preferences
      const preferences = await this.getUserEmailPreferences(userId)
      if (!preferences?.price_alerts_enabled || preferences.email_frequency === 'never') {
        return false
      }

      // Get user name
      const supabase = createAdminClient()
      const { data: userData } = await supabase
        .from('users')
        .select('username, full_name')
        .eq('id', userId)
        .single()

      const userName = userData?.full_name || userData?.username || 'Потребител'
      
      // Calculate price difference and percentage
      const priceDifference = productData.newPrice - productData.oldPrice
      const percentageChange = (priceDifference / productData.oldPrice) * 100

      // Prepare template data
      const templateData: PriceAlertData = {
        userName,
        productName: productData.productName,
        productBrand: productData.productBrand,
        productImage: productData.productImage,
        oldPrice: productData.oldPrice,
        newPrice: productData.newPrice,
        priceDifference,
        percentageChange,
        supermarketName: productData.supermarketName,
        productUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/bg/products/${productData.productId}`,
        unsubscribeUrl: this.getUnsubscribeUrl(preferences.unsubscribe_token)
      }

      // Generate email content
      const { html, text } = getPriceIncreaseTemplate(templateData)
      const subject = `📈 Цената на ${productData.productName} се повиши с ${percentageChange.toFixed(1)}%`

      // Queue email
      return await emailQueue.queuePriceAlert(userEmail, subject, html, text, 'normal')
    } catch (error) {
      console.error('Error sending price increase alert:', error)
      return false
    }
  }

  /**
   * Send target price reached alert
   */
  async sendTargetPriceReachedAlert(
    userId: string,
    userEmail: string,
    productData: {
      productId: string
      productName: string
      productBrand?: string
      productImage?: string
      currentPrice: number
      targetPrice: number
      supermarketName: string
    }
  ): Promise<boolean> {
    try {
      // Check user email preferences
      const preferences = await this.getUserEmailPreferences(userId)
      if (!preferences?.price_alerts_enabled || preferences.email_frequency === 'never') {
        return false
      }

      // Get user name
      const supabase = createAdminClient()
      const { data: userData } = await supabase
        .from('users')
        .select('username, full_name')
        .eq('id', userId)
        .single()

      const userName = userData?.full_name || userData?.username || 'Потребител'

      // Prepare template data
      const templateData: PriceAlertData = {
        userName,
        productName: productData.productName,
        productBrand: productData.productBrand,
        productImage: productData.productImage,
        oldPrice: productData.targetPrice, // For display purposes
        newPrice: productData.currentPrice,
        priceDifference: productData.targetPrice - productData.currentPrice,
        percentageChange: 0, // Not relevant for target price alerts
        supermarketName: productData.supermarketName,
        targetPrice: productData.targetPrice,
        productUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/bg/products/${productData.productId}`,
        unsubscribeUrl: this.getUnsubscribeUrl(preferences.unsubscribe_token)
      }

      // Generate email content
      const { html, text } = getTargetPriceReachedTemplate(templateData)
      const subject = `🎯 Целевата цена за ${productData.productName} е достигната!`

      // Queue email with high priority
      return await emailQueue.queuePriceAlert(userEmail, subject, html, text, 'high')
    } catch (error) {
      console.error('Error sending target price reached alert:', error)
      return false
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(userId: string, userEmail: string): Promise<boolean> {
    try {
      // Get user name
      const supabase = createAdminClient()
      const { data: userData } = await supabase
        .from('users')
        .select('username, full_name')
        .eq('id', userId)
        .single()

      const userName = userData?.full_name || userData?.username || 'Потребител'

      // Prepare template data
      const templateData: WelcomeEmailData = {
        userName,
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/bg/dashboard`,
        supportEmail: process.env.SENDGRID_ADMIN_EMAIL || 'support@pricetrack.bg'
      }

      // Generate email content
      const { html, text } = getWelcomeEmailTemplate(templateData)

      // Queue welcome email
      return await emailQueue.queueWelcomeEmail(userEmail, html, text)
    } catch (error) {
      console.error('Error sending welcome email:', error)
      return false
    }
  }

  /**
   * Send admin notification
   */
  async sendAdminNotification(
    type: string,
    details: string,
    actionUrl?: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      // Prepare template data
      const templateData: AdminNotificationData = {
        adminName: 'Администратор',
        notificationType: type,
        details,
        actionUrl,
        timestamp: new Date().toLocaleString('bg-BG')
      }

      // Generate email content
      const { html, text } = getAdminNotificationTemplate(templateData)

      // Queue admin notification
      return await emailQueue.queueAdminNotification(type, html, text, metadata)
    } catch (error) {
      console.error('Error sending admin notification:', error)
      return false
    }
  }

  /**
   * Get user email preferences
   */
  private async getUserEmailPreferences(userId: string): Promise<UserEmailPreferences | null> {
    try {
      const supabase = createAdminClient()
      const { data, error } = await supabase
        .rpc('get_user_email_preferences', { user_uuid: userId })
        .single()

      if (error) {
        console.error('Error fetching user email preferences:', error)
        return null
      }

      return data as UserEmailPreferences
    } catch (error) {
      console.error('Error fetching user email preferences:', error)
      return null
    }
  }

  /**
   * Update user email preferences
   */
  async updateUserEmailPreferences(
    userId: string,
    preferences: Partial<Omit<UserEmailPreferences, 'unsubscribe_token'>>
  ): Promise<boolean> {
    try {
      const supabase = createAdminClient()
      const { error } = await supabase
        .from('user_email_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error updating user email preferences:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error updating user email preferences:', error)
      return false
    }
  }

  /**
   * Unsubscribe user from emails
   */
  async unsubscribeUser(token: string): Promise<boolean> {
    try {
      const supabase = createAdminClient()
      const { error } = await supabase
        .from('user_email_preferences')
        .update({
          price_alerts_enabled: false,
          marketing_emails_enabled: false,
          email_frequency: 'never',
          updated_at: new Date().toISOString()
        })
        .eq('unsubscribe_token', token)

      if (error) {
        console.error('Error unsubscribing user:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error unsubscribing user:', error)
      return false
    }
  }

  /**
   * Generate unsubscribe URL
   */
  private getUnsubscribeUrl(token: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return `${baseUrl}/bg/unsubscribe?token=${token}`
  }

  /**
   * Send bulk price alerts for multiple users
   */
  async sendBulkPriceAlerts(
    alerts: Array<{
      userId: string
      userEmail: string
      alertType: 'price_drop' | 'price_increase' | 'target_reached'
      productData: any
    }>
  ): Promise<{ success: number; failed: number }> {
    let success = 0
    let failed = 0

    for (const alert of alerts) {
      let result = false

      switch (alert.alertType) {
        case 'price_drop':
          result = await this.sendPriceDropAlert(alert.userId, alert.userEmail, alert.productData)
          break
        case 'price_increase':
          result = await this.sendPriceIncreaseAlert(alert.userId, alert.userEmail, alert.productData)
          break
        case 'target_reached':
          result = await this.sendTargetPriceReachedAlert(alert.userId, alert.userEmail, alert.productData)
          break
      }

      if (result) {
        success++
      } else {
        failed++
      }

      // Small delay between emails
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return { success, failed }
  }
}

// Export singleton instance
export const emailNotificationService = new EmailNotificationService()
export default emailNotificationService
