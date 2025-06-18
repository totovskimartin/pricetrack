#!/usr/bin/env node

/**
 * Test script to verify admin notifications are working
 * This script will test the price suggestion notification trigger
 */

const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Supabase URL:', supabaseUrl ? 'Found' : 'Missing')
console.log('Service Key:', supabaseServiceKey ? 'Found' : 'Missing')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testAdminNotifications() {
  console.log('🔍 Testing admin notification system...\n')

  try {
    // 1. Check if admin_notifications table exists and has data
    console.log('1. Checking admin_notifications table...')
    const { data: notifications, error: notifError } = await supabase
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (notifError) {
      console.error('❌ Error querying admin_notifications:', notifError)
      return
    }

    console.log(`✅ Found ${notifications.length} admin notifications`)
    if (notifications.length > 0) {
      console.log('Recent notifications:')
      notifications.forEach(n => {
        console.log(`  - ${n.type}: ${n.title} (${n.is_read ? 'read' : 'unread'})`)
      })
    }
    console.log()

    // 2. Check if price_suggestions table exists and has data
    console.log('2. Checking price_suggestions table...')
    const { data: suggestions, error: suggError } = await supabase
      .from('price_suggestions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (suggError) {
      console.error('❌ Error querying price_suggestions:', suggError)
      return
    }

    console.log(`✅ Found ${suggestions.length} price suggestions`)
    if (suggestions.length > 0) {
      console.log('Recent suggestions:')
      suggestions.forEach(s => {
        console.log(`  - Product: ${s.product_id}, Price: ${s.suggested_price_bgn} BGN, Status: ${s.status}`)
      })
    }
    console.log()

    // 3. Check if trigger function exists
    console.log('3. Checking if trigger function exists...')
    const { data: functions, error: funcError } = await supabase
      .rpc('sql', {
        query: `
          SELECT proname, prosrc
          FROM pg_proc
          WHERE proname = 'notify_admin_price_suggestion'
        `
      })

    if (funcError) {
      console.error('❌ Error checking trigger function:', funcError)
    } else if (functions && functions.length > 0) {
      console.log('✅ Trigger function notify_admin_price_suggestion exists')
    } else {
      console.log('❌ Trigger function notify_admin_price_suggestion NOT found')
    }
    console.log()

    // 4. Check if the trigger exists
    console.log('4. Checking if trigger exists...')
    const { data: triggers, error: trigError } = await supabase
      .rpc('sql', {
        query: `
          SELECT trigger_name, event_manipulation, action_statement
          FROM information_schema.triggers
          WHERE trigger_name = 'price_suggestion_notification_trigger'
        `
      })

    if (trigError) {
      console.error('❌ Error checking trigger:', trigError)
    } else if (triggers && triggers.length > 0) {
      console.log('✅ Trigger price_suggestion_notification_trigger exists')
    } else {
      console.log('❌ Trigger price_suggestion_notification_trigger NOT found')
    }
    console.log()

    // 5. Test creating a notification manually
    console.log('5. Testing manual notification creation...')
    const { data: testNotif, error: testError } = await supabase
      .from('admin_notifications')
      .insert({
        type: 'system_alert',
        title: 'Test Notification',
        message: 'This is a test notification to verify the system works',
        created_for_role: 'admin'
      })
      .select()
      .single()

    if (testError) {
      console.error('❌ Error creating test notification:', testError)
    } else {
      console.log('✅ Test notification created successfully:', testNotif.id)

      // Clean up test notification
      await supabase
        .from('admin_notifications')
        .delete()
        .eq('id', testNotif.id)
      console.log('✅ Test notification cleaned up')
    }
    console.log()

    // 6. Test the trigger by creating a price suggestion
    console.log('6. Testing price suggestion trigger...')

    // First, get a test product and supermarket
    const { data: products } = await supabase
      .from('products')
      .select('id')
      .limit(1)

    const { data: supermarkets } = await supabase
      .from('supermarkets')
      .select('id')
      .limit(1)

    const { data: users } = await supabase
      .from('users')
      .select('id')
      .limit(1)

    if (products?.length > 0 && supermarkets?.length > 0 && users?.length > 0) {
      const { data: testSuggestion, error: suggError } = await supabase
        .from('price_suggestions')
        .insert({
          product_id: products[0].id,
          supermarket_id: supermarkets[0].id,
          suggested_price_bgn: 5.99,
          current_price_bgn: 6.99,
          notes: 'Test suggestion to verify trigger',
          suggested_by: users[0].id
        })
        .select()
        .single()

      if (suggError) {
        console.error('❌ Error creating test price suggestion:', suggError)
      } else {
        console.log('✅ Test price suggestion created:', testSuggestion.id)

        // Wait a moment for trigger to execute
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Check if notification was created
        const { data: triggerNotifs } = await supabase
          .from('admin_notifications')
          .select('*')
          .eq('type', 'price_suggestion')
          .eq('target_id', testSuggestion.id)

        if (triggerNotifs && triggerNotifs.length > 0) {
          console.log('✅ Trigger created notification successfully!')

          // Clean up
          await supabase
            .from('admin_notifications')
            .delete()
            .eq('id', triggerNotifs[0].id)
        } else {
          console.log('❌ Trigger did NOT create notification')
        }

        // Clean up test suggestion
        await supabase
          .from('price_suggestions')
          .delete()
          .eq('id', testSuggestion.id)
        console.log('✅ Test price suggestion cleaned up')
      }
    } else {
      console.log('⚠️  Cannot test trigger - missing test data (products, supermarkets, or users)')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the test
testAdminNotifications()
