-- Check discussions table structure too
SELECT 'Discussions Table Columns' as category,
       column_name,
       data_type,
       is_nullable
FROM information_schema.columns
WHERE table_name = 'discussions'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show sample discussions
SELECT 'All Discussions Sample' as category,
       *
FROM public.discussions
LIMIT 3;