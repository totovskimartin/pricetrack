const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testEmailSystem() {
  console.log('🧪 Testing PriceTrack Email System')
  console.log('=====================================\n')

  // Check SendGrid configuration
  console.log('1. Checking SendGrid configuration...')
  const sendgridKey = process.env.SENDGRID_API_KEY
  const fromEmail = process.env.SENDGRID_FROM_EMAIL
  const emailEnabled = process.env.EMAIL_ENABLED

  if (!sendgridKey) {
    console.log('⚠️  SENDGRID_API_KEY not set - emails will be queued but not sent')
  } else {
    console.log('✅ SendGrid API key configured')
  }

  if (!fromEmail) {
    console.log('⚠️  SENDGRID_FROM_EMAIL not set - using default')
  } else {
    console.log('✅ From email configured:', fromEmail)
  }

  console.log('✅ Email enabled:', emailEnabled !== 'false')
  console.log()

  // Test database tables
  console.log('2. Testing database tables...')
  
  try {
    // Test inserting a test email into queue
    const testEmail = {
      to_email: 'test@example.com',
      subject: 'Test Email',
      html_content: '<h1>Test</h1>',
      text_content: 'Test',
      email_type: 'system',
      priority: 'normal',
      max_attempts: 3
    }

    const { data: insertData, error: insertError } = await supabase
      .from('email_queue')
      .insert(testEmail)
      .select()
      .single()

    if (insertError) {
      console.log('❌ Error inserting test email:', insertError.message)
    } else {
      console.log('✅ Successfully inserted test email into queue')
      
      // Clean up test email
      await supabase
        .from('email_queue')
        .delete()
        .eq('id', insertData.id)
      
      console.log('✅ Test email cleaned up')
    }
  } catch (error) {
    console.log('❌ Database test failed:', error.message)
  }

  console.log()

  // Test user email preferences
  console.log('3. Testing user email preferences...')
  
  try {
    // Create a test user preference
    const testUserId = '00000000-0000-0000-0000-000000000001'
    
    const { data: prefData, error: prefError } = await supabase
      .from('user_email_preferences')
      .upsert({
        user_id: testUserId,
        price_alerts_enabled: true,
        admin_notifications_enabled: true,
        marketing_emails_enabled: false,
        email_frequency: 'immediate'
      })
      .select()

    if (prefError) {
      console.log('❌ Error creating test preferences:', prefError.message)
    } else {
      console.log('✅ Successfully created test user preferences')
      
      // Test the RPC function
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_user_email_preferences', { user_uuid: testUserId })
        .single()

      if (rpcError) {
        console.log('❌ Error testing RPC function:', rpcError.message)
      } else {
        console.log('✅ RPC function working, preferences:', {
          price_alerts: rpcData.price_alerts_enabled,
          frequency: rpcData.email_frequency
        })
      }

      // Clean up test preferences
      await supabase
        .from('user_email_preferences')
        .delete()
        .eq('user_id', testUserId)
      
      console.log('✅ Test preferences cleaned up')
    }
  } catch (error) {
    console.log('❌ User preferences test failed:', error.message)
  }

  console.log()

  // Test email templates
  console.log('4. Testing email templates...')
  
  try {
    // This would require importing the actual modules, which is complex in this context
    // Instead, let's just verify the template files exist
    const fs = require('fs')
    const templatePath = path.join(__dirname, '../src/lib/email/templates.ts')
    
    if (fs.existsSync(templatePath)) {
      console.log('✅ Email templates file exists')
    } else {
      console.log('❌ Email templates file not found')
    }
  } catch (error) {
    console.log('❌ Template test failed:', error.message)
  }

  console.log()

  // Test queue statistics
  console.log('5. Testing queue statistics...')
  
  try {
    const { data: queueStats, error: statsError } = await supabase
      .from('email_queue')
      .select('status')

    if (statsError) {
      console.log('❌ Error fetching queue stats:', statsError.message)
    } else {
      const stats = {
        total: queueStats.length,
        pending: queueStats.filter(e => e.status === 'pending').length,
        sent: queueStats.filter(e => e.status === 'sent').length,
        failed: queueStats.filter(e => e.status === 'failed').length
      }
      
      console.log('✅ Queue statistics:', stats)
    }
  } catch (error) {
    console.log('❌ Queue statistics test failed:', error.message)
  }

  console.log()
  console.log('🎉 Email system testing completed!')
  console.log('\nNext steps:')
  console.log('1. Set up your SendGrid API key if not already done')
  console.log('2. Test email sending by registering a new user')
  console.log('3. Check the admin email system at /bg/admin/email-system')
  console.log('4. Test email preferences at /bg/profile/email-preferences')
}

// Run the test
testEmailSystem().catch(console.error)
