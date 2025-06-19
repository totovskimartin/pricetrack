/**
 * Comprehensive Username Test
 * Tests various username formats to ensure they work correctly
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const adminClient = createClient(supabaseUrl, supabaseServiceKey);
const userClient = createClient(supabaseUrl, supabaseAnonKey);

// Test cases with different username formats
const testCases = [
  {
    name: 'Simple alphanumeric',
    username: 'user123',
    email: 'user123@test.com',
    shouldWork: true
  },
  {
    name: 'With underscores',
    username: 'user_name_123',
    email: 'username123@test.com',
    shouldWork: true
  },
  {
    name: 'Mixed case',
    username: 'UserName123',
    email: 'mixedcase@test.com',
    shouldWork: true
  },
  {
    name: 'Numbers only',
    username: '123456',
    email: 'numbers@test.com',
    shouldWork: true
  },
  {
    name: 'Long username',
    username: 'verylongusernamethatisvalid',
    email: 'longuser@test.com',
    shouldWork: true
  }
];

function isEmail(input) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(input);
}

async function getEmailForLogin(emailOrUsername) {
  if (isEmail(emailOrUsername)) {
    return emailOrUsername;
  }

  try {
    const { data, error } = await userClient
      .from('users')
      .select('email')
      .eq('username', emailOrUsername)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      return null;
    }

    return data?.email || null;
  } catch (error) {
    return null;
  }
}

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
      return false;
    }
    
    return data?.is_active === true;
  } catch (error) {
    return false;
  }
}

async function simulateLogin(emailOrUsername, password) {
  try {
    const email = await getEmailForLogin(emailOrUsername);
    if (!email) {
      return { success: false, error: 'User not found' };
    }

    const userActive = await isUserActive(emailOrUsername);
    if (!userActive) {
      return { success: false, error: 'Account disabled' };
    }

    const { data, error } = await userClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data.user) {
      return { success: true, user: data.user };
    } else {
      return { success: false, error: 'No user returned' };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function testUsernameFormat(testCase) {
  const timestamp = Date.now();
  const testUser = {
    email: `${testCase.email.split('@')[0]}_${timestamp}@${testCase.email.split('@')[1]}`,
    username: `${testCase.username}_${timestamp}`,
    password: 'testpassword123'
  };

  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log(`   Username: ${testUser.username}`);
  console.log(`   Email: ${testUser.email}`);

  let testUserId = null;

  try {
    // Register user
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
      console.log(`   ❌ Registration failed: ${regError.message}`);
      return { success: false, error: regError.message };
    }

    testUserId = regData.user.id;
    console.log('   ✅ Registration successful');

    // Wait for triggers
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Verify user in database
    const { data: dbUser, error: dbError } = await adminClient
      .from('users')
      .select('id, email, username, is_active')
      .eq('id', testUserId)
      .single();

    if (dbError) {
      console.log(`   ❌ Database verification failed: ${dbError.message}`);
      return { success: false, error: dbError.message };
    }

    // Check if username was preserved
    if (dbUser.username !== testUser.username) {
      console.log(`   ⚠️  Username mismatch! Expected: ${testUser.username}, Got: ${dbUser.username}`);
      return { success: false, error: 'Username not preserved' };
    }

    console.log('   ✅ Username preserved correctly');

    // Test email login
    const emailLoginResult = await simulateLogin(testUser.email, testUser.password);
    if (!emailLoginResult.success) {
      console.log(`   ❌ Email login failed: ${emailLoginResult.error}`);
      return { success: false, error: 'Email login failed' };
    }
    await userClient.auth.signOut();
    console.log('   ✅ Email login successful');

    // Test username login
    const usernameLoginResult = await simulateLogin(testUser.username, testUser.password);
    if (!usernameLoginResult.success) {
      console.log(`   ❌ Username login failed: ${usernameLoginResult.error}`);
      return { success: false, error: 'Username login failed' };
    }
    await userClient.auth.signOut();
    console.log('   ✅ Username login successful');

    return { success: true };

  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    // Cleanup
    if (testUserId) {
      try {
        await adminClient.from('users').delete().eq('id', testUserId);
      } catch (cleanupError) {
        console.log(`   ⚠️  Cleanup failed: ${cleanupError.message}`);
      }
    }
  }
}

async function runComprehensiveTest() {
  console.log('🧪 Running Comprehensive Username Tests\n');
  console.log('=' .repeat(50));

  const results = [];

  for (const testCase of testCases) {
    const result = await testUsernameFormat(testCase);
    results.push({
      name: testCase.name,
      expected: testCase.shouldWork,
      actual: result.success,
      error: result.error
    });
  }

  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 Test Results Summary:');
  console.log('=' .repeat(50));

  let passed = 0;
  let failed = 0;

  results.forEach(result => {
    const status = result.actual === result.expected ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.name}`);
    if (result.actual !== result.expected) {
      console.log(`     Expected: ${result.expected ? 'Success' : 'Failure'}`);
      console.log(`     Actual: ${result.actual ? 'Success' : 'Failure'}`);
      if (result.error) {
        console.log(`     Error: ${result.error}`);
      }
      failed++;
    } else {
      passed++;
    }
  });

  console.log('\n' + '=' .repeat(50));
  console.log(`📈 Overall Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed! Username registration and login is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please review the issues above.');
  }
}

runComprehensiveTest();
