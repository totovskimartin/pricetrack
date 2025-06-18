'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestDatabase() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testConnection = async () => {
    setLoading(true)
    setResult('')
    
    try {
      console.log('Testing Supabase connection...')
      
      // Test basic connection
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1)
      
      if (error) {
        setResult(`Database Error: ${error.message}`)
        console.error('Database error:', error)
      } else {
        setResult(`Database connection successful! Found users table.`)
        console.log('Database test successful:', data)
      }
    } catch (error) {
      setResult(`Connection Error: ${error}`)
      console.error('Connection error:', error)
    } finally {
      setLoading(false)
    }
  }

  const testAuth = async () => {
    setLoading(true)
    setResult('')
    
    try {
      console.log('Testing Supabase auth...')
      
      // Test auth connection
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        setResult(`Auth Error: ${error.message}`)
        console.error('Auth error:', error)
      } else {
        setResult(`Auth connection successful! Session: ${session ? 'Active' : 'None'}`)
        console.log('Auth test successful:', session)
      }
    } catch (error) {
      setResult(`Auth Connection Error: ${error}`)
      console.error('Auth connection error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle>Database Connection Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-4">
              <Button onClick={testConnection} disabled={loading}>
                {loading ? 'Testing...' : 'Test Database'}
              </Button>
              <Button onClick={testAuth} disabled={loading}>
                {loading ? 'Testing...' : 'Test Auth'}
              </Button>
            </div>
            
            {result && (
              <div className="p-4 bg-gray-100 rounded-lg">
                <pre className="text-sm">{result}</pre>
              </div>
            )}
            
            <div className="text-sm text-gray-600">
              <p>This page tests the Supabase connection without authentication.</p>
              <p>Check the browser console for detailed logs.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
