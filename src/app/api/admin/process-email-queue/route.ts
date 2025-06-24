import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { emailQueue } from '@/lib/email/server-only'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || !['admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Process the email queue
    console.log('Manually processing email queue...')
    await emailQueue.processQueue()

    // Get queue statistics
    const stats = await emailQueue.getQueueStats()

    return NextResponse.json({
      message: 'Email queue processed successfully',
      stats
    })
  } catch (error) {
    console.error('Error processing email queue:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || !['admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get queue statistics
    const stats = await emailQueue.getQueueStats()

    // Get recent emails from queue
    const { data: recentEmails, error: emailsError } = await supabase
      .from('email_queue')
      .select('id, to_email, subject, email_type, status, attempts, created_at, sent_at, error_message')
      .order('created_at', { ascending: false })
      .limit(50)

    if (emailsError) {
      console.error('Error fetching recent emails:', emailsError)
    }

    return NextResponse.json({
      stats,
      recent_emails: recentEmails || []
    })
  } catch (error) {
    console.error('Error getting email queue status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
