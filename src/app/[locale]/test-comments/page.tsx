'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getProductCommentCount, checkCommentsTableExists } from '@/lib/comments'
import { useCommentCount } from '@/hooks/use-comment-count'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function TestCommentsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [tableExists, setTableExists] = useState<boolean | null>(null)
  const [testResults, setTestResults] = useState<string[]>([])

  // Use the comment count hook for the selected product
  const { 
    commentCount, 
    loading: commentLoading, 
    error: commentError,
    tableExists: hookTableExists,
    refetch 
  } = useCommentCount(selectedProductId)

  useEffect(() => {
    fetchProducts()
    checkTable()
  }, [])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, image_url')
        .limit(10)

      if (error) {
        console.error('Error fetching products:', error)
        return
      }

      setProducts(data || [])
      if (data && data.length > 0) {
        setSelectedProductId(data[0].id)
      }
    } catch (error) {
      console.error('Exception fetching products:', error)
    }
  }

  const checkTable = async () => {
    const exists = await checkCommentsTableExists()
    setTableExists(exists)
  }

  const testCommentCount = async () => {
    if (!selectedProductId) return

    const results: string[] = []
    
    try {
      // Test 1: Direct function call
      const directCount = await getProductCommentCount(selectedProductId)
      results.push(`Direct function call: ${directCount} comments`)

      // Test 2: Direct Supabase query
      const { count, error } = await supabase
        .from('product_comments')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', selectedProductId)
        .is('parent_comment_id', null)

      if (error) {
        results.push(`Direct query error: ${error.message}`)
      } else {
        results.push(`Direct query: ${count || 0} comments`)
      }

      // Test 3: Check if any comments exist at all
      const { data: allComments, error: allError } = await supabase
        .from('product_comments')
        .select('id, product_id')
        .limit(5)

      if (allError) {
        results.push(`All comments query error: ${allError.message}`)
      } else {
        results.push(`Total comments in database: ${allComments?.length || 0}`)
        if (allComments && allComments.length > 0) {
          results.push(`Sample product IDs with comments: ${allComments.map(c => c.product_id.slice(0, 8)).join(', ')}`)
        }
      }

    } catch (error) {
      results.push(`Test error: ${error}`)
    }

    setTestResults(results)
  }

  const createTestComment = async () => {
    if (!selectedProductId) return

    try {
      const { data, error } = await supabase
        .from('product_comments')
        .insert({
          product_id: selectedProductId,
          user_id: '00000000-0000-0000-0000-000000000000', // Dummy user ID
          content: `Test comment created at ${new Date().toISOString()}`,
          likes: 0,
          dislikes: 0
        })
        .select()
        .single()

      if (error) {
        alert(`Error creating test comment: ${error.message}`)
      } else {
        alert('Test comment created successfully!')
        refetch() // Refresh the comment count
        testCommentCount() // Run tests again
      }
    } catch (error) {
      alert(`Exception creating test comment: ${error}`)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Comments System Test Page</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Table Status</h3>
                <Badge variant={tableExists ? "default" : "destructive"}>
                  {tableExists === null ? 'Checking...' : tableExists ? 'Table Exists' : 'Table Missing'}
                </Badge>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Hook Status</h3>
                <Badge variant={hookTableExists ? "default" : "destructive"}>
                  {hookTableExists ? 'Hook OK' : 'Hook Error'}
                </Badge>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Comment Count</h3>
                <Badge variant="outline">
                  {commentLoading ? 'Loading...' : `${commentCount} comments`}
                </Badge>
              </div>
            </div>

            {commentError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-red-700 text-sm">Error: {commentError}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => setSelectedProductId(product.id)}
                  className={`p-3 border rounded-lg text-left transition-colors ${
                    selectedProductId === product.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {product.image_url && (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    )}
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.id.slice(0, 8)}...</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={testCommentCount} disabled={!selectedProductId}>
                Run Comment Count Tests
              </Button>
              <Button onClick={createTestComment} disabled={!selectedProductId} variant="outline">
                Create Test Comment
              </Button>
              <Button onClick={refetch} disabled={!selectedProductId} variant="outline">
                Refresh Count
              </Button>
            </div>

            {testResults.length > 0 && (
              <div className="p-4 bg-gray-50 border rounded-lg">
                <h4 className="font-semibold mb-2">Test Results:</h4>
                <ul className="space-y-1 text-sm">
                  {testResults.map((result, index) => (
                    <li key={index} className="font-mono">{result}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedProductId && (
          <Card>
            <CardHeader>
              <CardTitle>Selected Product Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>Product ID:</strong> {selectedProductId}</p>
                <p><strong>Comment Count (Hook):</strong> {commentCount}</p>
                <p><strong>Loading:</strong> {commentLoading ? 'Yes' : 'No'}</p>
                <p><strong>Error:</strong> {commentError || 'None'}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
