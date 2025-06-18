'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function DebugDiscussions() {
  const [discussions, setDiscussions] = useState<any[]>([])
  const [tableInfo, setTableInfo] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkTableSchema = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Check table schema
      const { data: schemaData, error: schemaError } = await supabase
        .rpc('get_table_info', { table_name: 'discussions' })
        .single()

      if (schemaError) {
        console.error('Schema error:', schemaError)
        // Try alternative method
        const { data: altData, error: altError } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable')
          .eq('table_name', 'discussions')
          .eq('table_schema', 'public')

        if (altError) {
          console.error('Alt schema error:', altError)
        } else {
          setTableInfo(altData || [])
        }
      } else {
        setTableInfo(schemaData || [])
      }

      // Try to fetch discussions with minimal query first
      const { data: discussionsData, error: discussionsError } = await supabase
        .from('discussions')
        .select('*')
        .limit(10)

      console.log('Raw discussions query:', { discussionsData, discussionsError })

      if (discussionsError) {
        setError(`Discussions error: ${discussionsError.message}`)
        console.error('Discussions error:', discussionsError)
      } else {
        setDiscussions(discussionsData || [])
      }

      // Try the full query that the admin panel uses
      const { data: fullData, error: fullError } = await supabase
        .from('discussions')
        .select(`
          *,
          created_by_user:users!created_by(full_name, email, username),
          product:products(id, name)
        `)
        .limit(5)

      console.log('Full query result:', { fullData, fullError })

    } catch (err) {
      console.error('Unexpected error:', err)
      setError(`Unexpected error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const insertTestDiscussion = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('discussions')
        .insert({
          title: 'Test Discussion from Debug',
          content: 'This is a test discussion created from the debug page.',
          category: 'Общи',
          is_approved: true
        })
        .select()

      console.log('Insert result:', { data, error })
      
      if (error) {
        setError(`Insert error: ${error.message}`)
      } else {
        await checkTableSchema() // Refresh data
      }
    } catch (err) {
      console.error('Insert error:', err)
      setError(`Insert error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkTableSchema()
  }, [])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Debug Discussions</h1>
      
      <div className="flex gap-4">
        <Button onClick={checkTableSchema} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh Data'}
        </Button>
        <Button onClick={insertTestDiscussion} disabled={loading}>
          Insert Test Discussion
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Table Schema</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(tableInfo, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Discussions Data ({discussions.length} items)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(discussions, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
