# Email Notifications for Admin Price Suggestions

This document explains how to set up and configure email notifications for administrators when users submit price suggestions.

## Overview

When a user submits a price suggestion, the system will:

1. **Create an in-app notification** for admins (already implemented)
2. **Queue an email notification** in the database
3. **Process the email queue** periodically to send emails to admins
4. **Respect admin email preferences** (can be enabled/disabled per admin)

## Setup Instructions

### 1. Database Migration

Run the email notifications migration:

```bash
# Apply the migration
supabase db push

# Or if using manual migrations
psql -d your_database -f supabase/migrations/021_admin_email_notifications.sql
```

### 2. Environment Variables

Add these environment variables to your `.env.local`:

```bash
# Email service configuration (for production)
EMAIL_API_KEY=your_sendgrid_or_mailgun_api_key
FROM_EMAIL=noreply@pricetrack.bg

# Internal API token for cron job security
INTERNAL_API_TOKEN=your-secure-random-token

# Site URL for email links
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

### 3. Email Service Integration

The system currently simulates email sending. To integrate with a real email service:

1. **Update `src/lib/email-notifications.ts`**
2. **Replace the `simulateEmailSend` method** with actual email service calls
3. **Supported services**: SendGrid, Mailgun, Resend, AWS SES, etc.

Example for SendGrid:

```typescript
private async sendEmail(to: string, template: EmailTemplate): Promise<void> {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: this.fromEmail },
      subject: template.subject,
      content: [
        { type: 'text/plain', value: template.text },
        { type: 'text/html', value: template.html }
      ]
    })
  })

  if (!response.ok) {
    throw new Error(`Email sending failed: ${response.statusText}`)
  }
}
```

### 4. Cron Job Setup

Set up a cron job to process email notifications every minute:

```bash
# Edit crontab
crontab -e

# Add this line (adjust path to your project)
* * * * * /usr/bin/node /path/to/your/app/scripts/process-email-notifications.js >> /var/log/email-notifications.log 2>&1
```

Alternative: Use a process manager like PM2:

```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'email-processor',
    script: './scripts/process-email-notifications.js',
    cron_restart: '* * * * *', // Every minute
    autorestart: false,
    env: {
      NODE_ENV: 'production'
    }
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js
```

### 5. Admin Configuration

Admins can configure their email preferences:

1. **Go to Admin Panel** → **Settings**
2. **Find "Email notifications for administrators"** section
3. **Toggle "Price suggestion notifications"** on/off

## Testing

### 1. Test Email Queue

Submit a price suggestion and check the queue:

```sql
-- Check pending notifications
SELECT * FROM email_notification_queue WHERE status = 'pending';

-- Check notification payload
SELECT payload FROM email_notification_queue WHERE type = 'admin_price_suggestion';
```

### 2. Test Email Processing

Manually trigger email processing:

```bash
# Test the API endpoint
curl -X POST http://localhost:3000/api/admin/process-email-notifications \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json"

# Or run the script directly
node scripts/process-email-notifications.js
```

### 3. Test Email Preferences

1. **Disable email notifications** in admin settings
2. **Submit a price suggestion**
3. **Verify no email is sent** to that admin

## Monitoring

### Database Queries

```sql
-- Check email notification statistics
SELECT 
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM email_notification_queue 
GROUP BY status;

-- Check failed notifications
SELECT * FROM email_notification_queue 
WHERE status = 'failed' 
ORDER BY created_at DESC;

-- Clean up old notifications (older than 30 days)
SELECT cleanup_old_email_notifications(30);
```

### Logs

Monitor the cron job logs:

```bash
# View recent logs
tail -f /var/log/email-notifications.log

# Check for errors
grep ERROR /var/log/email-notifications.log
```

## Troubleshooting

### Common Issues

1. **Emails not being sent**
   - Check cron job is running
   - Verify API token is correct
   - Check email service configuration

2. **Database errors**
   - Ensure migration was applied
   - Check database permissions
   - Verify RLS policies

3. **Admin not receiving emails**
   - Check admin email preferences
   - Verify admin role and active status
   - Check email address is valid

### Debug Mode

Enable debug logging by setting:

```bash
DEBUG=email-notifications node scripts/process-email-notifications.js
```

## Security Considerations

1. **API Token**: Use a strong, random token for the internal API
2. **Email Service**: Store API keys securely (environment variables)
3. **Database**: Ensure proper RLS policies are in place
4. **Rate Limiting**: Consider rate limiting the email processing endpoint

## Future Enhancements

- **Email templates**: More sophisticated HTML templates
- **Batch processing**: Send digest emails instead of individual notifications
- **User preferences**: Allow users to set notification frequency
- **Analytics**: Track email open rates and engagement
- **Retry logic**: Exponential backoff for failed emails
