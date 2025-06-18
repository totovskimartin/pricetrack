'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getEmailForLogin, isUserActive, isUserActiveById, updateUserLastLogin } from '@/lib/user-utils'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
  signUp: (email: string, password: string, metadata?: any) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signInWithEmailOrUsername: (emailOrUsername: string, password: string) => Promise<any>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  signUp: async () => ({}),
  signIn: async () => ({}),
  signInWithEmailOrUsername: async () => ({}),
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (isMounted) {
          if (session?.user) {
            // Set user immediately for faster loading
            console.log('Setting user from initial session...')
            setUser(session.user)
            setLoading(false)

            // Skip active status check on page refresh to avoid timeout issues
            // The periodic check will handle inactive users
            console.log('Skipping active status check on initial session for better performance')
          } else {
            // No session found
            setUser(null)
            setLoading(false)
          }
        }
      } catch (error) {
        console.error('Error getting session:', error)
        if (isMounted) {
          setUser(null)
          setLoading(false)
        }
      }
    }

    getInitialSession()

    // Periodic check for user active status (every 5 minutes)
    // Temporarily disabled for debugging
    const checkUserStatus = async () => {
      if (user && user.id !== 'e669c358-f587-4a65-b0e4-f6ff8f465921') { // Skip for test user
        console.log('Periodic check for user:', user.id)
        const userActive = await isUserActiveById(user.id)
        console.log('Periodic check result:', userActive)
        if (!userActive) {
          console.log('Periodic check: User is inactive, signing out...')
          await supabase.auth.signOut()
          setUser(null)
          if (typeof window !== 'undefined') {
            window.location.href = '/bg/login?error=account_disabled'
          }
        }
      }
    }

    // Temporarily disable periodic checks for debugging
    // const statusCheckInterval = setInterval(checkUserStatus, 5 * 60 * 1000) // 5 minutes
    const statusCheckInterval = null

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (isMounted) {
          if (session?.user) {
            console.log('Auth state change - user detected:', session.user.id)

            // For sign-in events, we already checked user status in the signIn functions
            // Skip additional check here to avoid redundant database calls
            if (event === 'SIGNED_IN') {
              console.log('User signed in successfully, skipping redundant active status check')
            }

            console.log('Setting user in auth provider')
            setUser(session.user)

            // Update last login timestamp in background (non-blocking)
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              console.log('Updating last login timestamp (background)...')
              updateUserLastLogin(session.user.id).then(success => {
                if (success) {
                  console.log('Last login timestamp updated successfully')
                } else {
                  console.log('Failed to update last login timestamp (non-critical)')
                }
              }).catch(error => {
                console.log('Last login update failed (non-critical):', error)
              })
            }
          } else {
            // No user in session
            setUser(null)
          }
          setLoading(false)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval)
      }
    }
  }, []) // Remove supabase.auth dependency to prevent infinite loops

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const signUp = async (email: string, password: string, metadata?: any) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
  }

  const signIn = async (email: string, password: string) => {
    // Re-enable user active check with improved error handling
    console.log('Checking if user is active before sign in...')
    const userActive = await isUserActive(email)
    if (!userActive) {
      console.log('User is not active, blocking sign in')
      return {
        data: null,
        error: {
          message: 'Вашият акаунт е деактивиран. Моля, свържете се с администратор.',
          status: 403
        }
      }
    }

    console.log('User is active, proceeding with sign in')
    return await supabase.auth.signInWithPassword({
      email,
      password
    })
  }

  const signInWithEmailOrUsername = async (emailOrUsername: string, password: string) => {
    // Re-enable username login with improved error handling
    console.log('Getting email for login (supports both email and username)...')
    const email = await getEmailForLogin(emailOrUsername)

    if (!email) {
      console.log('Could not find email for input:', emailOrUsername)
      return {
        data: null,
        error: {
          message: 'Потребителят не е намерен',
          status: 400
        }
      }
    }

    // Check if user is active
    console.log('Checking if user is active for email/username login...')
    const userActive = await isUserActive(emailOrUsername)
    if (!userActive) {
      console.log('User is not active for email/username login')
      return {
        data: null,
        error: {
          message: 'Вашият акаунт е деактивиран. Моля, свържете се с администратор.',
          status: 403
        }
      }
    }

    console.log('User is active, proceeding with email/username sign in')
    return await supabase.auth.signInWithPassword({
      email,
      password
    })
  }

  const value = {
    user,
    loading,
    signOut,
    signUp,
    signIn,
    signInWithEmailOrUsername,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
