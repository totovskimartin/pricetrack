'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

export default function DebugDbPage() {
  const [results, setResults] = useState<any>({})
  const [loading, setLoading] = useState(false)

  const runDiagnostics = async () => {
    setLoading(true)
    const diagnostics: any = {}

    try {
      // Test 1: Check if we can connect to Supabase at all
      console.log('Testing basic Supabase connection...')
      const { data: authUser, error: authError } = await supabase.auth.getUser()
      diagnostics.authConnection = {
        success: !authError,
        error: authError?.message,
        user: authUser?.user?.id
      }

      // Test 2: Check if we can query users table (should work)
      console.log('Testing users table...')
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, role')
        .limit(3)
      
      diagnostics.usersTable = {
        success: !usersError,
        error: usersError?.message,
        count: users?.length || 0,
        sample: users?.[0]
      }

      // Test 3: Check if we can query products table (should work)
      console.log('Testing products table...')
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, category')
        .limit(3)
      
      diagnostics.productsTable = {
        success: !productsError,
        error: productsError?.message,
        count: products?.length || 0,
        sample: products?.[0]
      }

      // Test 4: Check if discussions table exists and get all discussions
      console.log('Testing discussions table...')
      const { data: discussions, error: discussionsError } = await supabase
        .from('discussions')
        .select('id, title, is_approved, created_at, created_by')
        .order('created_at', { ascending: false })

      diagnostics.discussionsTable = {
        success: !discussionsError,
        error: discussionsError?.message,
        details: discussionsError?.details,
        hint: discussionsError?.hint,
        code: discussionsError?.code,
        count: discussions?.length || 0,
        allDiscussions: discussions,
        pendingCount: discussions?.filter(d => !d.is_approved).length || 0,
        approvedCount: discussions?.filter(d => d.is_approved).length || 0
      }

      // Test 5: Try to get table schema information
      console.log('Testing table schema query...')
      const { data: schema, error: schemaError } = await supabase
        .rpc('get_table_columns', { table_name: 'discussions' })
        .catch(() => ({ data: null, error: { message: 'RPC function not available' } }))
      
      diagnostics.tableSchema = {
        success: !schemaError,
        error: schemaError?.message,
        columns: schema
      }

      // Test 6: Try a simple raw SQL query
      console.log('Testing raw SQL...')
      const { data: rawQuery, error: rawError } = await supabase
        .rpc('exec_sql', { query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%discuss%'" })
        .catch(() => ({ data: null, error: { message: 'Raw SQL not available' } }))
      
      diagnostics.rawSql = {
        success: !rawError,
        error: rawError?.message,
        result: rawQuery
      }

      // Test 7: Check RLS policies
      console.log('Testing RLS policies...')
      const { data: policies, error: policiesError } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'discussions')
        .catch(() => ({ data: null, error: { message: 'Cannot access pg_policies' } }))
      
      diagnostics.rlsPolicies = {
        success: !policiesError,
        error: policiesError?.message,
        count: policies?.length || 0
      }

    } catch (error) {
      console.error('Diagnostic error:', error)
      diagnostics.generalError = (error as Error).message
    }

    setResults(diagnostics)
    setLoading(false)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Database Diagnostics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button onClick={runDiagnostics} disabled={loading}>
                {loading ? 'Running Diagnostics...' : 'Run Database Diagnostics'}
              </Button>

              {Object.keys(results).length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Diagnostic Results:</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(results).map(([key, value]: [string, any]) => (
                      <Card key={key} className={value.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                        <CardContent className="pt-4">
                          <h4 className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</h4>
                          <p className={value.success ? 'text-green-700' : 'text-red-700'}>
                            {value.success ? '✅ Success' : '❌ Failed'}
                          </p>
                          {value.error && (
                            <div className="text-sm text-red-600 mt-1">
                              <p><strong>Error:</strong> {value.error}</p>
                              {value.details && <p><strong>Details:</strong> {value.details}</p>}
                              {value.hint && <p><strong>Hint:</strong> {value.hint}</p>}
                              {value.code && <p><strong>Code:</strong> {value.code}</p>}
                            </div>
                          )}
                          {value.count !== undefined && (
                            <p className="text-sm text-gray-600">Count: {value.count}</p>
                          )}
                          {value.sample && (
                            <details className="text-xs text-gray-600 mt-1">
                              <summary>Sample Data</summary>
                              <pre className="bg-gray-100 p-1 rounded mt-1 overflow-auto">
                                {JSON.stringify(value.sample, null, 2)}
                              </pre>
                            </details>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="font-medium">Full Diagnostic Results</h4>
                      <pre className="text-xs bg-gray-100 p-4 rounded mt-2 overflow-auto max-h-96">
                        {JSON.stringify(results, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
