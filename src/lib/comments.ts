import { supabase } from './supabase'

/**
 * Fetch the count of comments for a specific product
 * @param productId - The ID of the product
 * @returns Promise<number> - The number of comments
 */
export async function getProductCommentCount(productId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('product_comments')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', productId)
      .is('parent_comment_id', null) // Only count top-level comments

    if (error) {
      console.error('Error fetching comment count:', error)
      return 0
    }

    return count || 0
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
      .select('id', { count: 'exact', head: true })
      .limit(1)

    if (error && error.code === '42P01') {
      return false
    }

    return true
  } catch (error) {
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
