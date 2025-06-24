import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { emailNotificationService } from '@/lib/email/email-service'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user email preferences
    const { data: preferences, error } = await supabase
      .rpc('get_user_email_preferences', { user_uuid: user.id })
      .single()

    if (error) {
      console.error('Error fetching email preferences:', error)
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
    }

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('Error in email preferences GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      price_alerts_enabled, 
      admin_notifications_enabled, 
      marketing_emails_enabled, 
      email_frequency 
    } = body

    // Validate email frequency
    const validFrequencies = ['immediate', 'daily', 'weekly', 'never']
    if (email_frequency && !validFrequencies.includes(email_frequency)) {
      return NextResponse.json({ error: 'Invalid email frequency' }, { status: 400 })
    }

    // Update preferences using the email service
    const success = await emailNotificationService.updateUserEmailPreferences(user.id, {
      price_alerts_enabled,
      admin_notifications_enabled,
      marketing_emails_enabled,
      email_frequency
    })

    if (!success) {
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
    }

    // Get updated preferences
    const { data: updatedPreferences, error } = await supabase
      .rpc('get_user_email_preferences', { user_uuid: user.id })
      .single()

    if (error) {
      console.error('Error fetching updated preferences:', error)
      return NextResponse.json({ error: 'Failed to fetch updated preferences' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Preferences updated successfully',
      preferences: updatedPreferences 
    })
  } catch (error) {
    console.error('Error in email preferences PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
