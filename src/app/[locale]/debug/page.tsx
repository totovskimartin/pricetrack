'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DebugPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [discussions, setDiscussions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      // Get all products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })

      // Get all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      // Get discussions with user data
      const { data: discussionsData, error: discussionsError } = await supabase
        .from('discussions')
        .select(`
          id,
          title,
          created_by,
          created_at,
          created_by_user:users!created_by(id, full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      console.log('Products:', { data: productsData, error: productsError })
      console.log('Users:', { data: usersData, error: usersError })
      console.log('Discussions:', { data: discussionsData, error: discussionsError })

      setProducts(productsData || [])
      setUsers(usersData || [])
      setDiscussions(discussionsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const createTestProduct = async () => {
    if (!user) {
      alert('No user logged in')
      return
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          name: 'Test Product ' + Date.now(),
          slug: 'test-product-' + Date.now(),
          category: 'Хранителни стоки',
          unit: 'piece',
          is_approved: false,
          created_by: user.id
        })
        .select()
        .single()

      console.log('Created test product:', { data, error })
      
      if (error) {
        alert('Error: ' + error.message)
      } else {
        alert('Product created successfully!')
        fetchData()
      }
    } catch (error) {
      console.error('Error creating product:', error)
      alert('Unexpected error')
    }
  }

  const createUserIfNotExists = async () => {
    if (!user) {
      alert('No user logged in')
      return
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email || 'test@example.com',
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Test User',
          role: 'user',
          is_active: true
        })
        .select()
        .single()

      console.log('Created user:', { data, error })

      if (error) {
        alert('Error: ' + error.message)
      } else {
        alert('User created successfully!')
        fetchData()
      }
    } catch (error) {
      console.error('Error creating user:', error)
      alert('Unexpected error')
    }
  }

  const syncUsers = async () => {
    try {
      const { data, error } = await supabase.rpc('sync_auth_users_to_public')
      if (error) {
        console.error('Sync error:', error)
        alert('Error syncing users: ' + error.message)
      } else {
        alert(`Synced ${data} users`)
        fetchData()
      }
    } catch (error) {
      console.error('Sync error:', error)
      alert('Error syncing users')
    }
  }

  const fixUserNames = async () => {
    try {
      const { data, error } = await supabase.rpc('fix_missing_user_names')
      if (error) {
        console.error('Fix names error:', error)
        alert('Error fixing names: ' + error.message)
      } else {
        alert(`Fixed ${data} user names`)
        fetchData()
      }
    } catch (error) {
      console.error('Fix names error:', error)
      alert('Error fixing names')
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Debug Page</h1>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Current User</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
            <div className="mt-4 space-x-2 space-y-2">
              <div>
                <Button onClick={createUserIfNotExists}>Create User in DB</Button>
                <Button onClick={createTestProduct} className="ml-2">Create Test Product</Button>
                <Button onClick={fetchData} disabled={loading} className="ml-2">
                  {loading ? 'Loading...' : 'Refresh Data'}
                </Button>
              </div>
              <div>
                <Button onClick={syncUsers} variant="outline">Sync Auth Users</Button>
                <Button onClick={fixUserNames} variant="outline" className="ml-2">Fix User Names</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Products ({products.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-auto">
              {products.map((product) => (
                <div key={product.id} className="p-2 border rounded">
                  <div className="font-medium">{product.name}</div>
                  <div className="text-sm text-gray-600">
                    Category: {product.category} | 
                    Approved: {product.is_approved ? 'Yes' : 'No'} | 
                    Created by: {product.created_by}
                  </div>
                  <div className="text-xs text-gray-500">
                    Created: {new Date(product.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
              {products.length === 0 && (
                <div className="text-gray-500">No products found</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Discussions ({discussions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-auto">
              {discussions.map((discussion) => (
                <div key={discussion.id} className="p-2 border rounded">
                  <div className="font-medium">{discussion.title}</div>
                  <div className="text-sm text-gray-600">
                    Created by ID: {discussion.created_by || 'NULL'}
                  </div>
                  <div className="text-sm text-gray-600">
                    Author name: {discussion.created_by_user?.full_name || 'NULL'}
                  </div>
                  <div className="text-sm text-gray-600">
                    Author email: {discussion.created_by_user?.email || 'NULL'}
                  </div>
                  <div className="text-xs text-gray-500">
                    Created: {new Date(discussion.created_at).toLocaleString()}
                  </div>
                  <pre className="text-xs bg-gray-100 p-2 rounded mt-2">
                    {JSON.stringify(discussion.created_by_user, null, 2)}
                  </pre>
                </div>
              ))}
              {discussions.length === 0 && (
                <div className="text-gray-500">No discussions found</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Users ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-auto">
              {users.map((user) => (
                <div key={user.id} className="p-2 border rounded">
                  <div className="font-medium">{user.full_name || user.email}</div>
                  <div className="text-sm text-gray-600">
                    Role: {user.role} | Active: {user.is_active ? 'Yes' : 'No'}
                  </div>
                  <div className="text-xs text-gray-500">
                    ID: {user.id}
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <div className="text-gray-500">No users found</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
