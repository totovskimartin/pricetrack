-- Fix email queue RLS policies to allow admin operations
-- This migration adds missing INSERT and UPDATE policies for admins

-- Add INSERT policy for admins to add emails to queue
CREATE POLICY "Admins can insert into email queue" ON public.email_queue
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- Add UPDATE policy for admins to update email queue status
CREATE POLICY "Admins can update email queue" ON public.email_queue
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- Add DELETE policy for admins to clean up email queue
CREATE POLICY "Admins can delete from email queue" ON public.email_queue
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- Also add INSERT/UPDATE policies for email stats table
CREATE POLICY "Admins can insert email stats" ON public.email_stats
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admins can update email stats" ON public.email_stats
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
        )
    );
