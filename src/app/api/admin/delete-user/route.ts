import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/lib/supabase-server'
import { logAdminAction } from '@/lib/admin'

export async function DELETE(request: NextRequest) {
  try {
    const { userId, adminId, userDetails } = await request.json()
    const supabaseAdmin = createServerSupabaseAdminClient()

    console.log('Delete user request:', { userId, adminId })

    if (!userId || !adminId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Verify the admin user has super_admin role
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

    if (adminUser.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super admins can delete users' },
        { status: 403 }
      )
    }

    // Prevent self-deletion
    if (userId === adminId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // Get user details before deletion for logging
    const { data: userToDelete, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !userToDelete) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent deleting other super admins
    if (userToDelete.role === 'super_admin') {
      return NextResponse.json(
        { error: 'Cannot delete other super admins' },
        { status: 400 }
      )
    }

    // Step 1: Sign out all sessions for the user to prevent conflicts
    try {
      console.log('Signing out user sessions...')
      await supabaseAdmin.auth.admin.signOut(userId, 'global')
      console.log('User sessions signed out successfully')
    } catch (signOutError) {
      console.warn('Error signing out user sessions:', signOutError)
      // Continue with deletion even if sign out fails
    }

    // Step 2: Delete user from auth.users (this should cascade to public.users)
    console.log('Attempting to delete user from auth.users...')
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authDeleteError) {
      console.error('Error deleting user from auth:', authDeleteError)
      console.error('Auth delete error details:', {
        message: authDeleteError.message,
        status: authDeleteError.status,
        code: authDeleteError.code
      })

      // If auth deletion fails, try manual cleanup
      try {
        const { error: manualDeleteError } = await supabaseAdmin
          .from('users')
          .delete()
          .eq('id', userId)

        if (manualDeleteError) {
          console.error('Manual cleanup also failed:', manualDeleteError)
          return NextResponse.json(
            { error: 'Failed to delete user completely' },
            { status: 500 }
          )
        }

        console.log('Manual cleanup successful after auth deletion failure')
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError)
        return NextResponse.json(
          { error: 'Failed to delete user from authentication system' },
          { status: 500 }
        )
      }
    }

    // Log the admin action
    try {
      await logAdminAction(
        adminId,
        'delete_user',
        'user',
        userId,
        {
          deleted_user: {
            username: userToDelete.username,
            email: userToDelete.email,
            role: userToDelete.role,
            full_name: userToDelete.full_name
          }
        }
      )
    } catch (logError) {
      console.error('Error logging admin action:', logError)
      // Don't fail the deletion if logging fails
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in delete user API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
