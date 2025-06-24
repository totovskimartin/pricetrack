import { NextRequest, NextResponse } from 'next/server'
import { emailNotificationService } from '@/lib/email/server-only'

// Simple rate limiting - in production, use Redis or a proper rate limiter
const recentRequests = new Map<string, number>()

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, userEmail } = body

    // Validate required fields
    if (!userId || !userEmail) {
      return NextResponse.json({ error: 'Missing userId or userEmail' }, { status: 400 })
    }

    // Validate email format
    if (!isValidEmail(userEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Validate UUID format
    if (!isValidUUID(userId)) {
      return NextResponse.json({ error: 'Invalid userId format' }, { status: 400 })
    }

    // Simple rate limiting - max 1 request per email per minute
    const now = Date.now()
    const lastRequest = recentRequests.get(userEmail)
    if (lastRequest && now - lastRequest < 60000) {
      return NextResponse.json({
        error: 'Rate limit exceeded. Please wait before requesting another welcome email.'
      }, { status: 429 })
    }
    recentRequests.set(userEmail, now)

    // Clean up old entries (keep only last 10 minutes)
    for (const [email, timestamp] of recentRequests.entries()) {
      if (now - timestamp > 600000) {
        recentRequests.delete(email)
      }
    }

    console.log(`Sending welcome email to new user: ${userEmail}`)

    // Send welcome email
    const result = await emailNotificationService.sendWelcomeEmail(userId, userEmail)

    if (result) {
      console.log(`Welcome email queued successfully for: ${userEmail}`)
      return NextResponse.json({
        success: true,
        message: 'Welcome email queued successfully'
      })
    } else {
      console.error(`Failed to queue welcome email for: ${userEmail}`)
      return NextResponse.json({
        success: false,
        message: 'Failed to queue welcome email'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error in send-welcome-email:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to send welcome email'
    }, { status: 500 })
  }
}
