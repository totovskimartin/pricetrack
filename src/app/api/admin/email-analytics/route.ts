import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { emailAnalyticsService } from '@/lib/email/server-only'

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

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const type = searchParams.get('type')

    // Get overall metrics
    const metrics = await emailAnalyticsService.getEmailMetrics(days)

    // Get performance by type
    const performanceByType = await emailAnalyticsService.getEmailPerformanceByType(days)

    // Get recent analytics
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const recentAnalytics = await emailAnalyticsService.getEmailAnalytics(
      startDate.toISOString().split('T')[0],
      undefined,
      type || undefined
    )

    return NextResponse.json({
      metrics,
      performance_by_type: performanceByType,
      recent_analytics: recentAnalytics,
      period_days: days
    })
  } catch (error) {
    console.error('Error fetching email analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'sync_sendgrid':
        const syncResult = await emailAnalyticsService.syncSendGridStats()
        return NextResponse.json({
          success: syncResult,
          message: syncResult ? 'SendGrid stats synced successfully' : 'Failed to sync SendGrid stats'
        })

      case 'cleanup_old':
        const daysToKeep = body.days_to_keep || 90
        const deletedCount = await emailAnalyticsService.cleanupOldAnalytics(daysToKeep)
        return NextResponse.json({
          success: true,
          message: `Cleaned up ${deletedCount} old analytics records`,
          deleted_count: deletedCount
        })

      case 'record_stats':
        const { email_type, sent, failed, bounced, opened, clicked } = body
        const recordResult = await emailAnalyticsService.recordEmailStats(
          email_type,
          sent || 0,
          failed || 0,
          bounced || 0,
          opened || 0,
          clicked || 0
        )
        return NextResponse.json({
          success: recordResult,
          message: recordResult ? 'Stats recorded successfully' : 'Failed to record stats'
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in email analytics POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
