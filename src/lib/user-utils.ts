import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

/**
 * Ensures a user exists in the public.users table
 * This is called before any action that requires a user reference
 */
export async function ensureUserExists(user: User): Promise<boolean> {
  if (!user) return false

  try {
    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    // If user exists, we're good
    if (existingUser && !checkError) {
      return true
    }

    // If user doesn't exist (PGRST116 = no rows returned), create them
    if (checkError && checkError.code === 'PGRST116') {
      console.log('User not found in public.users, creating...', user.id)
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email || 'unknown@example.com',
          full_name: getUserDisplayName(user),
          role: 'user',
          is_active: true
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating user in public.users:', createError)
        return false
      }

      console.log('User created successfully:', newUser)
      return true
    }

    // Other errors
    console.error('Error checking user existence:', checkError)
    return false
  } catch (error) {
    console.error('Error in ensureUserExists:', error)
    return false
  }
}

/**
 * Gets a display name for a user from their metadata or email
 * Prioritizes username, then full_name, then falls back to email username
 */
export function getUserDisplayName(user: any): string {
  if (!user) return 'Анонимен'

  // If this is a database user object, prioritize username
  if (user.username && typeof user.username === 'string') {
    return user.username
  }

  // Try different sources for the name
  const metadata = user.user_metadata || {}

  // Try username from metadata
  if (metadata.username && typeof metadata.username === 'string') {
    return metadata.username
  }

  // Try full_name
  if (user.full_name && typeof user.full_name === 'string') {
    return user.full_name.trim()
  }

  if (metadata.full_name && typeof metadata.full_name === 'string') {
    return metadata.full_name.trim()
  }

  // Try first_name + last_name
  const firstName = user.first_name || metadata.first_name || ''
  const lastName = user.last_name || metadata.last_name || ''
  if (firstName || lastName) {
    const fullName = `${firstName} ${lastName}`.trim()
    if (fullName) return fullName
  }

  // Try name field (common with OAuth providers)
  if (metadata.name && typeof metadata.name === 'string') {
    return metadata.name.trim()
  }

  // Try display_name
  if (metadata.display_name && typeof metadata.display_name === 'string') {
    return metadata.display_name.trim()
  }

  // Fallback to email username
  if (user.email) {
    return user.email.split('@')[0]
  }

  return 'Потребител'
}

/**
 * Updates a user's display name in the database
 */
export async function updateUserDisplayName(userId: string, displayName: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ 
        full_name: displayName.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (error) {
      console.error('Error updating user display name:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in updateUserDisplayName:', error)
    return false
  }
}

/**
 * Gets user profile information from the public.users table
 */
export async function getUserProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, username, full_name, first_name, last_name, avatar_url, role, is_active, created_at')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getUserProfile:', error)
    return null
  }
}

/**
 * Gets user profile information by username
 */
export async function getUserProfileByUsername(username: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, username, full_name, first_name, last_name, avatar_url, role, is_active, created_at')
      .eq('username', username)
      .single()

    if (error) {
      console.error('Error fetching user profile by username:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getUserProfileByUsername:', error)
    return null
  }
}

/**
 * Determines if a string is an email address
 */
export function isEmail(input: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(input)
}

/**
 * Gets the email address for login with timeout and better error handling
 */
export async function getEmailForLogin(emailOrUsername: string): Promise<string | null> {
  // If it's already an email, return it
  if (isEmail(emailOrUsername)) {
    console.log('Input is already an email, returning as-is')
    return emailOrUsername
  }

  // Otherwise, treat it as a username and look up the email
  try {
    console.log('Looking up email for username:', emailOrUsername)

    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 5000) // 5 second timeout
    })

    // Race between the query and timeout
    const { data, error } = await Promise.race([
      supabase
        .from('users')
        .select('email')
        .eq('username', emailOrUsername)
        .single(),
      timeoutPromise
    ])

    if (error) {
      console.error('Error looking up user by username:', error)
      // If user not found, return null so login can fail gracefully
      if (error.code === 'PGRST116') {
        console.log('Username not found in database')
        return null
      }
      // For other errors, return null to fail gracefully
      return null
    }

    const email = data?.email || null
    console.log('Found email for username:', email ? 'yes' : 'no')
    return email
  } catch (error) {
    console.error('Error in getEmailForLogin:', error)
    console.log('Exception caught, returning null to fail gracefully')
    return null
  }
}

/**
 * Syncs all auth users to public.users table (admin function)
 */
export async function syncAuthUsersToPublic(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('sync_auth_users_to_public')

    if (error) {
      console.error('Error syncing auth users:', error)
      return 0
    }

    return data || 0
  } catch (error) {
    console.error('Error in syncAuthUsersToPublic:', error)
    return 0
  }
}

/**
 * Fixes users with missing display names (admin function)
 */
export async function fixMissingUserNames(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('fix_missing_user_names')

    if (error) {
      console.error('Error fixing user names:', error)
      return 0
    }

    return data || 0
  } catch (error) {
    console.error('Error in fixMissingUserNames:', error)
    return 0
  }
}

