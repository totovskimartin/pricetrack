#!/usr/bin/env node

/**
 * Apply the admin notifications migration
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

async function applyMigration() {
  console.log('🔄 Applying admin notifications migration...\n')

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '020_admin_notifications.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('📄 Migration file loaded')
    console.log('📝 Executing SQL...')

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    })

    if (error) {
      console.error('❌ Migration failed:', error)
      return
    }

    console.log('✅ Migration applied successfully!')

    // Test if the table was created
    const { data: testData, error: testError } = await supabase
      .from('admin_notifications')
      .select('count(*)')
      .limit(1)

    if (testError) {
      console.error('❌ Table verification failed:', testError)
    } else {
      console.log('✅ admin_notifications table is accessible')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the migration
applyMigration()
