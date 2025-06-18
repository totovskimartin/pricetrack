'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/providers/auth-provider'

export default function DiscussionsTestPage() {
  const { user } = useAuth()
  const [results, setResults] = useState<any>({})
  const [loading, setLoading] = useState(false)

  const runTests = async () => {
    setLoading(true)
    const testResults: any = {}

    try {
      // Test 1: Check if discussions table exists and has correct columns
      console.log('Testing discussions table structure...')
      const { data: tableInfo, error: tableError } = await supabase
        .from('discussions')
        .select('*')
        .limit(1)

      testResults.tableExists = !tableError
      testResults.tableError = tableError?.message

      // Test 2: Check if we can query discussions
      console.log('Testing discussions query...')
      const { data: discussions, error: queryError } = await supabase
        .from('discussions')
        .select('id, title, content, category, is_approved, created_at')
        .limit(5)

      testResults.canQuery = !queryError
      testResults.queryError = queryError?.message
      testResults.discussionsCount = discussions?.length || 0

      // Test 3: Check if we can create a discussion (if user is logged in)
      if (user) {
        console.log('Testing discussion creation...')
        const testDiscussion = {
          title: 'Test Discussion ' + Date.now(),
          slug: 'test-discussion-' + Date.now(),
          content: 'This is a test discussion created by the test page.',
          category: 'Общи',
          is_approved: false,
          created_by: user.id
        }

        const { data: newDiscussion, error: createError } = await supabase
          .from('discussions')
          .insert(testDiscussion)
          .select()
          .single()

        testResults.canCreate = !createError
        testResults.createError = createError?.message
        testResults.createdDiscussion = newDiscussion

        // Clean up - delete the test discussion
        if (newDiscussion) {
          await supabase
            .from('discussions')
            .delete()
            .eq('id', newDiscussion.id)
        }
      }

      // Test 4: Check if discussion_comments table exists
      console.log('Testing discussion_comments table...')
      const { data: comments, error: commentsError } = await supabase
        .from('discussion_comments')
        .select('*')
        .limit(1)

      testResults.commentsTableExists = !commentsError
      testResults.commentsError = commentsError?.message

      // Test 5: Check available categories
      console.log('Testing category constraint...')
      const { data: categoriesData, error: categoriesError } = await supabase
        .rpc('get_enum_values', { enum_name: 'discussions_category_valid' })
        .catch(() => ({ data: null, error: null }))

      testResults.categoriesTest = categoriesData || 'Could not fetch categories'

    } catch (error) {
      console.error('Test error:', error)
      testResults.generalError = (error as Error).message
    }

    setResults(testResults)
    setLoading(false)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Discussions Database Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button onClick={runTests} disabled={loading}>
                {loading ? 'Running Tests...' : 'Run Database Tests'}
              </Button>

              {Object.keys(results).length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Test Results:</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className={results.tableExists ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                      <CardContent className="pt-4">
                        <h4 className="font-medium">Table Exists</h4>
                        <p className={results.tableExists ? 'text-green-700' : 'text-red-700'}>
                          {results.tableExists ? '✅ Success' : '❌ Failed'}
                        </p>
                        {results.tableError && (
                          <p className="text-sm text-red-600 mt-1">{results.tableError}</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card className={results.canQuery ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                      <CardContent className="pt-4">
                        <h4 className="font-medium">Can Query Discussions</h4>
                        <p className={results.canQuery ? 'text-green-700' : 'text-red-700'}>
                          {results.canQuery ? '✅ Success' : '❌ Failed'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Found {results.discussionsCount} discussions
                        </p>
                        {results.queryError && (
                          <p className="text-sm text-red-600 mt-1">{results.queryError}</p>
                        )}
                      </CardContent>
                    </Card>

                    {user && (
                      <Card className={results.canCreate ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                        <CardContent className="pt-4">
                          <h4 className="font-medium">Can Create Discussion</h4>
                          <p className={results.canCreate ? 'text-green-700' : 'text-red-700'}>
                            {results.canCreate ? '✅ Success' : '❌ Failed'}
                          </p>
                          {results.createError && (
                            <p className="text-sm text-red-600 mt-1">{results.createError}</p>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    <Card className={results.commentsTableExists ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                      <CardContent className="pt-4">
                        <h4 className="font-medium">Comments Table</h4>
                        <p className={results.commentsTableExists ? 'text-green-700' : 'text-red-700'}>
                          {results.commentsTableExists ? '✅ Success' : '❌ Failed'}
                        </p>
                        {results.commentsError && (
                          <p className="text-sm text-red-600 mt-1">{results.commentsError}</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {results.generalError && (
                    <Card className="border-red-200 bg-red-50">
                      <CardContent className="pt-4">
                        <h4 className="font-medium text-red-700">General Error</h4>
                        <p className="text-sm text-red-600">{results.generalError}</p>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="font-medium">Raw Results</h4>
                      <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto">
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
