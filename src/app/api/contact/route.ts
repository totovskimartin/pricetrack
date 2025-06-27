import { NextRequest, NextResponse } from 'next/server'
import { emailNotificationService } from '@/lib/email/server-only'

// Simple rate limiting for contact form
const recentSubmissions = new Map<string, number>()

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, subject, message } = body

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json({ 
        error: 'All fields are required' 
      }, { status: 400 })
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json({ 
        error: 'Please enter a valid email address' 
      }, { status: 400 })
    }

    // Validate field lengths
    if (name.length > 100) {
      return NextResponse.json({ 
        error: 'Name must be less than 100 characters' 
      }, { status: 400 })
    }

    if (subject.length > 200) {
      return NextResponse.json({ 
        error: 'Subject must be less than 200 characters' 
      }, { status: 400 })
    }

    if (message.length > 2000) {
      return NextResponse.json({ 
        error: 'Message must be less than 2000 characters' 
      }, { status: 400 })
    }

    // Simple rate limiting - max 3 submissions per email per hour
    const now = Date.now()
    const lastSubmission = recentSubmissions.get(email)
    const submissionCount = Array.from(recentSubmissions.entries())
      .filter(([submissionEmail, timestamp]) => 
        submissionEmail === email && now - timestamp < 3600000 // 1 hour
      ).length

    if (submissionCount >= 3) {
      return NextResponse.json({
        error: 'Too many submissions. Please wait before sending another message.'
      }, { status: 429 })
    }

    // Clean up old entries (keep only last 2 hours)
    for (const [submissionEmail, timestamp] of recentSubmissions.entries()) {
      if (now - timestamp > 7200000) { // 2 hours
        recentSubmissions.delete(submissionEmail)
      }
    }

    // Record this submission
    recentSubmissions.set(email, now)

    // Sanitize inputs
    const sanitizedData = {
      name: sanitizeInput(name),
      email: sanitizeInput(email),
      subject: sanitizeInput(subject),
      message: sanitizeInput(message)
    }

    console.log(`Processing contact form submission from: ${sanitizedData.email}`)

    // Send contact message email
    const result = await emailNotificationService.sendContactMessage(
      sanitizedData.name,
      sanitizedData.email,
      sanitizedData.subject,
      sanitizedData.message
    )

    if (result) {
      console.log(`Contact message sent successfully from: ${sanitizedData.email}`)
      return NextResponse.json({
        success: true,
        message: 'Your message has been sent successfully. We will get back to you soon!'
      })
    } else {
      console.error(`Failed to send contact message from: ${sanitizedData.email}`)
      return NextResponse.json({
        success: false,
        message: 'Failed to send message. Please try again later.'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error in contact form submission:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to process your message. Please try again later.'
    }, { status: 500 })
  }
}
