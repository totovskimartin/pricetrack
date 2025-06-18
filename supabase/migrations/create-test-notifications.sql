-- Create test notifications for the new Alerts page
-- Run this in your Supabase SQL Editor to populate the alerts page

-- 1. Ensure the admin_notifications table allows all notification types
ALTER TABLE public.admin_notifications 
DROP CONSTRAINT IF EXISTS admin_notifications_type_check;

ALTER TABLE public.admin_notifications 
ADD CONSTRAINT admin_notifications_type_check 
CHECK (type IN ('price_suggestion', 'new_user', 'new_product', 'new_discussion', 'new_comment', 'system_alert'));

-- 2. Create test notifications
INSERT INTO public.admin_notifications (
    type,
    title,
    message,
    data,
    target_id,
    target_type,
    created_for_role,
    is_read,
    created_at
) VALUES 
-- Price suggestion notification
(
    'price_suggestion',
    'Ново предложение за цена',
    'Потребител Иван Петров предложи цена 2.50 лв. за "Мляко 1л" в Lidl',
    '{"price_suggestion_id": "test-1", "product_name": "Мляко 1л", "supermarket_name": "Lidl", "suggested_price": 2.50}',
    null,
    'price_suggestion',
    'admin',
    false,
    NOW() - INTERVAL '2 hours'
),
-- New user notification
(
    'new_user',
    'Нов потребител се регистрира',
    'Потребител Мария Георгиева се регистрира в системата',
    '{"user_id": "test-2", "user_email": "maria@example.com", "user_name": "Мария Георгиева"}',
    null,
    'user',
    'admin',
    false,
    NOW() - INTERVAL '1 hour'
),
-- New product notification
(
    'new_product',
    'Нов продукт за одобрение',
    'Потребител Стефан Димитров добави продукт "Хляб пълнозърнест" за одобрение',
    '{"product_id": "test-3", "product_name": "Хляб пълнозърнест", "user_name": "Стефан Димитров"}',
    null,
    'product',
    'admin',
    true,
    NOW() - INTERVAL '3 hours'
),
-- New discussion notification
(
    'new_discussion',
    'Нова дискусия за одобрение',
    'Потребител Анна Стоянова създаде дискусия "Най-добри промоции тази седмица" за одобрение',
    '{"discussion_id": "test-4", "discussion_title": "Най-добри промоции тази седмица", "user_name": "Анна Стоянова"}',
    null,
    'discussion',
    'admin',
    false,
    NOW() - INTERVAL '30 minutes'
),
-- New comment notification
(
    'new_comment',
    'Нов коментар за одобрение',
    'Потребител Георги Николов добави коментар в дискусия "Качество на продукти"',
    '{"comment_id": "test-5", "discussion_title": "Качество на продукти", "user_name": "Георги Николов"}',
    null,
    'comment',
    'admin',
    false,
    NOW() - INTERVAL '15 minutes'
),
-- System alert notification
(
    'system_alert',
    'Системно известие',
    'Системата е актуализирана успешно. Нови функции са достъпни в админ панела.',
    '{"version": "1.2.0", "features": ["Alerts page", "Better notifications"]}',
    null,
    null,
    'admin',
    true,
    NOW() - INTERVAL '1 day'
);

-- 3. Verify the notifications were created
SELECT 'Test Notifications Created' as status,
       type,
       title,
       is_read,
       created_at
FROM public.admin_notifications
WHERE target_id IS NULL OR target_id LIKE 'test-%'
ORDER BY created_at DESC;
