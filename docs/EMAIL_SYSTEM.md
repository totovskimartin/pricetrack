# Email Notification System

This document describes the comprehensive email notification system implemented for PriceTrack using SendGrid.

## Overview

The email system provides:
- **Price alerts** when products reach target prices or drop significantly
- **Admin notifications** for price suggestions and system events
- **Welcome emails** for new user registrations
- **User preference management** for controlling email frequency and types
- **Email queue system** for reliable delivery with retry logic
- **Unsubscribe functionality** with granular controls

## Setup Instructions

### 1. Install Dependencies

The required dependencies are already installed:
```bash
npm install @sendgrid/mail @sendgrid/client
```

### 2. Environment Configuration

Add the following to your `.env.local` file:

```env
# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@pricetrack.bg
SENDGRID_FROM_NAME=PriceTrack България
SENDGRID_ADMIN_EMAIL=admin@pricetrack.bg

# Email Configuration
EMAIL_ENABLED=true
EMAIL_QUEUE_ENABLED=true
EMAIL_BATCH_SIZE=50
EMAIL_RATE_LIMIT_PER_MINUTE=100
```

### 3. Database Migration

Run the email system migration:

```bash
npm run migrate:email
```

This creates the following tables:
- `email_queue` - Queue for outgoing emails with retry logic
- `email_stats` - Email delivery and engagement statistics
- `user_email_preferences` - User preferences for email notifications

### 4. SendGrid Setup

1. Create a SendGrid account at https://sendgrid.com
2. Generate an API key with full access
3. Verify your sender domain/email
4. Add your API key to `.env.local`

## Features

### Email Types

1. **Price Drop Alerts**
   - Sent when tracked product prices drop significantly (>10%)
   - Includes old price, new price, savings amount, and percentage

2. **Target Price Reached**
   - Sent when a product reaches the user's target price
   - High priority delivery

3. **Price Increase Alerts**
   - Sent when tracked product prices increase significantly
   - Helps users make informed purchasing decisions

4. **Welcome Emails**
   - Sent to new users after registration
   - Includes getting started information and dashboard link

5. **Admin Notifications**
   - Price suggestion notifications
   - System alerts and important updates

### User Preferences

Users can control their email experience through `/bg/profile/email-preferences`:

- **Email Frequency**: Immediate, Daily, Weekly, or Never
- **Price Alerts**: Enable/disable price change notifications
- **Admin Notifications**: Enable/disable system messages
- **Marketing Emails**: Enable/disable promotional content

### Email Queue System

The system uses a robust queue with:
- **Automatic retry** with exponential backoff
- **Batch processing** to respect rate limits
- **Priority handling** (high, normal, low)
- **Error tracking** and logging
- **Background processing** every 30 seconds

### Unsubscribe System

- **Granular unsubscribe** options (price alerts only, marketing only, or all)
- **One-click unsubscribe** links in all emails
- **Token-based** secure unsubscribe process

## API Endpoints

### User Email Preferences
- `GET /api/email-preferences` - Get user preferences
- `PUT /api/email-preferences` - Update user preferences

### Unsubscribe
- `GET /api/unsubscribe?token=xxx` - Get unsubscribe page data
- `POST /api/unsubscribe` - Process unsubscribe request

### Admin Management
- `GET /api/admin/process-email-queue` - Get queue statistics
- `POST /api/admin/process-email-queue` - Manually process queue

### Testing
- `GET /api/test-email` - Get available test types
- `POST /api/test-email` - Send test emails

## Usage Examples

### Send Price Drop Alert

```typescript
import { emailNotificationService } from '@/lib/email/email-service'

await emailNotificationService.sendPriceDropAlert(
  userId,
  userEmail,
  {
    productId: 'product-123',
    productName: 'Мляко Боровец 1л',
    productBrand: 'Боровец',
    oldPrice: 2.50,
    newPrice: 1.99,
    supermarketName: 'Lidl',
    targetPrice: 2.00
  }
)
```

### Send Welcome Email

```typescript
await emailNotificationService.sendWelcomeEmail(userId, userEmail)
```

### Send Admin Notification

```typescript
await emailNotificationService.sendAdminNotification(
  'Ново предложение за цена',
  'Потребител предложи нова цена за продукт.',
  'https://pricetrack.bg/admin/price-suggestions'
)
```

## Monitoring and Analytics

### Admin Dashboard

Visit `/bg/admin/email-system` to:
- View email queue statistics
- Monitor recent email deliveries
- Manually process the email queue
- Check for failed emails and errors

### Email Statistics

The system tracks:
- Total emails sent/failed/pending
- Delivery rates by email type
- Error messages and retry attempts
- Processing times and queue health

## Testing

### Test Email Types

Use the test endpoint to verify email functionality:

```bash
# Test welcome email
curl -X POST /api/test-email \
  -H "Content-Type: application/json" \
  -d '{"test_type": "welcome"}'

# Test price alert
curl -X POST /api/test-email \
  -H "Content-Type: application/json" \
  -d '{"test_type": "price_alert"}'
```

### Manual Queue Processing

Process the email queue manually:

```bash
curl -X POST /api/admin/process-email-queue
```

## Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check SendGrid API key is valid
   - Verify sender email is verified in SendGrid
   - Check email queue for error messages

2. **High bounce rates**
   - Verify email addresses are valid
   - Check sender reputation in SendGrid
   - Review email content for spam triggers

3. **Queue backing up**
   - Check SendGrid rate limits
   - Verify background processing is running
   - Monitor error rates in admin dashboard

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

### Rate Limiting

SendGrid free tier limits:
- 100 emails/day
- Upgrade for higher limits

Adjust batch size and rate limits in environment variables.

## Security Considerations

- **API Keys**: Never expose SendGrid API key in client-side code
- **Unsubscribe Tokens**: Use cryptographically secure tokens
- **Email Validation**: Validate all email addresses before sending
- **Rate Limiting**: Respect SendGrid rate limits to avoid suspension
- **Content Security**: Sanitize all user-generated content in emails

## Future Enhancements

- Email open/click tracking
- A/B testing for email templates
- Advanced segmentation
- Scheduled email campaigns
- Email template editor
- Bounce and complaint handling
- Integration with other email providers
