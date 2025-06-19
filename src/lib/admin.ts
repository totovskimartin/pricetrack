import { UserRole, User, AdminLog } from './types'
import { createServerSupabaseAdminClient } from './supabase-server'

/**
 * Check if user has admin privileges
 */
export function isAdmin(user: User | null): boolean {
  if (!user) return false
  return ['admin', 'super_admin'].includes(user.role)
}

/**
 * Check if user has moderator privileges or higher
 */
export function isModerator(user: User | null): boolean {
  if (!user) return false
  return ['moderator', 'admin', 'super_admin'].includes(user.role)
}

/**
 * Check if user has super admin privileges
 */
export function isSuperAdmin(user: User | null): boolean {
  if (!user) return false
  return user.role === 'super_admin'
}

/**
 * Check if user can delete other users (super admin only)
 */
export function canDeleteUsers(user: User | null): boolean {
  if (!user) return false
  return user.role === 'super_admin'
}

/**
 * Check if user can manage other users
 */
export function canManageUsers(user: User | null): boolean {
  return isAdmin(user)
}

/**
 * Check if user can moderate content
 */
export function canModerateContent(user: User | null): boolean {
  return isModerator(user)
}

/**
 * Check if user can manage supermarkets
 */
export function canManageSupermarkets(user: User | null): boolean {
  return isAdmin(user)
}

/**
 * Check if user can access admin panel
 */
export const canAccessAdminPanel = (user: any): boolean => {
  if (!user) return false
  
  // Check if the user has an admin role
  const role = user.role
  return ['moderator', 'admin', 'super_admin'].includes(role)
}

/**
 * Get role hierarchy level (higher number = more privileges)
 */
export function getRoleLevel(role: UserRole): number {
  switch (role) {
    case 'user':
      return 1
    case 'moderator':
      return 2
    case 'admin':
      return 3
    case 'super_admin':
      return 4
    default:
      return 0
  }
}

/**
 * Check if user can modify another user's role
 */
export function canModifyUserRole(
  currentUser: User | null,
  targetUser: User,
  newRole: UserRole
): boolean {
  if (!currentUser || !isSuperAdmin(currentUser)) return false
  
  const currentUserLevel = getRoleLevel(currentUser.role)
  const targetUserLevel = getRoleLevel(targetUser.role)
  const newRoleLevel = getRoleLevel(newRole)
  
  // Super admin can modify anyone except other super admins (unless it's themselves)
  if (targetUser.role === 'super_admin' && targetUser.id !== currentUser.id) {
    return false
  }
  
  // Can only assign roles lower than or equal to current user's level
  return newRoleLevel <= currentUserLevel
}

/**
 * Log admin action (client-side version with API fallback)
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  details: any = {}
) {
  try {
    const { supabase } = await import('@/lib/supabase')

    // Try direct client-side logging first
    const { error } = await supabase
      .from('admin_logs')
      .insert({
        admin_id: adminId,
        action,
        target_type: targetType,
        target_id: targetId,
        details
      })

    if (error) {
      console.warn('Direct logging failed, trying API route:', error)

      // Fallback to API route
      const response = await fetch('/api/admin/log-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminId,
          action,
          targetType,
          targetId,
          details
        })
      })

      if (!response.ok) {
        console.error('API logging also failed:', await response.text())
        return false
      }
    }

    return true
  } catch (error) {
    console.error('Failed to log admin action:', error)
    // Don't throw error for logging failures to avoid breaking the main operation
    return false
  }
}

/**
 * Log admin action (server-side version)
 */
export async function logAdminActionServer(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  details: any = {}
) {
  try {
    const supabaseAdmin = createServerSupabaseAdminClient()

    const { error } = await supabaseAdmin
      .from('admin_logs')
      .insert({
        admin_id: adminId,
        action,
        target_type: targetType,
        target_id: targetId,
        details
      })

    if (error) {
      console.error('Error logging admin action:', error)
      throw error
    }

    return true
  } catch (error) {
    console.error('Failed to log admin action:', error)
    throw error
  }
}

/**
 * Get admin statistics
 */
