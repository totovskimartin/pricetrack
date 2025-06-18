// Script to set a user as admin
// Usage: node scripts/set-admin.js <user-email> <role>
// Example: node scripts/set-admin.js admin@example.com super_admin

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setUserRole(email, role) {
  try {
    // Valid roles
    const validRoles = ['user', 'moderator', 'admin', 'super_admin']
    if (!validRoles.includes(role)) {
      console.error(`Invalid role: ${role}. Valid roles are: ${validRoles.join(', ')}`)
      return
    }

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', email)
      .single()

    if (userError || !user) {
      console.error(`User not found: ${email}`)
      return
    }

    // Update user role
    const { error: updateError } = await supabase
      .from('users')
      .update({ role })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating user role:', updateError)
      return
    }

    console.log(`✅ Successfully updated user ${email} role from ${user.role} to ${role}`)
  } catch (error) {
    console.error('Error:', error)
  }
}

// Get command line arguments
const args = process.argv.slice(2)
if (args.length !== 2) {
  console.log('Usage: node scripts/set-admin.js <user-email> <role>')
  console.log('Example: node scripts/set-admin.js admin@example.com super_admin')
  console.log('Valid roles: user, moderator, admin, super_admin')
  process.exit(1)
}

const [email, role] = args
setUserRole(email, role)
