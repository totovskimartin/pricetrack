import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { emailNotificationService } from '@/lib/email/email-service'

// Use service role client for unsubscribe (no auth required)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Missing unsubscribe token' }, { status: 400 })
    }

    // Verify token exists and get user info
    const { data: preferences, error } = await supabase
      .from('user_email_preferences')
      .select(`
        user_id,
        users!inner(email, username, full_name)
      `)
      .eq('unsubscribe_token', token)
      .single()

    if (error || !preferences) {
      return NextResponse.json({ error: 'Invalid unsubscribe token' }, { status: 400 })
    }

    // Return user info for confirmation page
    const user = Array.isArray(preferences.users) ? preferences.users[0] : preferences.users
    return NextResponse.json({
      user: {
        email: user.email,
        name: user.full_name || user.username || 'Потребител'
      }
    })
  } catch (error) {
    console.error('Error in unsubscribe GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, unsubscribe_type = 'all' } = body

    if (!token) {
      return NextResponse.json({ error: 'Missing unsubscribe token' }, { status: 400 })
    }

    // Verify token exists
    const { data: preferences, error: fetchError } = await supabase
      .from('user_email_preferences')
      .select('user_id')
      .eq('unsubscribe_token', token)
      .single()

    if (fetchError || !preferences) {
      return NextResponse.json({ error: 'Invalid unsubscribe token' }, { status: 400 })
    }

    // Update preferences based on unsubscribe type
    let updateData: any = { updated_at: new Date().toISOString() }

    switch (unsubscribe_type) {
      case 'price_alerts':
        updateData.price_alerts_enabled = false
        break
      case 'marketing':
        updateData.marketing_emails_enabled = false
        break
      case 'all':
      default:
        updateData = {
          ...updateData,
          price_alerts_enabled: false,
          marketing_emails_enabled: false,
          email_frequency: 'never'
        }
        break
    }

    const { error: updateError } = await supabase
      .from('user_email_preferences')
      .update(updateData)
      .eq('unsubscribe_token', token)

    if (updateError) {
      console.error('Error updating unsubscribe preferences:', updateError)
      return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Successfully unsubscribed',
      unsubscribe_type 
    })
  } catch (error) {
    console.error('Error in unsubscribe POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
