'use client'

import { useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { canAccessAdminPanel } from '@/lib/admin'
import { isUserActive, isUserActiveById } from '@/lib/user-utils'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function TestUserStatusPage() {
  const { user: authUser } = useAuth()
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [dbUser, setDbUser] = useState<any>(null)

  // Check if user has admin access
  const checkAdminAccess = async () => {
    if (!authUser) return false
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (error || !data) return false
      
      setDbUser(data)
      return canAccessAdminPanel(data)
    } catch (error) {
      return false
    }
  }

  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  // Check access on component mount
  useState(() => {
    checkAdminAccess().then(setHasAccess)
  })

  const testUserStatusByEmailOrUsername = async () => {
    if (!emailOrUsername.trim()) {
      setError('Please enter an email or username')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const isActive = await isUserActive(emailOrUsername)
      
      // Also get user details
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOrUsername)
      let query = supabase.from('users').select('*')
      
      if (isEmail) {
        query = query.eq('email', emailOrUsername)
      } else {
        query = query.eq('username', emailOrUsername)
      }

      const { data: userData, error: userError } = await query.single()

      setResult({
        type: 'emailOrUsername',
        input: emailOrUsername,
        isActive,
        userData: userError ? null : userData,
        userExists: !userError
      })
    } catch (error) {
      setError('Error checking user status: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const testUserStatusById = async () => {
    if (!userId.trim()) {
      setError('Please enter a user ID')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const isActive = await isUserActiveById(userId)
      
      // Get user details
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      setResult({
        type: 'userId',
        input: userId,
        isActive,
        userData: userError ? null : userData,
        userExists: !userError
      })
    } catch (error) {
      setError('Error checking user status: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (hasAccess === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don't have permission to access this test page</p>
          <Link href="/bg/admin">
            <Button>Back to Admin</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/bg/admin">
            <Button variant="outline" className="mb-4">
              ← Back to Admin
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Test User Status</h1>
          <p className="text-gray-600 mt-2">
            Test the user active status checking functionality
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Test by Email/Username */}
          <Card>
            <CardHeader>
              <CardTitle>Test by Email or Username</CardTitle>
              <CardDescription>
                Check if a user is active by their email address or username
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="emailOrUsername">Email or Username</Label>
                <Input
                  id="emailOrUsername"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder="user@example.com or username"
                />
              </div>
              <Button 
                onClick={testUserStatusByEmailOrUsername}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Check Status'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Test by User ID */}
          <Card>
            <CardHeader>
              <CardTitle>Test by User ID</CardTitle>
              <CardDescription>
                Check if a user is active by their UUID
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="userId">User ID (UUID)</Label>
                <Input
                  id="userId"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
              </div>
              <Button 
                onClick={testUserStatusById}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Check Status'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="mt-6 border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Results Display */}
        {result && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.isActive ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                Test Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <strong>Input:</strong> {result.input} ({result.type})
                </div>
                <div>
                  <strong>User Exists:</strong> {result.userExists ? 'Yes' : 'No'}
                </div>
                <div>
                  <strong>Is Active:</strong> 
                  <span className={result.isActive ? 'text-green-600 ml-2' : 'text-red-600 ml-2'}>
                    {result.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {result.userData && (
                  <div>
                    <strong>User Details:</strong>
                    <pre className="mt-2 p-3 bg-gray-100 rounded text-sm overflow-auto">
                      {JSON.stringify(result.userData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
