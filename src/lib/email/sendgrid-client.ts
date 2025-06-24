import sgMail from '@sendgrid/mail'
import sgClient from '@sendgrid/client'

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@pricetrack.bg'
const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'PriceTrack България'
const ADMIN_EMAIL = process.env.SENDGRID_ADMIN_EMAIL || 'admin@pricetrack.bg'

if (!SENDGRID_API_KEY) {
  // Only warn in development - in production this should be properly configured
  if (process.env.NODE_ENV === 'development') {
    console.warn('SENDGRID_API_KEY is not set. Email functionality will be disabled.')
  }
} else {
  sgMail.setApiKey(SENDGRID_API_KEY)
  sgClient.setApiKey(SENDGRID_API_KEY)
}

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  templateId?: string
  templateData?: Record<string, any>
  from?: {
    email: string
    name: string
  }
  replyTo?: string
  attachments?: Array<{
    content: string
    filename: string
    type: string
    disposition: string
  }>
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

class SendGridEmailService {
  private isEnabled: boolean

  constructor() {
    this.isEnabled = Boolean(SENDGRID_API_KEY) && process.env.EMAIL_ENABLED !== 'false'
  }

  /**
   * Send a single email
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    if (!this.isEnabled) {
      console.log('Email service disabled, skipping email:', options.subject)
      return { success: false, error: 'Email service disabled' }
    }

    try {
      const msg = {
        to: options.to,
        from: options.from || {
          email: FROM_EMAIL,
          name: FROM_NAME
        },
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        attachments: options.attachments,
        // Template support
        ...(options.templateId && {
          templateId: options.templateId,
          dynamicTemplateData: options.templateData
        })
      }

      const [response] = await sgMail.send(msg)
      
      return {
        success: true,
        messageId: response.headers['x-message-id']
      }
    } catch (error: any) {
      console.error('SendGrid email error:', error)
      
      let errorMessage = 'Unknown email error'
      if (error.response?.body?.errors) {
        errorMessage = error.response.body.errors.map((e: any) => e.message).join(', ')
      } else if (error.message) {
        errorMessage = error.message
      }

      return {
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * Send multiple emails (batch)
   */
  async sendBatchEmails(emails: EmailOptions[]): Promise<EmailResult[]> {
    if (!this.isEnabled) {
      console.log('Email service disabled, skipping batch emails')
      return emails.map(() => ({ success: false, error: 'Email service disabled' }))
    }

    const results: EmailResult[] = []
    const batchSize = parseInt(process.env.EMAIL_BATCH_SIZE || '50')

    // Process in batches to avoid rate limits
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize)
      const batchPromises = batch.map(email => this.sendEmail(email))
      const batchResults = await Promise.allSettled(batchPromises)
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          results.push({
            success: false,
            error: result.reason?.message || 'Batch email failed'
          })
        }
      })

      // Rate limiting delay between batches
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return results
  }

  /**
   * Send email to admin(s)
   */
  async sendAdminEmail(subject: string, html: string, text?: string): Promise<EmailResult> {
    return this.sendEmail({
      to: ADMIN_EMAIL,
      subject: `[PriceTrack Admin] ${subject}`,
      html,
      text
    })
  }

  /**
   * Get email statistics
   */
  async getEmailStats(startDate?: string, endDate?: string) {
    if (!this.isEnabled) {
      return null
    }

    try {
      const queryParams: any = {}
      if (startDate) queryParams.start_date = startDate
      if (endDate) queryParams.end_date = endDate

      const request = {
        url: '/v3/stats',
        method: 'GET' as const,
        qs: queryParams
      }

      const [response] = await sgClient.request(request)
      return response.body
    } catch (error) {
      console.error('Error fetching email stats:', error)
      return null
    }
  }

  /**
   * Validate email address
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Check if service is enabled
   */
  isServiceEnabled(): boolean {
    return this.isEnabled
  }
}

// Export singleton instance
export const emailService = new SendGridEmailService()
export default emailService
