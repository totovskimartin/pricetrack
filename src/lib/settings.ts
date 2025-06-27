import { supabase } from './supabase'

// Cache for settings to avoid repeated database calls
const settingsCache: Map<string, string> = new Map()
let cacheTimestamp = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function getSetting(key: string): Promise<string | null> {
  // Check cache first
  const now = Date.now()
  if (cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION && settingsCache.has(key)) {
    return settingsCache.get(key) || null
  }

  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .single()

    if (error || !data) {
      console.error('Error fetching setting:', key, error)
      return null
    }

    // Update cache
    settingsCache.set(key, data.value)
    cacheTimestamp = now

    return data.value
  } catch (error) {
    console.error('Error fetching setting:', error)
    return null
  }
}

export async function getBooleanSetting(key: string, defaultValue: boolean = false): Promise<boolean> {
  const value = await getSetting(key)
  if (value === null) return defaultValue
  return value.toLowerCase() === 'true'
}

export async function getNumberSetting(key: string, defaultValue: number = 0): Promise<number> {
  const value = await getSetting(key)
  if (value === null) return defaultValue
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

export async function updateSetting(key: string, value: string, userId?: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('settings')
      .update({ 
        value, 
        updated_at: new Date().toISOString(),
        updated_by: userId 
      })
      .eq('key', key)

    if (error) {
      console.error('Error updating setting:', error)
      return false
    }

    // Update cache
    settingsCache.set(key, value)
    
    return true
  } catch (error) {
    console.error('Error updating setting:', error)
    return false
  }
}

export function clearSettingsCache() {
  settingsCache.clear()
  cacheTimestamp = 0
}

// Predefined setting keys for type safety
export const SETTING_KEYS = {
  DISCUSSIONS_REQUIRE_APPROVAL: 'discussions_require_approval',
  COMMENTS_REQUIRE_APPROVAL: 'comments_require_approval',
  PRODUCTS_REQUIRE_APPROVAL: 'products_require_approval',
  ALLOW_ANONYMOUS_DISCUSSIONS: 'allow_anonymous_discussions',
  ALLOW_ANONYMOUS_COMMENTS: 'allow_anonymous_comments',
  MAX_COMMENT_LENGTH: 'max_comment_length',
  MAX_DISCUSSION_LENGTH: 'max_discussion_length',
  SITE_NAME: 'site_name',
  SITE_DESCRIPTION: 'site_description',
  ENABLE_EMAIL_NOTIFICATIONS: 'enable_email_notifications'
} as const

// Helper functions for common settings
export async function discussionsRequireApproval(): Promise<boolean> {
  return getBooleanSetting(SETTING_KEYS.DISCUSSIONS_REQUIRE_APPROVAL, true)
}

export async function commentsRequireApproval(): Promise<boolean> {
  return getBooleanSetting(SETTING_KEYS.COMMENTS_REQUIRE_APPROVAL, true)
}

export async function productsRequireApproval(): Promise<boolean> {
  return getBooleanSetting(SETTING_KEYS.PRODUCTS_REQUIRE_APPROVAL, true)
}

export async function allowAnonymousDiscussions(): Promise<boolean> {
  return getBooleanSetting(SETTING_KEYS.ALLOW_ANONYMOUS_DISCUSSIONS, false)
}

export async function allowAnonymousComments(): Promise<boolean> {
  return getBooleanSetting(SETTING_KEYS.ALLOW_ANONYMOUS_COMMENTS, false)
}

export async function getMaxCommentLength(): Promise<number> {
  return getNumberSetting(SETTING_KEYS.MAX_COMMENT_LENGTH, 2000)
}

export async function getMaxDiscussionLength(): Promise<number> {
  return getNumberSetting(SETTING_KEYS.MAX_DISCUSSION_LENGTH, 10000)
}