/**
 * Validates that a user can perform an action (exists and is active)
 */
export async function validateUserForAction(user: User): Promise<boolean> {
  if (!user) return false

  // Ensure user exists in public.users
  const userExists = await ensureUserExists(user)
  if (!userExists) return false

  // Check if user is active
  const profile = await getUserProfile(user.id)
  return profile?.is_active === true
}

/**
 * Checks if a user is active by email or username with timeout and better error handling
 */
export async function isUserActive(emailOrUsername: string): Promise<boolean> {
  try {
    console.log('Checking user active status for:', emailOrUsername)

    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 5000) // 5 second timeout
    })

    let query = supabase.from('users').select('is_active, role, email, username')

    // Check if input is email or username
    if (isEmail(emailOrUsername)) {
      query = query.eq('email', emailOrUsername)
    } else {
      query = query.eq('username', emailOrUsername)
    }

    // Race between the query and timeout
    const { data, error } = await Promise.race([
      query.single(),
      timeoutPromise
    ])

    console.log('isUserActive query result:', { emailOrUsername, data, error })

    if (error) {
      console.error('Error checking user active status:', error)
      // If user doesn't exist (PGRST116), they might not be in public.users yet
      // In this case, we should allow the login to proceed and let the auth system handle it
      if (error.code === 'PGRST116') {
        console.log('User not found in public.users, allowing login to proceed')
        return true // Allow login, user will be created by the auth trigger
      }
      // For other errors, be permissive and allow login
      console.log('Database error, being permissive and allowing login')
      return true
    }

    // Special handling for super admins - always allow them to login
    if (data?.role === 'super_admin') {
      console.log('Super admin detected, allowing login regardless of is_active status')
      return true
    }

    // Only return false if the user explicitly has is_active = false
    const result = data?.is_active !== false
    console.log('Final isUserActive result:', result)
    return result
  } catch (error) {
    console.error('Error in isUserActive:', error)
    // Be permissive on errors - allow login
    console.log('Exception caught, being permissive and allowing login')
    return true
  }
}

/**
 * Checks if a user is active by user ID with timeout and better error handling
 * Uses database function to avoid RLS issues
 */
export async function isUserActiveById(userId: string): Promise<boolean> {
  try {
    console.log('Checking user active status by ID for:', userId)

    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 3000) // Reduced to 3 second timeout
    })

    // Use the database function instead of direct table query to avoid RLS issues
    const { data, error } = await Promise.race([
      supabase.rpc('get_user_active_status', { user_id: userId }),
      timeoutPromise
    ])

    console.log('isUserActiveById RPC result:', { userId, data, error })

    if (error) {
      console.error('Error checking user active status by ID:', error)
      // Be permissive on RPC errors - allow session
      console.log('RPC error by ID, being permissive and allowing session')
      return true
    }

    // If no data returned, user might not exist yet
    if (!data || data.length === 0) {
      console.log('No user data found by ID, allowing session (user might be new)')
      return true
    }

    const userData = Array.isArray(data) ? data[0] : data

    // Special handling for super admins - always allow them
    if (userData?.role === 'super_admin') {
      console.log('Super admin detected by ID, allowing session regardless of is_active status')
      return true
    }

    console.log('User status check result:', { userId, userData })

    // Only return false if the user explicitly has is_active = false
    const result = userData?.is_active !== false
    console.log('Final isUserActiveById result:', result)
    return result
  } catch (error) {
    console.error('Error in isUserActiveById:', error)
    // Be permissive on errors - allow session
    console.log('Exception caught by ID, being permissive and allowing session')
    return true
  }
}

/**
 * Safely updates user's last login timestamp with timeout and error handling
 */
export async function updateUserLastLogin(userId: string): Promise<boolean> {
  try {
    console.log('Updating last login for user:', userId)

    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('RPC call timeout')), 3000) // 3 second timeout
    })

    // Race between the RPC call and timeout
    await Promise.race([
      supabase.rpc('update_user_last_login', { user_id: userId }),
      timeoutPromise
    ])

    console.log('Last login updated successfully for user:', userId)
    return true
  } catch (error) {
    console.error('Error updating last login:', error)
    // Don't throw - this is not critical for login functionality
    return false
  }
}

/**
 * Debug function to get detailed user status information
 */
export async function debugUserStatus(emailOrUsername: string): Promise<any> {
  try {
    let query = supabase.from('users').select('*')

    // Check if input is email or username
    if (isEmail(emailOrUsername)) {
      query = query.eq('email', emailOrUsername)
    } else {
      query = query.eq('username', emailOrUsername)
    }

    const { data, error } = await query.single()

    return {
      input: emailOrUsername,
      isEmail: isEmail(emailOrUsername),
      data,
      error,
      exists: !error,
      isActive: data?.is_active,
      role: data?.role
    }
  } catch (error) {
    return {
      input: emailOrUsername,
      error: error,
      exists: false
    }
  }
}
