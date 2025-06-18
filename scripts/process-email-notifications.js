#!/usr/bin/env node

/**
 * Email Notification Processor
 * 
 * This script processes pending email notifications from the queue.
 * It should be run periodically (e.g., every minute) via cron job.
 * 
 * Usage:
 * node scripts/process-email-notifications.js
 * 
 * Cron job example (every minute):
 * * * * * * /usr/bin/node /path/to/your/app/scripts/process-email-notifications.js
 */

const https = require('https')
const http = require('http')

// Configuration
const config = {
  apiUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  apiToken: process.env.INTERNAL_API_TOKEN || 'your-secret-token',
  timeout: 30000 // 30 seconds
}

/**
 * Make HTTP request to the email processing endpoint
 */
function processEmailNotifications() {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/admin/process-email-notifications', config.apiUrl)
    const isHttps = url.protocol === 'https:'
    const client = isHttps ? https : http

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'EmailNotificationProcessor/1.0'
      },
      timeout: config.timeout
    }

    const req = client.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          const response = JSON.parse(data)
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response)
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${response.error || 'Unknown error'}`))
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`))
        }
      })
    })

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`))
    })

    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })

    req.end()
  })
}

/**
 * Log with timestamp
 */
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [${level}] ${message}`)
}

/**
 * Main execution
 */
async function main() {
  try {
    log('Starting email notification processing...')
    
    const result = await processEmailNotifications()
    
    log(`Email processing completed: ${result.processed}/${result.total} notifications sent successfully`)
    
    if (result.failed > 0) {
      log(`${result.failed} notifications failed to send`, 'WARN')
    }
    
    if (result.processed === 0 && result.total === 0) {
      log('No pending notifications to process')
    }
    
    process.exit(0)
    
  } catch (error) {
    log(`Email processing failed: ${error.message}`, 'ERROR')
    process.exit(1)
  }
}

// Handle process signals
process.on('SIGINT', () => {
  log('Received SIGINT, shutting down gracefully...', 'INFO')
  process.exit(0)
})

process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down gracefully...', 'INFO')
  process.exit(0)
})

// Run the script
if (require.main === module) {
  main()
}

module.exports = { processEmailNotifications, log }
