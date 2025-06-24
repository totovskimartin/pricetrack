// This file ensures email services are only used on the server side
import 'server-only'

// Re-export email services with server-only guarantee
export { emailNotificationService } from './email-service'
export { emailQueue } from './email-queue'
export { emailService } from './sendgrid-client'
export { emailAnalyticsService } from './email-analytics'

// Export types that are safe to use on client side
export type { EmailOptions, EmailResult } from './sendgrid-client'
export type { UserEmailPreferences } from './email-service'