export async function getAdminStats() {
  try {
    const { supabase } = await import('@/lib/supabase')

    // Get counts for different entities
    const [
      { count: totalUsers },
      { count: totalProducts },
      { count: totalSupermarkets },
      { count: totalDiscussions },
      { count: totalAlerts },
      { count: pendingProducts }
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('supermarkets').select('*', { count: 'exact', head: true }),
      supabase.from('discussions').select('*', { count: 'exact', head: true }),
      supabase.from('admin_notifications').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_approved', false)
    ])

    return {
      totalUsers: totalUsers || 0,
      totalProducts: totalProducts || 0,
      totalSupermarkets: totalSupermarkets || 0,
      totalDiscussions: totalDiscussions || 0,
      totalAlerts: totalAlerts || 0,
      pendingApprovals: pendingProducts || 0,
      activeUsers: totalUsers || 0, // TODO: Calculate active users in last 30 days
      recentActivity: [] // Will be implemented when admin_logs table is added
    }
  } catch (error) {
    console.error('Failed to get admin stats:', error)
    return {
      totalUsers: 0,
      totalProducts: 0,
      totalSupermarkets: 0,
      totalDiscussions: 0,
      totalAlerts: 0,
      pendingApprovals: 0,
      activeUsers: 0,
      recentActivity: []
    }
  }
}

/**
 * Get pending approvals
 */
export async function getPendingApprovals() {
  try {
    const { supabase } = await import('@/lib/supabase')

    const [
      { data: pendingProducts },
      { data: pendingDiscussions },
      { data: pendingComments }
    ] = await Promise.all([
      supabase
        .from('products')
        .select(`
          *,
          created_by_user:users!created_by(full_name, email)
        `)
        .eq('is_approved', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('discussions')
        .select(`
          *,
          created_by_user:users!created_by(full_name, email)
        `)
        .eq('is_approved', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('discussion_comments')
        .select(`
          *,
          created_by_user:users!created_by(full_name, email),
          discussion:discussions(id, title)
        `)
        .eq('is_approved', false)
        .order('created_at', { ascending: false })
    ])

    return {
      pendingProducts: pendingProducts || [],
      pendingDiscussions: pendingDiscussions || [],
      pendingComments: pendingComments || []
    }
  } catch (error) {
    console.error('Failed to get pending approvals:', error)
    return {
      pendingProducts: [],
      pendingDiscussions: [],
      pendingComments: []
    }
  }
}

/**
 * Get pending approvals count
 */
export async function getPendingApprovalsCount() {
  try {
    const { supabase } = await import('@/lib/supabase')

    const [
      { count: pendingProducts },
      { count: pendingDiscussions },
      { count: pendingComments },
      { count: pendingPriceSuggestions }
    ] = await Promise.all([
      supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', false),
      supabase
        .from('discussions')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', false),
      supabase
        .from('discussion_comments')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', false),
      supabase
        .from('price_suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
    ])

    const totalPending = (pendingProducts || 0) + (pendingDiscussions || 0) + (pendingComments || 0) + (pendingPriceSuggestions || 0)

    return {
      total: totalPending,
      products: pendingProducts || 0,
      discussions: pendingDiscussions || 0,
      comments: pendingComments || 0,
      priceSuggestions: pendingPriceSuggestions || 0
    }
  } catch (error) {
    console.error('Failed to get pending approvals count:', error)
    return {
      total: 0,
      products: 0,
      discussions: 0,
      comments: 0,
      priceSuggestions: 0
    }
  }
}

/**
 * Approve or reject content
 */
export async function moderateContent(
  adminId: string,
  contentType: 'product' | 'discussion' | 'comment',
  contentId: string,
  action: 'approve' | 'reject',
  reason?: string
): Promise<boolean> {
  try {
    const { supabase } = await import('@/lib/supabase')

    let tableName: string
    switch (contentType) {
      case 'product':
        tableName = 'products'
        break
      case 'discussion':
        tableName = 'discussions'
        break
      case 'comment':
        tableName = 'discussion_comments'
        break
      default:
        throw new Error('Invalid content type')
    }

    console.log(`Moderating ${contentType} ${contentId} with action ${action}`)

    if (action === 'approve') {
      const { data, error } = await supabase
        .from(tableName)
        .update({ is_approved: true })
        .eq('id', contentId)
        .select()

      if (error) {
        console.error('Error approving content:', error)
        throw error
      }

      console.log('Content approved successfully:', data)
    } else {
      // For rejection, we might want to delete or mark as rejected
      const { data, error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', contentId)
        .select()

      if (error) {
        console.error('Error rejecting content:', error)
        throw error
      }

      console.log('Content rejected successfully:', data)
    }

    // Log the action (optional, skip if logging fails)
    try {
      await logAdminActionServer(
        adminId,
        `${action}_${contentType}`,
        contentType,
        contentId,
        { reason }
      )
    } catch (logError) {
      console.warn('Failed to log admin action:', logError)
      // Don't fail the whole operation if logging fails
    }

    return true
  } catch (error) {
    console.error('Failed to moderate content:', error)
    return false
  }
}
