import { Database } from './database'

export type { Database }

// Table types
export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type Supermarket = Database['public']['Tables']['supermarkets']['Row']
export type SupermarketInsert = Database['public']['Tables']['supermarkets']['Insert']
export type SupermarketUpdate = Database['public']['Tables']['supermarkets']['Update']

export type Product = Database['public']['Tables']['products']['Row']
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type ProductUpdate = Database['public']['Tables']['products']['Update']

export type Price = Database['public']['Tables']['prices']['Row']
export type PriceInsert = Database['public']['Tables']['prices']['Insert']
export type PriceUpdate = Database['public']['Tables']['prices']['Update']

export type Discussion = Database['public']['Tables']['discussions']['Row']
export type DiscussionInsert = Database['public']['Tables']['discussions']['Insert']
export type DiscussionUpdate = Database['public']['Tables']['discussions']['Update']

export type DiscussionComment = Database['public']['Tables']['discussion_comments']['Row']
export type DiscussionCommentInsert = Database['public']['Tables']['discussion_comments']['Insert']
export type DiscussionCommentUpdate = Database['public']['Tables']['discussion_comments']['Update']

export type UserProduct = Database['public']['Tables']['user_products']['Row']
export type UserProductInsert = Database['public']['Tables']['user_products']['Insert']
export type UserProductUpdate = Database['public']['Tables']['user_products']['Update']

export type AdminLog = Database['public']['Tables']['admin_logs']['Row']
export type AdminLogInsert = Database['public']['Tables']['admin_logs']['Insert']
export type AdminLogUpdate = Database['public']['Tables']['admin_logs']['Update']

// Enum types
export type UserRole = Database['public']['Enums']['user_role']

// Extended types with relations
export type ProductWithDetails = Product & {
  supermarket?: Supermarket
  prices?: Price[]
  created_by_user?: User
  is_tracked?: boolean
}

export type PriceWithDetails = Price & {
  product?: Product
  supermarket?: Supermarket
  created_by_user?: User
}

export type DiscussionWithDetails = Discussion & {
  product?: Product
  created_by_user?: User
  comments?: DiscussionCommentWithDetails[]
  comment_count?: number
}

export type DiscussionCommentWithDetails = DiscussionComment & {
  created_by_user?: User
  replies?: DiscussionCommentWithDetails[]
}

// Admin dashboard types
export type AdminStats = {
  totalUsers: number
  totalProducts: number
  totalSupermarkets: number
  totalDiscussions: number
  pendingApprovals: number
  activeUsers: number
  recentActivity: AdminLog[]
}

// Product categories
export type ProductCategory = 
  | 'food'
  | 'beverages'
  | 'dairy'
  | 'meat'
  | 'fruits'
  | 'vegetables'
  | 'bakery'
  | 'frozen'
  | 'household'
  | 'personal_care'
  | 'baby'
  | 'pet'
  | 'other'

// Currency types
export type Currency = 'BGN' | 'EUR'

export type CurrencyRate = {
  from: Currency
  to: Currency
  rate: number
  lastUpdated: string
}

// Search and filter types
export type ProductFilters = {
  category?: ProductCategory
  supermarket?: string
  priceRange?: {
    min: number
    max: number
  }
  sortBy?: 'name' | 'price' | 'created_at' | 'updated_at'
  sortOrder?: 'asc' | 'desc'
}

export type SearchParams = {
  query?: string
  filters?: ProductFilters
  page?: number
  limit?: number
}

// API response types
export type ApiResponse<T> = {
  data: T
  error?: string
  message?: string
}

export type PaginatedResponse<T> = ApiResponse<T[]> & {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
