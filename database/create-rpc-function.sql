-- Optional RPC function for better performance when searching products by ID prefix
-- Run this in your Supabase SQL Editor for better performance (optional)

CREATE OR REPLACE FUNCTION find_product_by_id_prefix(id_prefix TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  category TEXT,
  brand TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ,
  is_approved BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.description,
    p.category,
    p.brand,
    p.image_url,
    p.created_at,
    p.is_approved
  FROM products p
  WHERE p.id::text ILIKE (id_prefix || '%')
    AND p.is_approved = true
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION find_product_by_id_prefix(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION find_product_by_id_prefix(TEXT) TO anon;
