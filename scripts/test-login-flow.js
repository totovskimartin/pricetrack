/**
 * Test Login Flow Script
 * This script tests the complete login flow with username and email
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
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 5000);
    });

    const { data, error } = await Promise.race([
      supabase
        .from('users')
        .select('email')
        .eq('username', emailOrUsername)
        .single(),
      timeoutPromise
    ]);

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

// Function to check if user is active
async function isUserActive(emailOrUsername) {
  try {
    let query = supabase.from('users').select('is_active');
    
    if (isEmail(emailOrUsername)) {
      query = query.eq('email', emailOrUsername);
    } else {
      query = query.eq('username', emailOrUsername);
    }
    
    const { data, error } = await query.single();
    
    if (error) {
      console.error('Error checking user status:', error);
      return false;
    }
    
    return data?.is_active === true;
  } catch (error) {
    console.error('Exception checking user status:', error);
    return false;
  }
}

async function testLoginFlow() {
  console.log('🧪 Testing Complete Login Flow\n');

  try {
    // Get a test user
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, username, is_active')
      .eq('is_active', true)
      .limit(1);

    if (usersError || !users || users.length === 0) {
      console.error('❌ No active users found for testing');
      return;
    }

    const testUser = users[0];
    console.log('🎯 Testing with user:');
    console.log(`   Email: ${testUser.email}`);
    console.log(`   Username: ${testUser.username}`);
    console.log(`   Active: ${testUser.is_active}\n`);

    // Test 1: Username to Email Lookup
    console.log('1. Testing username to email lookup...');
    const emailFromUsername = await getEmailForLogin(testUser.username);
    if (emailFromUsername === testUser.email) {
      console.log('✅ Username lookup successful');
    } else {
      console.log('❌ Username lookup failed');
      console.log(`   Expected: ${testUser.email}`);
      console.log(`   Got: ${emailFromUsername}`);
    }

    // Test 2: Email passthrough
    console.log('\n2. Testing email passthrough...');
    const emailFromEmail = await getEmailForLogin(testUser.email);
    if (emailFromEmail === testUser.email) {
      console.log('✅ Email passthrough successful');
    } else {
      console.log('❌ Email passthrough failed');
    }

    // Test 3: User active check with username
    console.log('\n3. Testing user active check with username...');
    const activeByUsername = await isUserActive(testUser.username);
    if (activeByUsername) {
      console.log('✅ User active check with username successful');
    } else {
      console.log('❌ User active check with username failed');
    }

    // Test 4: User active check with email
    console.log('\n4. Testing user active check with email...');
    const activeByEmail = await isUserActive(testUser.email);
    if (activeByEmail) {
      console.log('✅ User active check with email successful');
    } else {
      console.log('❌ User active check with email failed');
    }

    // Test 5: Non-existent username
    console.log('\n5. Testing non-existent username...');
    const nonExistentEmail = await getEmailForLogin('nonexistent_user_12345');
    if (nonExistentEmail === null) {
      console.log('✅ Non-existent username correctly returns null');
    } else {
      console.log('❌ Non-existent username should return null');
    }

    console.log('\n🎉 Login flow tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testLoginFlow();
