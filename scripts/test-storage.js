/**
 * Storage Test Script
 * Run this script to verify your Supabase storage setup is working correctly
 * 
 * Usage: node scripts/test-storage.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please check your .env file and ensure you have:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testStorage() {
  console.log('🔍 Testing Supabase Storage...\n');

  try {
    // Test 1: List buckets
    console.log('1. Testing bucket listing...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('❌ Failed to list buckets:', bucketError.message);
      return;
    }
    
    console.log('✅ Successfully connected to storage');
    console.log('📦 Available buckets:', buckets.map(b => b.name));
    
    // Test 2: Check for images bucket
    const imagesBucket = buckets.find(bucket => bucket.name === 'images');
    if (imagesBucket) {
      console.log('✅ Images bucket found');
      console.log('   - Name:', imagesBucket.name);
      console.log('   - ID:', imagesBucket.id);
      console.log('   - Public:', imagesBucket.public);
    } else {
      console.log('⚠️  Images bucket not found');
      console.log('   Creating images bucket...');
      
      // Create the images bucket
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('images', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        fileSizeLimit: 5242880 // 5MB
      });
      
      if (createError) {
        console.error('❌ Failed to create images bucket:', createError.message);
      } else {
        console.log('✅ Images bucket created successfully');
      }
    }
    
    console.log('\n🎉 Storage test completed successfully!');
    
  } catch (error) {
    console.error('❌ Storage test failed:', error.message);
  }
}

testStorage();
