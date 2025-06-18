/**
 * Tests for admin email notifications
 * 
 * These tests verify that the email notification system works correctly
 * when price suggestions are submitted.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'

// Mock the supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        in: jest.fn(() => ({
          eq: jest.fn()
        }))
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn()
    }))
  })),
  rpc: jest.fn()
}

// Mock the email service
const mockEmailService = {
  sendAdminPriceSuggestionNotification: jest.fn()
}

jest.mock('@/lib/supabase', () => ({
  supabase: mockSupabase
}))

jest.mock('@/lib/email-notifications', () => ({
  emailService: mockEmailService
}))

import { notifyAdminsOfPriceSuggestion, updateAdminEmailPreferences } from '../admin-email-notifications'

describe('Admin Email Notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('notifyAdminsOfPriceSuggestion', () => {
    const mockSuggestionData = {
      id: 'suggestion-123',
      product_id: 'product-456',
      supermarket_id: 'supermarket-789',
      suggested_price_bgn: 12.99,
      current_price_bgn: 15.99,
      notes: 'Found a better price',
      suggested_by: 'user-123'
    }

    it('should send email notifications to active admins', async () => {
      // Mock admin users
      const mockAdmins = [
        {
          id: 'admin-1',
          email: 'admin1@test.com',
          full_name: 'Admin One',
          notification_preferences: { email_admin_notifications: true }
        },
        {
          id: 'admin-2',
          email: 'admin2@test.com',
          full_name: 'Admin Two',
          notification_preferences: {}
        }
      ]

      // Mock product data
      const mockProduct = {
        name: 'Test Product',
        slug: 'test-product'
      }

      // Mock supermarket data
      const mockSupermarket = {
        name: 'Test Supermarket'
      }

      // Mock user data
      const mockUser = {
        full_name: 'Test User',
        username: 'testuser',
        email: 'user@test.com'
      }

      // Setup mocks
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            in: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({ data: mockAdmins, error: null }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: mockProduct, error: null }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: mockSupermarket, error: null }))
            }))
          }))
        })
        .mockReturnValueOnce({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: mockUser, error: null }))
            }))
          }))
        })

      mockEmailService.sendAdminPriceSuggestionNotification.mockResolvedValue(true)

      const result = await notifyAdminsOfPriceSuggestion(mockSuggestionData)

      expect(result).toBe(true)
      expect(mockEmailService.sendAdminPriceSuggestionNotification).toHaveBeenCalledTimes(2)
      
      // Check first admin notification
      expect(mockEmailService.sendAdminPriceSuggestionNotification).toHaveBeenCalledWith({
        adminEmail: 'admin1@test.com',
        adminName: 'Admin One',
        userName: 'Test User',
        productName: 'Test Product',
        productSlug: 'test-product',
        supermarketName: 'Test Supermarket',
        suggestedPrice: 12.99,
        currentPrice: 15.99,
        notes: 'Found a better price',
        suggestionId: 'suggestion-123',
        productUrl: expect.stringContaining('/bg/products/test-product'),
        adminPanelUrl: expect.stringContaining('/bg/admin/price-suggestions')
      })
    })

    it('should skip admins with email notifications disabled', async () => {
      const mockAdmins = [
        {
          id: 'admin-1',
          email: 'admin1@test.com',
          full_name: 'Admin One',
          notification_preferences: { email_admin_notifications: false }
        },
        {
          id: 'admin-2',
          email: 'admin2@test.com',
          full_name: 'Admin Two',
          notification_preferences: { email_admin_notifications: true }
        }
      ]

      // Setup mocks (simplified for this test)
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: jest.fn(() => ({
              in: jest.fn(() => ({
                eq: jest.fn(() => Promise.resolve({ data: mockAdmins, error: null }))
              })),
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({ 
                  data: { full_name: 'Test User', username: 'testuser', email: 'user@test.com' }, 
                  error: null 
                }))
              }))
            }))
          }
        }
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ 
                data: { name: 'Test', slug: 'test' }, 
                error: null 
              }))
            }))
          }))
        }
      })

      mockEmailService.sendAdminPriceSuggestionNotification.mockResolvedValue(true)

      const result = await notifyAdminsOfPriceSuggestion(mockSuggestionData)

      expect(result).toBe(true)
      // Should only send to admin-2 (admin-1 has notifications disabled)
      expect(mockEmailService.sendAdminPriceSuggestionNotification).toHaveBeenCalledTimes(1)
    })
  })

  describe('updateAdminEmailPreferences', () => {
    it('should update admin email preferences', async () => {
      const userId = 'admin-123'
      const currentPrefs = { some_other_pref: true }

      // Mock current preferences fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ 
              data: { notification_preferences: currentPrefs }, 
              error: null 
            }))
          }))
        }))
      })

      // Mock update
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ error: null }))
        }))
      })

      const result = await updateAdminEmailPreferences(userId, true)

      expect(result).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('users')
    })
  })
})
