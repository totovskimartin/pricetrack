export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string
          full_name: string | null
          first_name: string | null
          last_name: string | null
          avatar_url: string | null
          role: 'user' | 'moderator' | 'admin' | 'super_admin'
          is_active: boolean
          created_at: string
          updated_at: string
          last_login_at: string | null
        }
        Insert: {
          id: string
          email: string
          username: string
          full_name?: string | null
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          role?: 'user' | 'moderator' | 'admin' | 'super_admin'
          is_active?: boolean
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          username?: string
          full_name?: string | null
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          role?: 'user' | 'moderator' | 'admin' | 'super_admin'
          is_active?: boolean
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
        }
      }
      supermarkets: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          website_url: string | null
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          website_url?: string | null
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          website_url?: string | null
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          category: string
          brand: string | null
          image_url: string | null
          barcode: string | null
          unit: string
          is_approved: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          category: string
          brand?: string | null
          image_url?: string | null
          barcode?: string | null
          unit: string
          is_approved?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          category?: string
          brand?: string | null
          image_url?: string | null
          barcode?: string | null
          unit?: string
          is_approved?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      prices: {
        Row: {
          id: string
          product_id: string
          supermarket_id: string
          price_bgn: number
          price_eur: number | null
          is_verified: boolean
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          supermarket_id: string
          price_bgn: number
          price_eur?: number | null
          is_verified?: boolean
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          supermarket_id?: string
          price_bgn?: number
          price_eur?: number | null
          is_verified?: boolean
          created_by?: string
          created_at?: string
        }
      }
      discussions: {
        Row: {
          id: string
          product_id: string
          title: string
          content: string
          is_approved: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          title: string
          content: string
          is_approved?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          title?: string
          content?: string
          is_approved?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      discussion_comments: {
        Row: {
          id: string
          discussion_id: string
          content: string
          parent_id: string | null
          is_approved: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          discussion_id: string
          content: string
          parent_id?: string | null
          is_approved?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          discussion_id?: string
          content?: string
          parent_id?: string | null
          is_approved?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_products: {
        Row: {
          id: string
          user_id: string
          product_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          created_at?: string
        }
      }
      admin_logs: {
        Row: {
          id: string
          admin_id: string
          action: string
          target_type: string
          target_id: string
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          action: string
          target_type: string
          target_id: string
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          action?: string
          target_type?: string
          target_id?: string
          details?: Json | null
          created_at?: string
        }
      }
      price_suggestions: {
        Row: {
          id: string
          product_id: string
          supermarket_id: string
          suggested_price_bgn: number
          suggested_price_eur: number | null
          current_price_bgn: number | null
          notes: string | null
          status: 'pending' | 'approved' | 'rejected' | 'duplicate'
          suggested_by: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          supermarket_id: string
          suggested_price_bgn: number
          suggested_price_eur?: number | null
          current_price_bgn?: number | null
          notes?: string | null
          status?: 'pending' | 'approved' | 'rejected' | 'duplicate'
          suggested_by?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          supermarket_id?: string
          suggested_price_bgn?: number
          suggested_price_eur?: number | null
          current_price_bgn?: number | null
          notes?: string | null
          status?: 'pending' | 'approved' | 'rejected' | 'duplicate'
          suggested_by?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      price_analytics: {
        Row: {
          id: string
          product_id: string
          supermarket_id: string | null
          period_type: 'daily' | 'weekly' | 'monthly'
          period_start: string
          period_end: string
          min_price: number
          max_price: number
          avg_price: number
          price_count: number
          volatility: number | null
          trend_direction: 'up' | 'down' | 'stable' | null
          trend_percentage: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          supermarket_id?: string | null
          period_type: 'daily' | 'weekly' | 'monthly'
          period_start: string
          period_end: string
          min_price: number
          max_price: number
          avg_price: number
          price_count?: number
          volatility?: number | null
          trend_direction?: 'up' | 'down' | 'stable' | null
          trend_percentage?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          supermarket_id?: string | null
          period_type?: 'daily' | 'weekly' | 'monthly'
          period_start?: string
          period_end?: string
          min_price?: number
          max_price?: number
          avg_price?: number
          price_count?: number
          volatility?: number | null
          trend_direction?: 'up' | 'down' | 'stable' | null
          trend_percentage?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      price_alerts: {
        Row: {
          id: string
          user_id: string
          product_id: string
          supermarket_id: string | null
          alert_type: 'price_drop' | 'target_reached' | 'significant_change'
          old_price: number | null
          new_price: number
          target_price: number | null
          percentage_change: number | null
          is_sent: boolean
          sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          supermarket_id?: string | null
          alert_type: 'price_drop' | 'target_reached' | 'significant_change'
          old_price?: number | null
          new_price: number
          target_price?: number | null
          percentage_change?: number | null
          is_sent?: boolean
          sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          supermarket_id?: string | null
          alert_type?: 'price_drop' | 'target_reached' | 'significant_change'
          old_price?: number | null
          new_price?: number
          target_price?: number | null
          percentage_change?: number | null
          is_sent?: boolean
          sent_at?: string | null
          created_at?: string
        }
      }
      admin_notifications: {
        Row: {
          id: string
          type: 'price_suggestion' | 'new_user' | 'new_discussion' | 'new_comment' | 'system_alert'
          title: string
          message: string
          data: Json | null
          target_id: string | null
          target_type: string | null
          is_read: boolean
          created_for_role: 'admin' | 'super_admin' | 'moderator'
          created_at: string
          read_at: string | null
          read_by: string | null
        }
        Insert: {
          id?: string
          type: 'price_suggestion' | 'new_user' | 'new_discussion' | 'new_comment' | 'system_alert'
          title: string
          message: string
          data?: Json | null
          target_id?: string | null
          target_type?: string | null
          is_read?: boolean
          created_for_role?: 'admin' | 'super_admin' | 'moderator'
          created_at?: string
          read_at?: string | null
          read_by?: string | null
        }
        Update: {
          id?: string
          type?: 'price_suggestion' | 'new_user' | 'new_discussion' | 'new_comment' | 'system_alert'
          title?: string
          message?: string
          data?: Json | null
          target_id?: string | null
          target_type?: string | null
          is_read?: boolean
          created_for_role?: 'admin' | 'super_admin' | 'moderator'
          created_at?: string
          read_at?: string | null
          read_by?: string | null
        }
      }
      comment_votes: {
        Row: {
          id: string
          comment_id: string
          user_id: string
          vote_type: 'like' | 'dislike'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          comment_id: string
          user_id: string
          vote_type: 'like' | 'dislike'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          comment_id?: string
          user_id?: string
          vote_type?: 'like' | 'dislike'
          created_at?: string
          updated_at?: string
        }
      }
      user_favorites: {
        Row: {
          id: string
          user_id: string
          product_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          created_at?: string
        }
      }
      user_tracking: {
        Row: {
          id: string
          user_id: string
          product_id: string
          target_price_bgn: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          target_price_bgn?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          target_price_bgn?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      product_comments: {
        Row: {
          id: string
          product_id: string
          user_id: string
          content: string
          likes: number
          dislikes: number
          parent_comment_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          user_id: string
          content: string
          likes?: number
          dislikes?: number
          parent_comment_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          user_id?: string
          content?: string
          likes?: number
          dislikes?: number
          parent_comment_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'user' | 'moderator' | 'admin' | 'super_admin'
    }
  }
}
