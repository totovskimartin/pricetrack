import { supabase } from './supabase'

/**
 * Diagnostic function to test Supabase connection and table access
 */
export async function diagnosticSupabaseConnection(): Promise<void> {
  console.log('=== SUPABASE DIAGNOSTIC START ===')

  // Test 1: Basic connection
  try {
    console.log('Test 1: Testing basic Supabase connection...')
    const { data, error } = await supabase.from('users').select('id').limit(1)
    if (error) {
      console.error('❌ Users table access failed:', error)
    } else {
      console.log('✅ Users table accessible, found records:', data?.length || 0)
    }
  } catch (e) {
    console.error('❌ Exception accessing users table:', e)
  }

  // Test 2: Products table
  try {
    console.log('Test 2: Testing products table access...')
    const { data, error } = await supabase.from('products').select('id').limit(1)
    if (error) {
      console.error('❌ Products table access failed:', error)
    } else {
      console.log('✅ Products table accessible, found records:', data?.length || 0)
    }
  } catch (e) {
    console.error('❌ Exception accessing products table:', e)
  }

  // Test 3: Discussions table
  try {
    console.log('Test 3: Testing discussions table access...')
    const { data, error } = await supabase.from('discussions').select('id').limit(1)
    if (error) {
      console.error('❌ Discussions table access failed:', error)
    } else {
      console.log('✅ Discussions table accessible, found records:', data?.length || 0)
    }
  } catch (e) {
    console.error('❌ Exception accessing discussions table:', e)
  }

  // Test 4: Product_comments table
  try {
    console.log('Test 4: Testing product_comments table access...')
    const { data, error } = await supabase.from('product_comments').select('id').limit(1)
    if (error) {
      console.error('❌ Product_comments table access failed:', error)
    } else {
      console.log('✅ Product_comments table accessible, found records:', data?.length || 0)
    }
  } catch (e) {
    console.error('❌ Exception accessing product_comments table:', e)
  }

  console.log('=== SUPABASE DIAGNOSTIC END ===')
}

/**
 * Fetch the count of comments for a specific product
 * @param productId - The ID of the product
 * @returns Promise<number> - The number of comments
 */
export async function getProductCommentCount(productId: string): Promise<number> {
  try {
    console.log('Attempting to fetch comment count for product:', productId)

    // Use product_comments table since that's where product-specific comments are stored
    const { data, error } = await supabase
      .from('product_comments')
      .select('id, parent_comment_id')
      .eq('product_id', productId)

    if (error) {
      console.error('Error fetching comment count from product_comments:', error)
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        statusCode: (error as any).statusCode,
        status: (error as any).status
      })
      return 0
    }

    // Filter out replies manually (comments with parent_comment_id)
    const topLevelComments = data?.filter((comment: any) => !comment.parent_comment_id) || []
    const count = topLevelComments.length

    console.log('✅ Comment count query succeeded, total comments:', data?.length || 0, 'top-level:', count)
    return count
  } catch (error) {
    console.error('Exception fetching comment count:', error)
    return 0
  }
}

/**
 * Check if the product_comments table exists
 * @returns Promise<boolean> - Whether the table exists
 */
export async function checkCommentsTableExists(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('product_comments')
      .select('id')
      .limit(1)

    if (error) {
      console.error('Error checking product_comments table:', error)
      if (error.code === '42P01') {
        console.warn('product_comments table does not exist.')
        return false
      }
      return false
    }

    return true
  } catch (error) {
    console.error('Exception checking product_comments table:', error)
    return false
  }
}

/**
 * Fetch comment counts for multiple products
 * @param productIds - Array of product IDs
 * @returns Promise<Record<string, number>> - Object mapping product IDs to comment counts
 */
export async function getMultipleProductCommentCounts(productIds: string[]): Promise<Record<string, number>> {
  if (productIds.length === 0) return {}

  try {
    const { data, error } = await supabase
      .from('product_comments')
      .select('product_id')
      .in('product_id', productIds)
      .is('parent_comment_id', null) // Only count top-level comments

    if (error) {
      console.error('Error fetching multiple comment counts:', error)
      // Check if it's a table not found error
      if (error.code === '42P01') {
        console.warn('product_comments table does not exist. Please run the migration: supabase/migrations/021_simple_comments_system_fixed.sql')
      }
      return {}
    }

    // Count comments per product
    const counts: Record<string, number> = {}
    productIds.forEach(id => counts[id] = 0) // Initialize all to 0

    data?.forEach(comment => {
      counts[comment.product_id] = (counts[comment.product_id] || 0) + 1
    })

    return counts
  } catch (error) {
    console.error('Exception fetching multiple comment counts:', error)
    return {}
  }
}
