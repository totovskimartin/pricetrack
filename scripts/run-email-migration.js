const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runEmailMigration() {
  try {
    console.log('🚀 Running email queue migration...')

    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/025_email_queue.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    })

    if (error) {
      // If exec_sql doesn't exist, try direct execution
      console.log('Trying direct SQL execution...')
      
      // Split the SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

      for (const statement of statements) {
        if (statement.trim()) {
          console.log(`Executing: ${statement.substring(0, 50)}...`)
          const { error: stmtError } = await supabase.rpc('exec', { sql: statement })
          
          if (stmtError) {
            console.error(`❌ Error executing statement: ${stmtError.message}`)
            console.error(`Statement: ${statement}`)
          }
        }
      }
    }

    console.log('✅ Email queue migration completed successfully!')

    // Verify tables were created
    console.log('🔍 Verifying email queue tables...')
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['email_queue', 'email_stats', 'user_email_preferences'])

    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError.message)
    } else {
      const tableNames = tables.map(t => t.table_name)
      console.log('📋 Created tables:', tableNames)
      
      if (tableNames.includes('email_queue')) {
        console.log('✅ email_queue table created')
      }
      if (tableNames.includes('email_stats')) {
        console.log('✅ email_stats table created')
      }
      if (tableNames.includes('user_email_preferences')) {
        console.log('✅ user_email_preferences table created')
      }
    }

    console.log('\n🎉 Email system setup complete!')
    console.log('\nNext steps:')
    console.log('1. Set your SendGrid API key in .env.local:')
    console.log('   SENDGRID_API_KEY=your_sendgrid_api_key_here')
    console.log('2. Configure your sender email:')
    console.log('   SENDGRID_FROM_EMAIL=noreply@yourdomain.com')
    console.log('3. Test the email system by registering a new user')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

// Run the migration
runEmailMigration()
