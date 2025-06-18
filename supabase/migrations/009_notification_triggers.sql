-- Create triggers for automatic notification generation
-- This will automatically create notifications when certain events happen

-- 1. Trigger for new comment replies
CREATE OR REPLACE FUNCTION notify_comment_reply()
RETURNS TRIGGER AS $$
DECLARE
    parent_comment RECORD;
    discussion_record RECORD;
    commenter_name TEXT;
BEGIN
    -- Only proceed if this is a reply to another comment
    IF NEW.parent_id IS NOT NULL THEN
        -- Get the parent comment and its author
        SELECT dc.*, u.full_name, u.email 
        INTO parent_comment
        FROM public.discussion_comments dc
        LEFT JOIN public.users u ON dc.created_by = u.id
        WHERE dc.id = NEW.parent_id;
        
        -- Get the discussion details
        SELECT d.*, u.full_name as author_name
        INTO discussion_record
        FROM public.discussions d
        LEFT JOIN public.users u ON d.created_by = u.id
        WHERE d.id = NEW.discussion_id;
        
        -- Get the commenter's name
        SELECT COALESCE(full_name, email) INTO commenter_name
        FROM public.users
        WHERE id = NEW.created_by;
        
        -- Don't notify if replying to own comment
        IF parent_comment.created_by != NEW.created_by THEN
            -- Create notification for the parent comment author
            PERFORM create_notification(
                parent_comment.created_by,
                'comment_reply',
                'Нов отговор на вашия коментар',
                commenter_name || ' отговори на вашия коментар в дискусията "' || discussion_record.title || '"',
                NULL, -- product_id
                NEW.discussion_id,
                NEW.id,
                NULL, -- price_id
                jsonb_build_object(
                    'reply_content', LEFT(NEW.content, 100),
                    'discussion_title', discussion_record.title,
                    'commenter_name', commenter_name
                )
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger for new discussion comments (notify discussion author)
CREATE OR REPLACE FUNCTION notify_discussion_comment()
RETURNS TRIGGER AS $$
DECLARE
    discussion_record RECORD;
    commenter_name TEXT;
BEGIN
    -- Get the discussion details
    SELECT d.*, u.full_name as author_name
    INTO discussion_record
    FROM public.discussions d
    LEFT JOIN public.users u ON d.created_by = u.id
    WHERE d.id = NEW.discussion_id;
    
    -- Get the commenter's name
    SELECT COALESCE(full_name, email) INTO commenter_name
    FROM public.users
    WHERE id = NEW.created_by;
    
    -- Don't notify if commenting on own discussion
    IF discussion_record.created_by != NEW.created_by AND NEW.parent_id IS NULL THEN
        -- Create notification for the discussion author
        PERFORM create_notification(
            discussion_record.created_by,
            'discussion_reply',
            'Нов коментар в вашата дискусия',
            commenter_name || ' коментира в дискусията "' || discussion_record.title || '"',
            NULL, -- product_id
            NEW.discussion_id,
            NEW.id,
            NULL, -- price_id
            jsonb_build_object(
                'comment_content', LEFT(NEW.content, 100),
                'discussion_title', discussion_record.title,
                'commenter_name', commenter_name
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger for comment likes
CREATE OR REPLACE FUNCTION notify_comment_like()
RETURNS TRIGGER AS $$
DECLARE
    comment_record RECORD;
    discussion_record RECORD;
    liker_name TEXT;
BEGIN
    -- Get the comment details
    SELECT dc.*, u.full_name as author_name
    INTO comment_record
    FROM public.discussion_comments dc
    LEFT JOIN public.users u ON dc.created_by = u.id
    WHERE dc.id = NEW.comment_id;
    
    -- Get the discussion details
    SELECT title INTO discussion_record
    FROM public.discussions
    WHERE id = comment_record.discussion_id;
    
    -- Get the liker's name
    SELECT COALESCE(full_name, email) INTO liker_name
    FROM public.users
    WHERE id = NEW.user_id;
    
    -- Don't notify if liking own comment
    IF comment_record.created_by != NEW.user_id THEN
        -- Create notification for the comment author
        PERFORM create_notification(
            comment_record.created_by,
            'comment_like',
            'Харесване на коментар',
            liker_name || ' хареса вашия коментар в дискусията "' || discussion_record.title || '"',
            NULL, -- product_id
            comment_record.discussion_id,
            NEW.comment_id,
            NULL, -- price_id
            jsonb_build_object(
                'liker_name', liker_name,
                'discussion_title', discussion_record.title
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger for discussion likes
CREATE OR REPLACE FUNCTION notify_discussion_like()
RETURNS TRIGGER AS $$
DECLARE
    discussion_record RECORD;
    liker_name TEXT;
BEGIN
    -- Get the discussion details
    SELECT d.*, u.full_name as author_name
    INTO discussion_record
    FROM public.discussions d
    LEFT JOIN public.users u ON d.created_by = u.id
    WHERE d.id = NEW.discussion_id;
    
    -- Get the liker's name
    SELECT COALESCE(full_name, email) INTO liker_name
    FROM public.users
    WHERE id = NEW.user_id;
    
    -- Don't notify if liking own discussion
    IF discussion_record.created_by != NEW.user_id THEN
        -- Create notification for the discussion author
        PERFORM create_notification(
            discussion_record.created_by,
            'discussion_like',
            'Харесване на дискусия',
            liker_name || ' хареса вашата дискусия "' || discussion_record.title || '"',
            NULL, -- product_id
            NEW.discussion_id,
            NULL, -- comment_id
            NULL, -- price_id
            jsonb_build_object(
                'liker_name', liker_name,
                'discussion_title', discussion_record.title
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger for price changes (for tracked products)
CREATE OR REPLACE FUNCTION notify_price_changes()
RETURNS TRIGGER AS $$
DECLARE
    tracking_record RECORD;
    product_record RECORD;
    supermarket_record RECORD;
    price_change_percent DECIMAL;
    old_price DECIMAL;
    notification_type notification_type;
    notification_title TEXT;
    notification_message TEXT;
BEGIN
    -- Get product details
    SELECT * INTO product_record
    FROM public.products
    WHERE id = NEW.product_id;
    
    -- Get supermarket details
    SELECT * INTO supermarket_record
    FROM public.supermarkets
    WHERE id = NEW.supermarket_id;
    
    -- Get the previous price for this product at this supermarket
    SELECT price_bgn INTO old_price
    FROM public.prices
    WHERE product_id = NEW.product_id 
    AND supermarket_id = NEW.supermarket_id
    AND id != NEW.id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Only proceed if we have a previous price to compare
    IF old_price IS NOT NULL AND old_price != NEW.price_bgn THEN
        -- Calculate percentage change
        price_change_percent := ((NEW.price_bgn - old_price) / old_price) * 100;
        
        -- Determine notification type and message
        IF price_change_percent < 0 THEN
            notification_type := 'price_drop';
            notification_title := 'Намаление на цена';
            notification_message := 'Цената на "' || product_record.name || '" в ' || supermarket_record.name || 
                                  ' намаля с ' || ABS(price_change_percent)::DECIMAL(5,2) || '% (от ' || 
                                  old_price || ' лв. на ' || NEW.price_bgn || ' лв.)';
        ELSE
            notification_type := 'price_increase';
            notification_title := 'Увеличение на цена';
            notification_message := 'Цената на "' || product_record.name || '" в ' || supermarket_record.name || 
                                  ' се увеличи с ' || price_change_percent::DECIMAL(5,2) || '% (от ' || 
                                  old_price || ' лв. на ' || NEW.price_bgn || ' лв.)';
        END IF;
        
        -- Notify all users tracking this product
        FOR tracking_record IN 
            SELECT DISTINCT uf.user_id, unp.price_drop_threshold_percent, unp.price_increase_threshold_percent
            FROM public.user_favorites uf
            LEFT JOIN public.user_notification_preferences unp ON uf.user_id = unp.user_id
            WHERE uf.product_id = NEW.product_id
        LOOP
            -- Check if the price change meets the user's threshold
            IF (notification_type = 'price_drop' AND ABS(price_change_percent) >= COALESCE(tracking_record.price_drop_threshold_percent, 10.00))
            OR (notification_type = 'price_increase' AND price_change_percent >= COALESCE(tracking_record.price_increase_threshold_percent, 20.00)) THEN
                
                PERFORM create_notification(
                    tracking_record.user_id,
                    notification_type,
                    notification_title,
                    notification_message,
                    NEW.product_id,
                    NULL, -- discussion_id
                    NULL, -- comment_id
                    NEW.id,
                    jsonb_build_object(
                        'old_price', old_price,
                        'new_price', NEW.price_bgn,
                        'change_percent', price_change_percent,
                        'supermarket_name', supermarket_record.name,
                        'product_name', product_record.name
                    )
                );
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger for content approvals
CREATE OR REPLACE FUNCTION notify_content_approval()
RETURNS TRIGGER AS $$
DECLARE
    notification_title TEXT;
    notification_message TEXT;
    notification_type notification_type;
BEGIN
    -- Only notify when content gets approved (not when created or rejected)
    IF OLD.is_approved = false AND NEW.is_approved = true THEN
        -- Determine the type based on table
        IF TG_TABLE_NAME = 'products' THEN
            notification_type := 'product_approved';
            notification_title := 'Продукт одобрен';
            notification_message := 'Вашият продукт "' || NEW.name || '" беше одобрен и е вече публичен.';
            
            PERFORM create_notification(
                NEW.created_by,
                notification_type,
                notification_title,
                notification_message,
                NEW.id,
                NULL, NULL, NULL,
                jsonb_build_object('product_name', NEW.name)
            );
            
        ELSIF TG_TABLE_NAME = 'discussions' THEN
            notification_type := 'discussion_approved';
            notification_title := 'Дискусия одобрена';
            notification_message := 'Вашата дискусия "' || NEW.title || '" беше одобрена и е вече публична.';
            
            PERFORM create_notification(
                NEW.created_by,
                notification_type,
                notification_title,
                notification_message,
                NULL,
                NEW.id,
                NULL, NULL,
                jsonb_build_object('discussion_title', NEW.title)
            );
            
        ELSIF TG_TABLE_NAME = 'discussion_comments' THEN
            notification_type := 'comment_approved';
            notification_title := 'Коментар одобрен';
            notification_message := 'Вашият коментар беше одобрен и е вече публичен.';
            
            PERFORM create_notification(
                NEW.created_by,
                notification_type,
                notification_title,
                notification_message,
                NULL, NULL,
                NEW.id,
                NULL,
                jsonb_build_object('comment_content', LEFT(NEW.content, 100))
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the actual triggers
CREATE TRIGGER trigger_comment_reply_notification
    AFTER INSERT ON public.discussion_comments
    FOR EACH ROW EXECUTE FUNCTION notify_comment_reply();

CREATE TRIGGER trigger_discussion_comment_notification
    AFTER INSERT ON public.discussion_comments
    FOR EACH ROW EXECUTE FUNCTION notify_discussion_comment();

CREATE TRIGGER trigger_comment_like_notification
    AFTER INSERT ON public.comment_likes
    FOR EACH ROW EXECUTE FUNCTION notify_comment_like();

CREATE TRIGGER trigger_discussion_like_notification
    AFTER INSERT ON public.discussion_likes
    FOR EACH ROW EXECUTE FUNCTION notify_discussion_like();

CREATE TRIGGER trigger_price_change_notification
    AFTER INSERT ON public.prices
    FOR EACH ROW EXECUTE FUNCTION notify_price_changes();

-- Approval triggers for different content types
CREATE TRIGGER trigger_product_approval_notification
    AFTER UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION notify_content_approval();

CREATE TRIGGER trigger_discussion_approval_notification
    AFTER UPDATE ON public.discussions
    FOR EACH ROW EXECUTE FUNCTION notify_content_approval();

CREATE TRIGGER trigger_comment_approval_notification
    AFTER UPDATE ON public.discussion_comments
    FOR EACH ROW EXECUTE FUNCTION notify_content_approval();
