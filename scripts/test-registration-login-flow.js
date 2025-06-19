/**
 * Test Registration and Login Flow
 * This script tests the complete flow: register a user, then test login with both username and email
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

// Admin client for cleanup and verification
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

// Regular client for testing user operations (like the app uses)
const userClient = createClient(supabaseUrl, supabaseAnonKey);

// Test user data
const testUser = {
  email: `test_user_${Date.now()}@example.com`,
  username: `testuser${Date.now()}`,
  password: 'testpassword123'
};

// Function to check if input is email
function isEmail(input) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(input);
}

// Function to get email for login (replicated from app)
async function getEmailForLogin(emailOrUsername) {
  if (isEmail(emailOrUsername)) {
    console.log('   ✓ Input is already an email, returning as-is');
    return emailOrUsername;
  }

  console.log('   🔍 Looking up email for username:', emailOrUsername);

  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 5000);
    });

    const { data, error } = await Promise.race([
      userClient
        .from('users')
        .select('email')
        .eq('username', emailOrUsername)
        .single(),
      timeoutPromise
    ]);

    if (error) {
      console.error('   ❌ Error looking up user by username:', error.message);
      if (error.code === 'PGRST116') {
        console.log('   ❌ Username not found in database');
        return null;
      }
      return null;
    }

    const email = data?.email || null;
    console.log('   ✓ Found email for username:', email ? 'yes' : 'no');
    return email;
  } catch (error) {
    console.error('   ❌ Exception in getEmailForLogin:', error.message);
    return null;
  }
}

// Function to check if user is active
async function isUserActive(emailOrUsername) {
  try {
    let query = userClient.from('users').select('is_active');
    
    if (isEmail(emailOrUsername)) {
      query = query.eq('email', emailOrUsername);
    } else {
      query = query.eq('username', emailOrUsername);
    }
    
    const { data, error } = await query.single();
    
    if (error) {
      console.error('   ❌ Error checking user status:', error.message);
      return false;
    }
    
    return data?.is_active === true;
  } catch (error) {
    console.error('   ❌ Exception checking user status:', error.message);
    return false;
  }
}

// Simulate the login process from the app
async function simulateLogin(emailOrUsername, password) {
  console.log(`   🔐 Attempting login with: ${emailOrUsername}`);
  
  try {
    // Step 1: Get the email address
    const email = await getEmailForLogin(emailOrUsername);
    if (!email) {
      console.log('   ❌ Could not find email for input');
      return { success: false, error: 'User not found' };
    }

    // Step 2: Check if user is active
    const userActive = await isUserActive(emailOrUsername);
    if (!userActive) {
      console.log('   ❌ User is not active');
      return { success: false, error: 'Account disabled' };
    }

    // Step 3: Attempt Supabase auth
    console.log('   🔑 Attempting Supabase auth with email:', email);
    const { data, error } = await userClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log('   ❌ Supabase auth error:', error.message);
      return { success: false, error: error.message };
    }

    if (data.user) {
      console.log('   ✅ Login successful!');
      return { success: true, user: data.user };
    } else {
      console.log('   ❌ No user in auth response');
      return { success: false, error: 'No user returned' };
    }
  } catch (err) {
    console.log('   ❌ Login exception:', err.message);
    return { success: false, error: err.message };
  }
}

async function testRegistrationLoginFlow() {
  console.log('🧪 Testing Registration and Login Flow\n');
  console.log('Test user data:');
  console.log(`   Email: ${testUser.email}`);
  console.log(`   Username: ${testUser.username}`);
  console.log(`   Password: ${testUser.password}\n`);

  let testUserId = null;

  try {
    // Step 1: Register the user
    console.log('1. 📝 Registering test user...');
    const { data: regData, error: regError } = await userClient.auth.signUp({
      email: testUser.email,
      password: testUser.password,
      options: {
        data: {
          username: testUser.username,
          first_name: null,
          last_name: null,
          full_name: null,
        }
      }
    });

    if (regError) {
      console.error('   ❌ Registration failed:', regError.message);
      return;
    }

    if (!regData.user) {
      console.error('   ❌ No user returned from registration');
      return;
    }

    testUserId = regData.user.id;
    console.log('   ✅ Registration successful, user ID:', testUserId);

    // Step 2: Wait a moment for database triggers to complete
    console.log('   ⏳ Waiting for database triggers to complete...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Verify user was created in database
    console.log('\n2. 🔍 Verifying user in database...');
    const { data: dbUser, error: dbError } = await adminClient
      .from('users')
      .select('id, email, username, is_active')
      .eq('id', testUserId)
      .single();

    if (dbError) {
      console.error('   ❌ Error fetching user from database:', dbError.message);
      return;
    }

    console.log('   ✅ User found in database:');
    console.log(`      Email: ${dbUser.email}`);
    console.log(`      Username: ${dbUser.username}`);
    console.log(`      Active: ${dbUser.is_active}`);

    // Verify the username matches what we provided
    if (dbUser.username !== testUser.username) {
      console.log(`   ⚠️  Username mismatch! Expected: ${testUser.username}, Got: ${dbUser.username}`);
    } else {
      console.log('   ✅ Username matches what was provided during registration');
    }

    // Step 4: Test login with email
    console.log('\n3. 🔐 Testing login with email...');
    const emailLoginResult = await simulateLogin(testUser.email, testUser.password);
    if (emailLoginResult.success) {
      console.log('   ✅ Email login successful!');
      // Sign out
      await userClient.auth.signOut();
    } else {
      console.log('   ❌ Email login failed:', emailLoginResult.error);
    }

    // Step 5: Test login with username
    console.log('\n4. 🔐 Testing login with username...');
    const usernameLoginResult = await simulateLogin(testUser.username, testUser.password);
    if (usernameLoginResult.success) {
      console.log('   ✅ Username login successful!');
      // Sign out
      await userClient.auth.signOut();
    } else {
      console.log('   ❌ Username login failed:', usernameLoginResult.error);
    }

    // Summary
    console.log('\n📊 Test Results Summary:');
    console.log(`   Registration: ✅ Success`);
    console.log(`   Email Login: ${emailLoginResult.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`   Username Login: ${usernameLoginResult.success ? '✅ Success' : '❌ Failed'}`);

    if (emailLoginResult.success && usernameLoginResult.success) {
      console.log('\n🎉 All tests passed! Users can login with both email and username.');
    } else {
      console.log('\n⚠️  Some tests failed. Investigation needed.');
    }

  } catch (error) {
    console.error('❌ Test failed with exception:', error.message);
  } finally {
    // Cleanup: Delete the test user
    if (testUserId) {
      console.log('\n🧹 Cleaning up test user...');
      try {
        const { error: deleteError } = await adminClient
          .from('users')
          .delete()
          .eq('id', testUserId);
        
        if (deleteError) {
          console.log('   ⚠️  Could not delete test user from database:', deleteError.message);
        } else {
          console.log('   ✅ Test user cleaned up successfully');
        }
      } catch (cleanupError) {
        console.log('   ⚠️  Cleanup error:', cleanupError.message);
      }
    }
  }
}

testRegistrationLoginFlow();
