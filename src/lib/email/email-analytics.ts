import { createClient } from '@supabase/supabase-js'
import { emailService } from './sendgrid-client'

export interface EmailAnalytics {
  date: string
  email_type: string
  total_sent: number
  total_failed: number
  total_bounced: number
  total_opened: number
  total_clicked: number
}

export interface EmailMetrics {
  total_emails: number
  delivery_rate: number
  open_rate: number
  click_rate: number
  bounce_rate: number
  recent_activity: EmailAnalytics[]
}

class EmailAnalyticsService {
  // Helper function to create admin Supabase client
  private createAdminClient() {
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

  /**
   * Record email statistics
   */
  async recordEmailStats(
    emailType: string,
    sent: number = 0,
    failed: number = 0,
    bounced: number = 0,
    opened: number = 0,
    clicked: number = 0
  ): Promise<boolean> {
    try {
      const supabase = this.createAdminClient()
      const today = new Date().toISOString().split('T')[0]

      const { error } = await supabase
        .from('email_stats')
        .upsert({
          date: today,
          email_type: emailType,
          total_sent: sent,
          total_failed: failed,
          total_bounced: bounced,
          total_opened: opened,
          total_clicked: clicked,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'date,email_type'
        })

      if (error) {
        console.error('Error recording email stats:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error recording email stats:', error)
      return false
    }
  }

  /**
   * Get email analytics for a date range
   */
  async getEmailAnalytics(
    startDate?: string,
    endDate?: string,
    emailType?: string
  ): Promise<EmailAnalytics[]> {
    try {
      const supabase = this.createAdminClient()
      let query = supabase
        .from('email_stats')
        .select('*')
        .order('date', { ascending: false })

      if (startDate) {
        query = query.gte('date', startDate)
      }

      if (endDate) {
        query = query.lte('date', endDate)
      }

      if (emailType) {
        query = query.eq('email_type', emailType)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching email analytics:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching email analytics:', error)
      return []
    }
  }

  /**
   * Get overall email metrics
   */
  async getEmailMetrics(days: number = 30): Promise<EmailMetrics | null> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      const startDateStr = startDate.toISOString().split('T')[0]

      const analytics = await this.getEmailAnalytics(startDateStr)

      if (analytics.length === 0) {
        return {
          total_emails: 0,
          delivery_rate: 0,
          open_rate: 0,
          click_rate: 0,
          bounce_rate: 0,
          recent_activity: []
        }
      }

      // Calculate totals
      const totals = analytics.reduce((acc, stat) => ({
        sent: acc.sent + stat.total_sent,
        failed: acc.failed + stat.total_failed,
        bounced: acc.bounced + stat.total_bounced,
        opened: acc.opened + stat.total_opened,
        clicked: acc.clicked + stat.total_clicked
      }), { sent: 0, failed: 0, bounced: 0, opened: 0, clicked: 0 })

      const totalEmails = totals.sent + totals.failed
      const deliveryRate = totalEmails > 0 ? (totals.sent / totalEmails) * 100 : 0
      const openRate = totals.sent > 0 ? (totals.opened / totals.sent) * 100 : 0
      const clickRate = totals.opened > 0 ? (totals.clicked / totals.opened) * 100 : 0
      const bounceRate = totals.sent > 0 ? (totals.bounced / totals.sent) * 100 : 0

      return {
        total_emails: totalEmails,
        delivery_rate: Math.round(deliveryRate * 100) / 100,
        open_rate: Math.round(openRate * 100) / 100,
        click_rate: Math.round(clickRate * 100) / 100,
        bounce_rate: Math.round(bounceRate * 100) / 100,
        recent_activity: analytics.slice(0, 10) // Last 10 days
      }
    } catch (error) {
      console.error('Error calculating email metrics:', error)
      return null
    }
  }

  /**
   * Get SendGrid statistics
   */
  async getSendGridStats(days: number = 7): Promise<any> {
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const stats = await emailService.getEmailStats(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      )

      return stats
    } catch (error) {
      console.error('Error fetching SendGrid stats:', error)
      return null
    }
  }

  /**
   * Sync SendGrid stats to local database
   */
  async syncSendGridStats(): Promise<boolean> {
    try {
      const stats = await this.getSendGridStats(7)
      
      if (!stats || !Array.isArray(stats)) {
        return false
      }

      // Process SendGrid stats and update local database
      for (const dayStat of stats) {
        if (dayStat.stats && Array.isArray(dayStat.stats)) {
          for (const stat of dayStat.stats) {
            await this.recordEmailStats(
              'sendgrid_sync',
              stat.metrics?.delivered || 0,
              stat.metrics?.bounces || 0,
              stat.metrics?.bounces || 0,
              stat.metrics?.opens || 0,
              stat.metrics?.clicks || 0
            )
          }
        }
      }

      return true
    } catch (error) {
      console.error('Error syncing SendGrid stats:', error)
      return false
    }
  }

  /**
   * Get email performance by type
   */
  async getEmailPerformanceByType(days: number = 30): Promise<Record<string, any>> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      const startDateStr = startDate.toISOString().split('T')[0]

      const analytics = await this.getEmailAnalytics(startDateStr)

      const performance: Record<string, any> = {}

      analytics.forEach(stat => {
        if (!performance[stat.email_type]) {
          performance[stat.email_type] = {
            total_sent: 0,
            total_failed: 0,
            total_bounced: 0,
            total_opened: 0,
            total_clicked: 0
          }
        }

        performance[stat.email_type].total_sent += stat.total_sent
        performance[stat.email_type].total_failed += stat.total_failed
        performance[stat.email_type].total_bounced += stat.total_bounced
        performance[stat.email_type].total_opened += stat.total_opened
        performance[stat.email_type].total_clicked += stat.total_clicked
      })

      // Calculate rates for each type
      Object.keys(performance).forEach(type => {
        const data = performance[type]
        const totalEmails = data.total_sent + data.total_failed
        
        data.delivery_rate = totalEmails > 0 ? (data.total_sent / totalEmails) * 100 : 0
        data.open_rate = data.total_sent > 0 ? (data.total_opened / data.total_sent) * 100 : 0
        data.click_rate = data.total_opened > 0 ? (data.total_clicked / data.total_opened) * 100 : 0
        data.bounce_rate = data.total_sent > 0 ? (data.total_bounced / data.total_sent) * 100 : 0
      })

      return performance
    } catch (error) {
      console.error('Error getting email performance by type:', error)
      return {}
    }
  }

  /**
   * Clean up old analytics data
   */
  async cleanupOldAnalytics(daysToKeep: number = 90): Promise<number> {
    try {
      const supabase = this.createAdminClient()
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('email_stats')
        .delete()
        .lt('date', cutoffDateStr)
        .select('id')

      if (error) {
        console.error('Error cleaning up old analytics:', error)
        return 0
      }

      const deletedCount = data?.length || 0
      console.log(`Cleaned up ${deletedCount} old email analytics records`)
      return deletedCount
    } catch (error) {
      console.error('Error cleaning up old analytics:', error)
      return 0
    }
  }
}

// Export singleton instance
export const emailAnalyticsService = new EmailAnalyticsService()
export default emailAnalyticsService
