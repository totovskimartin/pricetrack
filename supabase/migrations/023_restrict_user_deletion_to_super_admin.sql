-- Restrict user deletion to super_admin only
-- This migration updates the RLS policy to only allow super_admin to delete users

-- Drop the existing policy
DROP POLICY IF EXISTS "Only admins can delete users" ON public.users;

-- Create new policy that only allows super_admin to delete users
CREATE POLICY "Only super admins can delete users"
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
);

-- Add helper function to check if user is super admin (for consistency)
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = user_id 
        AND role = 'super_admin'
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
