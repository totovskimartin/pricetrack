import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { adminId, action, targetType, targetId, details } = await request.json()
    
    if (!adminId || !action || !targetType || !targetId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createServerSupabaseAdminClient()
    
    // Verify the user is an admin/moderator
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', adminId)
      .single()

    if (adminError || !adminUser) {
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 403 }
      )
    }

    if (!['admin', 'super_admin', 'moderator'].includes(adminUser.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Log the admin action
    const { error } = await supabaseAdmin
      .from('admin_logs')
      .insert({
        admin_id: adminId,
        action,
        target_type: targetType,
        target_id: targetId,
        details: details || {}
      })

    if (error) {
      console.error('Error logging admin action:', error)
      return NextResponse.json(
        { error: 'Failed to log action' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in log action API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
