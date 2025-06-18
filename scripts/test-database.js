/**
 * Database Connection Test Script
 * Run this script to verify your Supabase setup is working correctly
 * 
 * Usage: node scripts/test-database.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please check your .env.local file and ensure you have:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDatabase() {
  console.log('🧪 Testing Supabase Database Connection...\n');

  try {
    // Test 1: Check connection
    console.log('1️⃣ Testing database connection...');
    const { data, error } = await supabase
      .from('supermarkets')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      return;
    }
    console.log('✅ Database connection successful');

    // Test 2: Check supermarkets
    console.log('\n2️⃣ Checking supermarkets data...');
    const { data: supermarkets, error: supermarketsError } = await supabase
      .from('supermarkets')
      .select('name, slug')
      .eq('is_active', true);
    
    if (supermarketsError) {
      console.error('❌ Supermarkets query failed:', supermarketsError.message);
      return;
    }
    
    console.log(`✅ Found ${supermarkets.length} active supermarkets:`);
    supermarkets.forEach(s => console.log(`   - ${s.name} (${s.slug})`));

    // Test 3: Check products
    console.log('\n3️⃣ Checking products data...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('name, category, is_approved')
      .limit(5);
    
    if (productsError) {
      console.error('❌ Products query failed:', productsError.message);
      return;
    }
    
    console.log(`✅ Found ${products.length} sample products:`);
    products.forEach(p => console.log(`   - ${p.name} (${p.category}) ${p.is_approved ? '✓' : '⏳'}`));

    // Test 4: Check prices
    console.log('\n4️⃣ Checking prices data...');
    const { data: prices, error: pricesError } = await supabase
      .from('prices')
      .select('price_bgn, price_eur')
      .limit(5);
    
    if (pricesError) {
      console.error('❌ Prices query failed:', pricesError.message);
      return;
    }
    
    console.log(`✅ Found ${prices.length} sample prices:`);
    prices.forEach(p => console.log(`   - ${p.price_bgn} лв. / ${p.price_eur} €`));

    // Test 5: Check functions
    console.log('\n5️⃣ Testing database functions...');
    const { data: stats, error: statsError } = await supabase
      .rpc('get_admin_dashboard_stats');
    
    if (statsError) {
      console.error('❌ Function test failed:', statsError.message);
      return;
    }
    
    console.log('✅ Database functions working:');
    console.log(`   - Total products: ${stats.total_products}`);
    console.log(`   - Approved products: ${stats.approved_products}`);
    console.log(`   - Total supermarkets: ${stats.total_supermarkets}`);
    console.log(`   - Total prices: ${stats.total_prices}`);

    // Test 6: Check views
    console.log('\n6️⃣ Testing database views...');
    const { data: trending, error: trendingError } = await supabase
      .from('trending_products')
      .select('name, trend_score')
      .limit(3);
    
    if (trendingError) {
      console.error('❌ Views test failed:', trendingError.message);
      return;
    }
    
    console.log('✅ Database views working:');
    trending.forEach(p => console.log(`   - ${p.name} (score: ${p.trend_score})`));

    console.log('\n🎉 All database tests passed! Your Supabase setup is ready.');
    console.log('\nNext steps:');
    console.log('1. Update your .env.local with the correct Supabase credentials');
    console.log('2. Start your Next.js development server: npm run dev');
    console.log('3. Test user registration and authentication');
    console.log('4. Create your first admin user');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the test
testDatabase();
