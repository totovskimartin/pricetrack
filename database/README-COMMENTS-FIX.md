# Fix for "Error fetching comment count" Issue

## Problem
When opening individual product pages, you see the error:
```
Error fetching comment count: {}
```

This happens because the `product_comments` table doesn't exist in your Supabase database yet.

## Solution

### Option 1: Quick Fix (Recommended)
1. Open your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `database/setup-product-comments.sql`
4. Run the script
5. Refresh your product page - the error should be gone!

### Option 2: Using Supabase CLI
If you have the Supabase CLI installed:

```bash
# Make sure you're in the project root
cd /path/to/your/pricetrack/project

# Run the migration
supabase db push
```

## What This Fixes

The script creates two tables:
- `product_comments` - Stores product comments and replies
- `comment_votes` - Tracks user likes/dislikes on comments

It also sets up:
- Row Level Security (RLS) policies
- Database indexes for performance
- Triggers to automatically update vote counts
- Proper permissions for authenticated and anonymous users

## After Running the Script

1. The error "Error fetching comment count: {}" will disappear
2. Product pages will show comment counts (initially 0)
3. Users will be able to add comments on products
4. The comment system will be fully functional

## Verification

After running the script, you should see:
- No more console errors about comment counts
- Product pages load without errors
- Comment sections appear on product pages

## Files Updated

This fix also updated the TypeScript types in:
- `src/lib/types/database.ts` - Added `product_comments` table definition
- `src/lib/comments.ts` - Improved error handling and logging

## Need Help?

If you still see errors after running the script:
1. Check the Supabase SQL Editor for any error messages
2. Verify your database connection in the browser console
3. Make sure your Supabase environment variables are correct
