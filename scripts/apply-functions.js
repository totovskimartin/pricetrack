#!/usr/bin/env node

/**
 * Apply the notification functions and trigger
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyFunctions() {
  console.log('🔧 Applying notification functions and trigger...\n')
  console.log('Supabase URL:', supabaseUrl ? 'Found' : 'Missing')
  console.log('Service Key:', supabaseServiceKey ? 'Found' : 'Missing')

  try {
    // 1. Create the create_admin_notification function
    console.log('1. Creating create_admin_notification function...')
    const createNotificationFunction = `
      CREATE OR REPLACE FUNCTION create_admin_notification(
          p_type TEXT,
          p_title TEXT,
          p_message TEXT,
          p_data JSONB DEFAULT NULL,
          p_target_id UUID DEFAULT NULL,
          p_target_type TEXT DEFAULT NULL,
          p_created_for_role TEXT DEFAULT 'admin'
      )
      RETURNS UUID AS $$
      DECLARE
          notification_id UUID;
      BEGIN
          INSERT INTO public.admin_notifications (
              type,
              title,
              message,
              data,
              target_id,
              target_type,
              created_for_role
          ) VALUES (
              p_type,
              p_title,
              p_message,
              p_data,
              p_target_id,
              p_target_type,
              p_created_for_role
          ) RETURNING id INTO notification_id;

          RETURN notification_id;
      END;
      $$ LANGUAGE plpgsql;
    `

    const { error: funcError } = await supabase.rpc('sql', { query: createNotificationFunction })
    if (funcError) {
      console.error('❌ Error creating function:', funcError)
      return
    }
    console.log('✅ create_admin_notification function created')

    // 2. Create the trigger function
    console.log('2. Creating trigger function...')
    const triggerFunction = `
      CREATE OR REPLACE FUNCTION notify_admin_price_suggestion()
      RETURNS TRIGGER AS $$
      DECLARE
          product_name TEXT;
          user_name TEXT;
          supermarket_name TEXT;
      BEGIN
          -- Get related information
          SELECT name INTO product_name
          FROM public.products
          WHERE id = NEW.product_id;

          SELECT COALESCE(full_name, username, email) INTO user_name
          FROM public.users
          WHERE id = NEW.suggested_by;

          SELECT name INTO supermarket_name
          FROM public.supermarkets
          WHERE id = NEW.supermarket_id;

          -- Create notification for admins
          PERFORM create_admin_notification(
              'price_suggestion',
              'Ново предложение за цена',
              'Потребител ' || COALESCE(user_name, 'Неизвестен') || ' предложи цена ' || NEW.suggested_price_bgn::text || ' лв. за "' || COALESCE(product_name, 'Неизвестен продукт') || '" в ' || COALESCE(supermarket_name, 'Неизвестен магазин'),
              jsonb_build_object(
                  'price_suggestion_id', NEW.id,
                  'product_id', NEW.product_id,
                  'product_name', product_name,
                  'supermarket_id', NEW.supermarket_id,
                  'supermarket_name', supermarket_name,
                  'suggested_price', NEW.suggested_price_bgn,
                  'current_price', NEW.current_price_bgn,
                  'user_id', NEW.suggested_by,
                  'user_name', user_name
              ),
              NEW.id,
              'price_suggestion',
              'admin'
          );

          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `

    const { error: triggerFuncError } = await supabase.rpc('sql', { query: triggerFunction })
    if (triggerFuncError) {
      console.error('❌ Error creating trigger function:', triggerFuncError)
      return
    }
    console.log('✅ notify_admin_price_suggestion function created')

    // 3. Create the trigger
    console.log('3. Creating trigger...')
    const trigger = `
      DROP TRIGGER IF EXISTS price_suggestion_notification_trigger ON public.price_suggestions;
      CREATE TRIGGER price_suggestion_notification_trigger
          AFTER INSERT ON public.price_suggestions
          FOR EACH ROW EXECUTE FUNCTION notify_admin_price_suggestion();
    `

    const { error: triggerError } = await supabase.rpc('sql', { query: trigger })
    if (triggerError) {
      console.error('❌ Error creating trigger:', triggerError)
      return
    }
    console.log('✅ price_suggestion_notification_trigger created')

    console.log('\n🎉 Admin notifications trigger fixed successfully!')

    // Test the trigger
    console.log('\n🧪 Testing the trigger...')
    await testTrigger()

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

async function testTrigger() {
  try {
    // Get test data
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
      // Create a test price suggestion
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
        return
      }

      console.log('✅ Test price suggestion created:', testSuggestion.id)
      
      // Wait a moment for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Check if notification was created
      const { data: triggerNotifs } = await supabase
        .from('admin_notifications')
        .select('*')
        .eq('type', 'price_suggestion')
        .eq('target_id', testSuggestion.id)
      
      if (triggerNotifs && triggerNotifs.length > 0) {
        console.log('🎉 SUCCESS! Trigger created notification:', triggerNotifs[0].title)
        
        // Clean up
        await supabase
          .from('admin_notifications')
          .delete()
          .eq('id', triggerNotifs[0].id)
      } else {
        console.log('❌ FAILED! Trigger did NOT create notification')
      }
      
      // Clean up test suggestion
      await supabase
        .from('price_suggestions')
        .delete()
        .eq('id', testSuggestion.id)
      console.log('✅ Test data cleaned up')
    } else {
      console.log('⚠️  Cannot test trigger - missing test data')
    }
  } catch (error) {
    console.error('❌ Error testing trigger:', error)
  }
}

// Run the script
applyFunctions()
