-- Add 'contact' email type to email_queue table
-- This migration updates the check constraint to allow contact form emails

-- Drop the existing check constraint
ALTER TABLE public.email_queue DROP CONSTRAINT IF EXISTS email_queue_email_type_check;

-- Add the new check constraint with 'contact' included
ALTER TABLE public.email_queue ADD CONSTRAINT email_queue_email_type_check 
    CHECK (email_type IN ('price_alert', 'admin_notification', 'welcome', 'system', 'contact'));

-- Add comment for documentation
COMMENT ON CONSTRAINT email_queue_email_type_check ON public.email_queue IS 'Allowed email types: price_alert, admin_notification, welcome, system, contact';
