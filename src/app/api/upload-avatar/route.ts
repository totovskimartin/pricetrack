import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ 
        error: 'Invalid file type. Please upload an image.' 
      }, { status: 400 })
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 5MB.' 
      }, { status: 400 })
    }

    // Create a unique filename for avatar
    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `avatars/${fileName}`

    // Use admin client for storage operations
    const adminClient = createSupabaseAdminClient()

    console.log('=== AVATAR UPLOAD API ===')
    console.log('File details:', {
      name: file.name,
      size: file.size,
      type: file.type,
      filePath
    })

    // First, check if bucket exists
    const { data: buckets, error: bucketListError } = await adminClient.storage.listBuckets()
    console.log('Available buckets:', buckets?.map(b => b.name))
    console.log('Bucket list error:', bucketListError)

    if (bucketListError) {
      console.error('Failed to list buckets:', bucketListError)
      return NextResponse.json({ 
        error: 'Storage configuration error',
        details: bucketListError.message 
      }, { status: 500 })
    }

    const imagesBucket = buckets?.find(bucket => bucket.name === 'images')
    if (!imagesBucket) {
      console.error('Images bucket not found. Available buckets:', buckets?.map(b => b.name))
      return NextResponse.json({ 
        error: 'Images storage bucket not found',
        availableBuckets: buckets?.map(b => b.name) || []
      }, { status: 500 })
    }

    console.log('Images bucket found:', imagesBucket)

    // Upload to Supabase Storage
    const { data, error } = await adminClient.storage
      .from('images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    console.log('Upload result:', { data, error })

    if (error) {
      console.error('Upload error:', error)
      return NextResponse.json({ 
        error: 'Upload failed',
        details: error.message 
      }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = adminClient.storage
      .from('images')
      .getPublicUrl(filePath)

    console.log('Avatar upload successful. Public URL:', publicUrl)

    return NextResponse.json({
      success: true,
      publicUrl,
      fileName,
      filePath
    })
  } catch (error) {
    console.error('Avatar upload API error:', error)
    return NextResponse.json({ 
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
