'use client'

import { useAuth } from '@/components/providers/auth-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function AuthTestPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await signOut()
    router.push('/bg')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle>Auth State Test Page</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Loading State:</h3>
              <Badge variant={loading ? 'destructive' : 'default'}>
                {loading ? 'Loading...' : 'Loaded'}
              </Badge>
            </div>

            <div>
              <h3 className="font-semibold mb-2">User State:</h3>
              <Badge variant={user ? 'default' : 'secondary'}>
                {user ? 'Authenticated' : 'Not Authenticated'}
              </Badge>
            </div>

            {user && (
              <div>
                <h3 className="font-semibold mb-2">User Details:</h3>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <pre className="text-sm">
                    {JSON.stringify({
                      id: user.id,
                      email: user.email,
                      user_metadata: user.user_metadata,
                      created_at: user.created_at
                    }, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            <div className="flex space-x-4">
              {user ? (
                <>
                  <Button onClick={() => router.push('/bg/dashboard')}>
                    Go to Dashboard
                  </Button>
                  <Button variant="outline" onClick={handleLogout}>
                    Logout
                  </Button>
                </>
              ) : (
                <Button onClick={() => router.push('/bg/login')}>
                  Go to Login
                </Button>
              )}
            </div>

            <div>
              <h3 className="font-semibold mb-2">Instructions:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• This page shows the current authentication state</li>
                <li>• Refresh the page to test loading states</li>
                <li>• Check if there's any flash of "Not Authenticated" before loading completes</li>
                <li>• Test login/logout flow</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
