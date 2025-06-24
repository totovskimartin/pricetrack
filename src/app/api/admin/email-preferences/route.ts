import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin and get current preferences
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, notification_preferences')
      .eq('id', user.id)
      .single()

    if (userError || !userData || !['admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { email_notifications_enabled } = body

    if (typeof email_notifications_enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid email_notifications_enabled value' }, { status: 400 })
    }

    // Update user notification preferences
    const currentPrefs = userData.notification_preferences || {}
    const updatedPrefs = {
      ...currentPrefs,
      email_admin_notifications: email_notifications_enabled
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({
        notification_preferences: updatedPrefs,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating admin email preferences:', updateError)
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Admin email preferences updated successfully',
      email_notifications_enabled
    })

  } catch (error) {
    console.error('Error in admin email preferences PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
