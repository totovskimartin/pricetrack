const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  console.log('Applying user deletion restriction migration...')
  
  try {
    // Drop the existing policy
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'DROP POLICY IF EXISTS "Only admins can delete users" ON public.users;'
    })
    
    if (dropError) {
      console.error('Error dropping existing policy:', dropError)
      return
    }
    
    console.log('✓ Dropped existing policy')
    
    // Create new policy that only allows super_admin to delete users
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Only super admins can delete users"
ON public.users
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
    AND is_active = true
  )
);`
    })
    
    if (createError) {
      console.error('Error creating new policy:', createError)
      return
    }
    
    console.log('✓ Created new policy restricting deletion to super_admin only')
    
    // Add helper function
    const { error: functionError } = await supabase.rpc('exec_sql', {
      sql: `CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = user_id 
        AND role = 'super_admin'
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`
    })
    
    if (functionError) {
      console.error('Error creating helper function:', functionError)
      return
    }
    
    console.log('✓ Created is_super_admin helper function')
    console.log('Migration completed successfully!')
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

applyMigration()
