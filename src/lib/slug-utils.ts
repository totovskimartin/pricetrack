/**
 * Utility functions for generating and handling URL slugs
 */

/**
 * Generate a URL-friendly slug from text
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    // Replace Bulgarian characters with Latin equivalents
    .replace(/а/g, 'a')
    .replace(/б/g, 'b')
    .replace(/в/g, 'v')
    .replace(/г/g, 'g')
    .replace(/д/g, 'd')
    .replace(/е/g, 'e')
    .replace(/ж/g, 'zh')
    .replace(/з/g, 'z')
    .replace(/и/g, 'i')
    .replace(/й/g, 'y')
    .replace(/к/g, 'k')
    .replace(/л/g, 'l')
    .replace(/м/g, 'm')
    .replace(/н/g, 'n')
    .replace(/о/g, 'o')
    .replace(/п/g, 'p')
    .replace(/р/g, 'r')
    .replace(/с/g, 's')
    .replace(/т/g, 't')
    .replace(/у/g, 'u')
    .replace(/ф/g, 'f')
    .replace(/х/g, 'h')
    .replace(/ц/g, 'ts')
    .replace(/ч/g, 'ch')
    .replace(/ш/g, 'sh')
    .replace(/щ/g, 'sht')
    .replace(/ъ/g, 'a')
    .replace(/ь/g, 'y')
    .replace(/ю/g, 'yu')
    .replace(/я/g, 'ya')
    // Remove special characters and replace spaces with hyphens
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-+|-+$/g, '')
}

/**
 * Generate a product slug from product name and brand
 */
export function generateProductSlug(name: string, brand?: string, id?: string): string {
  let slug = ''
  
  // Add brand if available
  if (brand) {
    slug += generateSlug(brand) + '-'
  }
  
  // Add product name
  slug += generateSlug(name)
  
  // Ensure slug is not too long
  if (slug.length > 60) {
    slug = slug.substring(0, 60).replace(/-[^-]*$/, '')
  }
  
  // Add short ID suffix to ensure uniqueness
  if (id) {
    const shortId = id.split('-')[0] // First part of UUID
    slug += '-' + shortId
  }
  
  return slug || 'product'
}

/**
 * Extract product ID from slug
 */
export function extractIdFromSlug(slug: string): string | null {
  // The ID is the last part after the final hyphen
  const parts = slug.split('-')
  const lastPart = parts[parts.length - 1]

  // Check if it looks like a UUID part (6-8 characters, alphanumeric)
  // First try hex characters only, then fall back to any alphanumeric
  if (lastPart && lastPart.length >= 6 && lastPart.length <= 8) {
    if (/^[a-f0-9]+$/i.test(lastPart)) {
      return lastPart
    } else if (/^[a-z0-9]+$/i.test(lastPart)) {
      return lastPart
    }
  }

  return null
}

/**
 * Transform product data to match expected format
 */
function transformProductData(data: any) {
  if (!data) return null

  return {
    ...data,
    price_entries: data.prices?.map((price: any) => {
      // Handle different supermarket data structures
      const supermarket = price.supermarkets || price.supermarket || {}

      return {
        id: price.id,
        price: price.price_bgn,
        currency: 'BGN' as const,
        recorded_at: price.created_at,
        supermarket: {
          id: supermarket.id || '',
          name: supermarket.name || 'Unknown',
          logo_url: supermarket.logo_url || ''
        }
      }
    }) || []
  }
}

/**
 * Find product by slug or ID
 */
export async function findProductBySlugOrId(slugOrId: string, supabaseClient: any) {
  // First try to extract ID from slug
  const extractedId = extractIdFromSlug(slugOrId)

  if (extractedId) {
    // Get all approved products and filter client-side
    const { data: products, error } = await supabaseClient
      .from('products')
      .select(`
        *,
        prices(
          id,
          price_bgn,
          created_at,
          supermarkets(
            id,
            name,
            logo_url
          )
        )
      `)
      .eq('is_approved', true)
      .limit(50)

    if (error) {
      return null
    }

    if (products && products.length > 0) {
      // Find product where ID starts with extracted ID
      const matchingProduct = products.find((product: any) =>
        product.id.toLowerCase().startsWith(extractedId.toLowerCase())
      )

      if (matchingProduct) {
        // Transform the data to match expected format
        return transformProductData(matchingProduct)
      }
    }
  }

  // If no ID found or no match, try direct ID lookup (for backward compatibility)
  if (slugOrId.includes('-') && slugOrId.length > 30) {
    const { data, error } = await supabaseClient
      .from('products')
      .select(`
        *,
        prices(
          id,
          price_bgn,
          created_at,
          supermarkets(
            id,
            name,
            logo_url
          )
        )
      `)
      .eq('id', slugOrId)
      .eq('is_approved', true)
      .single()

    if (!error && data) {
      // Transform the data to match expected format
      return transformProductData(data)
    }
  }

  return null
}

/**
 * Generate category slug
 */
export function generateCategorySlug(category: string): string {
  const categoryMap: Record<string, string> = {
    'Bread and Bakery': 'hlebni-izdeliya',
    'Dairy Products': 'mlechni-produkti',
    'Fruits and Vegetables': 'plodove-i-zelenchutsi',
    'Meat and Fish': 'meso-i-riba',
    'Beverages': 'napitki',
    'Snacks': 'zakuski',
    'Frozen Foods': 'zamrazeni-hrani',
    'Household': 'domakinski-stoki',
    'Personal Care': 'lichna-higiena',
    'Other': 'drugi'
  }
  
  return categoryMap[category] || generateSlug(category)
}

/**
 * Get product URL with friendly slug
 */
export function getProductUrl(product: { id: string; name: string; brand?: string }, locale: string = 'bg'): string {
  const slug = generateProductSlug(product.name, product.brand, product.id)
  return `/${locale}/products/${slug}`
}

/**
 * Get category URL with friendly slug
 */
export function getCategoryUrl(category: string, locale: string = 'bg'): string {
  const slug = generateCategorySlug(category)
  return `/${locale}/products?category=${slug}`
}
