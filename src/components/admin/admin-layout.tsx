'use client'

import { useAuth } from '@/components/providers/auth-provider'
import { canAccessAdminPanel } from '@/lib/admin'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Shield } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { User } from '@/lib/types'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user: authUser, loading: authLoading } = useAuth()
  const [dbUser, setDbUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!authUser) {
        setLoading(false)
        return
      }

      try {
        // Try to get user from database
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (error || !data) {
          // If user doesn't exist in database, create them with default role
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
              id: authUser.id,
              email: authUser.email || 'test@example.com',
              full_name: authUser.user_metadata?.name || 'Test User',
              role: 'admin', // Default to admin for testing - change this in production
              is_active: true
            })
            .select()
            .single()

          if (insertError) {
            console.error('Error creating user:', insertError)
            router.push('/bg')
            return
          }

          setDbUser(newUser)
        } else {
          setDbUser(data)
        }
      } catch (error) {
        console.error('Error fetching user profile:', error)
        router.push('/bg')
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      fetchUserProfile()
    }
  }, [authUser, authLoading, router])

  useEffect(() => {
    if (!loading && (!dbUser || !canAccessAdminPanel(dbUser))) {
      router.push('/bg')
    }
  }, [dbUser, loading, router])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!dbUser || !canAccessAdminPanel(dbUser)) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/bg/admin">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Обратно към админ панела
                </Button>
              </Link>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-foreground">Админ панел</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  )
}
