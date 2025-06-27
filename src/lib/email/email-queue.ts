import { createClient } from '@supabase/supabase-js'
import { emailService } from './sendgrid-client'
import { emailAnalyticsService } from './email-analytics'
import type { EmailOptions } from './sendgrid-client'

export interface QueuedEmail {
  id?: string
  to_email: string
  subject: string
  html_content: string
  text_content?: string
  email_type: 'price_alert' | 'admin_notification' | 'welcome' | 'system' | 'contact'
  priority: 'high' | 'normal' | 'low'
  scheduled_for?: string
  attempts: number
  max_attempts: number
  status: 'pending' | 'sent' | 'failed' | 'cancelled'
  error_message?: string
  created_at?: string
  sent_at?: string
  metadata?: Record<string, any>
}

class EmailQueue {
  private isProcessing = false
  private processingInterval: NodeJS.Timeout | null = null

  constructor() {
    // Start processing queue if enabled
    if (process.env.EMAIL_QUEUE_ENABLED !== 'false') {
      this.startProcessing()
    }
  }

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
   * Add email to queue
   */
  async queueEmail(email: Omit<QueuedEmail, 'id' | 'attempts' | 'status' | 'created_at'>): Promise<boolean> {
    try {
      const supabase = this.createAdminClient()
      const { error } = await supabase
        .from('email_queue')
        .insert({
          ...email,
          attempts: 0,
          status: 'pending',
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error queueing email:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error queueing email:', error)
      return false
    }
  }

  /**
   * Queue price alert email
   */
  async queuePriceAlert(
    userEmail: string,
    subject: string,
    htmlContent: string,
    textContent?: string,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<boolean> {
    return this.queueEmail({
      to_email: userEmail,
      subject,
      html_content: htmlContent,
      text_content: textContent,
      email_type: 'price_alert',
      priority,
      max_attempts: 3
    })
  }

  /**
   * Queue admin notification email
   */
  async queueAdminNotification(
    subject: string,
    htmlContent: string,
    textContent?: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    const adminEmail = process.env.SENDGRID_ADMIN_EMAIL || 'admin@pricetrack.bg'
    
    return this.queueEmail({
      to_email: adminEmail,
      subject,
      html_content: htmlContent,
      text_content: textContent,
      email_type: 'admin_notification',
      priority: 'high',
      max_attempts: 5,
      metadata
    })
  }

  /**
   * Queue welcome email
   */
  async queueWelcomeEmail(
    userEmail: string,
    htmlContent: string,
    textContent?: string
  ): Promise<boolean> {
    return this.queueEmail({
      to_email: userEmail,
      subject: 'Добре дошли в PriceTrack България!',
      html_content: htmlContent,
      text_content: textContent,
      email_type: 'welcome',
      priority: 'normal',
      max_attempts: 3
    })
  }

  /**
   * Queue contact message email
   */
  async queueContactMessage(
    adminEmail: string,
    replyToEmail: string,
    subject: string,
    htmlContent: string,
    textContent?: string
  ): Promise<boolean> {
    return this.queueEmail({
      to_email: adminEmail,
      subject: `Контактна форма: ${subject}`,
      html_content: htmlContent,
      text_content: textContent,
      email_type: 'contact',
      priority: 'high', // Contact messages should be high priority
      max_attempts: 3,
      metadata: {
        reply_to: replyToEmail,
        original_subject: subject
      }
    })
  }

  /**
   * Process pending emails
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return
    }

    this.isProcessing = true

    try {
      // Get pending emails ordered by priority and creation time
      // Note: We'll filter by attempts vs max_attempts in JavaScript since Supabase doesn't support column comparisons easily
      const supabase = this.createAdminClient()
      const { data: allPendingEmails, error } = await supabase
        .from('email_queue')
        .select('*')
        .eq('status', 'pending')
        .or('scheduled_for.is.null,scheduled_for.lte.' + new Date().toISOString())
        .order('priority', { ascending: false }) // high priority first
        .order('created_at', { ascending: true })
        .limit(100) // Get more to filter in JS

      // Filter emails where attempts < max_attempts
      const pendingEmails = allPendingEmails?.filter(email => email.attempts < email.max_attempts).slice(0, 50) || []

      if (error) {
        console.error('Error fetching pending emails:', error)
        return
      }

      if (pendingEmails.length === 0) {
        return
      }

      console.log(`Processing ${pendingEmails.length} pending emails`)

      // Process each email
      for (const queuedEmail of pendingEmails) {
        await this.processEmail(queuedEmail)
        
        // Small delay between emails to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100))
      }

    } catch (error) {
      console.error('Error processing email queue:', error)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Process a single email
   */
  private async processEmail(queuedEmail: QueuedEmail): Promise<void> {
    try {
      const supabase = this.createAdminClient()
      // Increment attempt count
      await supabase
        .from('email_queue')
        .update({ attempts: queuedEmail.attempts + 1 })
        .eq('id', queuedEmail.id)

      // Send email
      const emailOptions: EmailOptions = {
        to: queuedEmail.to_email,
        subject: queuedEmail.subject,
        html: queuedEmail.html_content,
        text: queuedEmail.text_content
      }

      // Add reply-to for contact messages
      if (queuedEmail.email_type === 'contact' && queuedEmail.metadata?.reply_to) {
        emailOptions.replyTo = queuedEmail.metadata.reply_to
      }

      const result = await emailService.sendEmail(emailOptions)

      if (result.success) {
        // Mark as sent
        await supabase
          .from('email_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            error_message: null
          })
          .eq('id', queuedEmail.id)

        // Record analytics
        try {
          await emailAnalyticsService.recordEmailStats(queuedEmail.email_type, 1, 0, 0, 0, 0)
        } catch (analyticsError) {
          console.error('Error recording email analytics:', analyticsError)
        }

        console.log(`Email sent successfully: ${queuedEmail.subject} to ${queuedEmail.to_email}`)
      } else {
        // Handle failure
        const newAttempts = queuedEmail.attempts + 1
        const shouldRetry = newAttempts < queuedEmail.max_attempts

        await supabase
          .from('email_queue')
          .update({
            status: shouldRetry ? 'pending' : 'failed',
            error_message: result.error,
            // Schedule retry with exponential backoff
            ...(shouldRetry && {
              scheduled_for: new Date(Date.now() + Math.pow(2, newAttempts) * 60000).toISOString()
            })
          })
          .eq('id', queuedEmail.id)

        // Record failed email analytics (only if not retrying)
        if (!shouldRetry) {
          try {
            await emailAnalyticsService.recordEmailStats(queuedEmail.email_type, 0, 1, 0, 0, 0)
          } catch (analyticsError) {
            console.error('Error recording failed email analytics:', analyticsError)
          }
        }

        console.error(`Email failed: ${queuedEmail.subject} to ${queuedEmail.to_email}. Error: ${result.error}`)
      }

    } catch (error) {
      console.error('Error processing email:', error)

      // Mark as failed
      try {
        const supabase = this.createAdminClient()
        await supabase
          .from('email_queue')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', queuedEmail.id)
      } catch (updateError) {
        console.error('Error updating failed email status:', updateError)
      }
    }
  }

  /**
   * Start automatic queue processing
   */
  startProcessing(): void {
    if (this.processingInterval) {
      return
    }

    // Process queue every 30 seconds
    this.processingInterval = setInterval(() => {
      this.processQueue()
    }, 30000)

    console.log('Email queue processing started')
  }

  /**
   * Stop automatic queue processing
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
      console.log('Email queue processing stopped')
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    pending: number
    sent: number
    failed: number
    total: number
  } | null> {
    try {
      const supabase = this.createAdminClient()
      const { data, error } = await supabase
        .from('email_queue')
        .select('status')

      if (error) {
        console.error('Error fetching queue stats:', error)
        return null
      }

      const stats = {
        pending: 0,
        sent: 0,
        failed: 0,
        total: data?.length || 0
      }

      data?.forEach(email => {
        stats[email.status as keyof typeof stats]++
      })

      return stats
    } catch (error) {
      console.error('Error fetching queue stats:', error)
      return null
    }
  }

  /**
   * Clear old emails from queue
   */
  async cleanupOldEmails(daysOld: number = 30): Promise<number> {
    try {
      const supabase = this.createAdminClient()
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from('email_queue')
        .delete()
        .lt('created_at', cutoffDate)
        .in('status', ['sent', 'failed'])
        .select('id')

      if (error) {
        console.error('Error cleaning up old emails:', error)
        return 0
      }

      const deletedCount = data?.length || 0
      console.log(`Cleaned up ${deletedCount} old emails`)
      return deletedCount
    } catch (error) {
      console.error('Error cleaning up old emails:', error)
      return 0
    }
  }
}

// Export singleton instance
export const emailQueue = new EmailQueue()
export default emailQueue
