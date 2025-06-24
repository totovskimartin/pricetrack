import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  // If no code, redirect to login
  if (!code) {
    return NextResponse.redirect(new URL('/bg/login', request.url))
  }

  // Create a server-side Supabase client
  const supabase = createServerSupabaseClient()
  
  // Exchange the code for a session
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  
  if (error) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(
      new URL('/bg/login?error=auth_callback_error', request.url)
    )
  }
  
  // Successful authentication, redirect to dashboard
  return NextResponse.redirect(new URL('/bg/dashboard', request.url))
}