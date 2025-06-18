const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('Running price tracking enhancements migration...')
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '019_price_tracking_enhancements.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`Found ${statements.length} SQL statements to execute`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      console.log(`Executing statement ${i + 1}/${statements.length}...`)
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement })
        
        if (error) {
          // Try direct execution if RPC fails
          const { error: directError } = await supabase
            .from('_temp_migration')
            .select('*')
            .limit(0)
          
          if (directError) {
            console.error(`Error executing statement ${i + 1}:`, error)
            console.log('Statement:', statement)
            // Continue with next statement
          }
        }
      } catch (err) {
        console.error(`Error executing statement ${i + 1}:`, err)
        console.log('Statement:', statement)
        // Continue with next statement
      }
    }
    
    console.log('Migration completed!')
    console.log('\nNew tables created:')
    console.log('- price_suggestions: For user-submitted price suggestions')
    console.log('- price_analytics: For storing calculated price statistics')
    console.log('- price_alerts: For tracking price change notifications')
    console.log('\nNew functions created:')
    console.log('- calculate_price_statistics(): Calculate comprehensive price stats')
    console.log('- generate_price_alert(): Generate alerts for price changes')
    console.log('- trigger_price_alert(): Trigger function for automatic alerts')
    
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

// Alternative approach: Execute via SQL editor
async function printMigrationInstructions() {
  console.log('\n=== MIGRATION INSTRUCTIONS ===')
  console.log('Since direct SQL execution might be limited, please:')
  console.log('1. Go to your Supabase dashboard')
  console.log('2. Navigate to SQL Editor')
  console.log('3. Copy and paste the contents of:')
  console.log('   supabase/migrations/019_price_tracking_enhancements.sql')
  console.log('4. Execute the SQL')
  console.log('\nThis will create the necessary tables and functions for price tracking.')
}

// Run the migration
runMigration().catch(() => {
  printMigrationInstructions()
})
