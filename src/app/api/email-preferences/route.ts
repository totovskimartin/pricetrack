import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { emailNotificationService } from '@/lib/email/server-only'

export async function GET(request: NextRequest) {
  try {
    // Try Authorization header first
    const authHeader = request.headers.get('authorization')
    let user = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const supabase = createRouteHandlerClient({ cookies })

      // Verify the token
      const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token)

      if (!tokenError && tokenUser) {
        user = tokenUser
      }
    }

    // Fallback to cookies if no valid token
    if (!user) {
      const supabase = createRouteHandlerClient({ cookies })
      const { data: { user: cookieUser }, error: authError } = await supabase.auth.getUser()

      if (authError || !cookieUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      user = cookieUser
    }

    // Create supabase client for database operations
    const supabase = createRouteHandlerClient({ cookies })

    // Check if user exists in public.users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, username, email')
      .eq('id', user.id)
      .single()

    if (userError) {
      console.error('User not found in database:', userError)
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 })
    }

    // Get user email preferences using the database function
    const { data, error } = await supabase
      .rpc('get_user_email_preferences', { user_uuid: user.id })
      .single()

    if (error) {
      console.error('Error fetching email preferences:', error)
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
    }

    return NextResponse.json({ preferences: data })
  } catch (error) {
    console.error('Error in email preferences GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Try Authorization header first
    const authHeader = request.headers.get('authorization')
    let user = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)

      const supabase = createRouteHandlerClient({ cookies })

      // Verify the token
      const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token)

      if (!tokenError && tokenUser) {
        user = tokenUser
      }
    }

    // Fallback to cookies if no valid token
    if (!user) {
      const supabase = createRouteHandlerClient({ cookies })
      const { data: { user: cookieUser }, error: authError } = await supabase.auth.getUser()

      if (authError || !cookieUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      user = cookieUser
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
    const supabase = createRouteHandlerClient({ cookies })
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
