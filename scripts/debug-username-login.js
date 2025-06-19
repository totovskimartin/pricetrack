/**
 * Debug Username Login Script
 * This script helps debug username login issues
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Function to check if input is email
function isEmail(input) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(input);
}

// Function to get email for login (same as in the app)
async function getEmailForLogin(emailOrUsername) {
  if (isEmail(emailOrUsername)) {
    console.log('✓ Input is already an email, returning as-is');
    return emailOrUsername;
  }

  console.log('🔍 Looking up email for username:', emailOrUsername);

  try {
    const { data, error } = await supabase
      .from('users')
      .select('email')
      .eq('username', emailOrUsername)
      .single();

    if (error) {
      console.error('❌ Error looking up user by username:', error);
      if (error.code === 'PGRST116') {
        console.log('❌ Username not found in database');
        return null;
      }
      return null;
    }

    const email = data?.email || null;
    console.log('✓ Found email for username:', email ? 'yes' : 'no');
    return email;
  } catch (error) {
    console.error('❌ Exception in getEmailForLogin:', error);
    return null;
  }
}

async function debugUsernameLogin() {
  console.log('🔍 Debugging Username Login Issues\n');

  try {
    // 1. Check recent users
    console.log('1. Checking recent users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, username, full_name, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    console.log('Recent users:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Full name: ${user.full_name}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('---');
    });

    if (users.length === 0) {
      console.log('❌ No users found in database');
      return;
    }

    // 2. Test username lookup for the most recent user
    const testUser = users[0];
    console.log(`\n2. Testing username lookup for: ${testUser.username}`);
    
    const foundEmail = await getEmailForLogin(testUser.username);
    if (foundEmail) {
      console.log(`✓ Username lookup successful: ${testUser.username} -> ${foundEmail}`);
    } else {
      console.log(`❌ Username lookup failed for: ${testUser.username}`);
    }

    // 3. Test email lookup (should work)
    console.log(`\n3. Testing email lookup for: ${testUser.email}`);
    const emailLookup = await getEmailForLogin(testUser.email);
    if (emailLookup) {
      console.log(`✓ Email lookup successful: ${testUser.email} -> ${emailLookup}`);
    } else {
      console.log(`❌ Email lookup failed for: ${testUser.email}`);
    }

    // 4. Check for username uniqueness issues
    console.log('\n4. Checking for duplicate usernames...');
    const { data: duplicates, error: dupError } = await supabase
      .from('users')
      .select('username, count(*)')
      .not('username', 'is', null)
      .group('username')
      .having('count(*)', 'gt', 1);

    if (dupError) {
      console.error('❌ Error checking duplicates:', dupError);
    } else if (duplicates && duplicates.length > 0) {
      console.log('⚠️  Found duplicate usernames:');
      duplicates.forEach(dup => {
        console.log(`   - "${dup.username}" appears ${dup.count} times`);
      });
    } else {
      console.log('✓ No duplicate usernames found');
    }

  } catch (error) {
    console.error('❌ Debug script failed:', error);
  }
}

debugUsernameLogin();
