import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { emailOrUsername } = await request.json()

    if (!emailOrUsername) {
      return NextResponse.json(
        { error: 'Email or username is required' },
        { status: 400 }
      )
    }

    // Determine if input is email or username
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOrUsername)
    
    let query = supabase
      .from('users')
      .select('is_active, role, email, username')

    if (isEmail) {
      query = query.eq('email', emailOrUsername)
    } else {
      query = query.eq('username', emailOrUsername)
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        // User not found
        return NextResponse.json(
          { isActive: false, userExists: false },
          { status: 200 }
        )
      }
      
      console.error('Error checking user status:', error)
      return NextResponse.json(
        { error: 'Failed to check user status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      isActive: data.is_active,
      userExists: true,
      role: data.role,
      email: data.email,
      username: data.username
    })

  } catch (error) {
    console.error('Error in check-user-status API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET method for checking user status by ID (for authenticated requests)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // Verify the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Check user status
    const { data, error } = await supabase
      .from('users')
      .select('is_active, role, email, username')
      .eq('id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { isActive: false, userExists: false },
          { status: 200 }
        )
      }
      
      console.error('Error checking user status:', error)
      return NextResponse.json(
        { error: 'Failed to check user status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      isActive: data.is_active,
      userExists: true,
      role: data.role,
      email: data.email,
      username: data.username
    })

  } catch (error) {
    console.error('Error in check-user-status GET API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
