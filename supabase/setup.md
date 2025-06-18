# Supabase Database Setup for PriceTrack Bulgaria

This guide will help you set up the complete database schema for the PriceTrack Bulgaria application.

## Prerequisites

1. **Create a Supabase project** at [supabase.com](https://supabase.com)
2. **Get your project credentials**:
   - Project URL
   - Anon (public) key
   - Service role (secret) key

## Step 1: Update Environment Variables

Update your `.env.local` file with your actual Supabase credentials:

```bash
# Replace with your actual Supabase project details
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Step 2: Run Database Migrations

You can run these migrations in two ways:

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run each migration file in order:

#### Migration 1: Initial Schema
Copy and paste the contents of `001_initial_schema.sql` and run it.

#### Migration 2: Row Level Security Policies
Copy and paste the contents of `002_rls_policies.sql` and run it.

#### Migration 3: Seed Data
Copy and paste the contents of `003_seed_data.sql` and run it.

#### Migration 4: Views and Functions
Copy and paste the contents of `004_views_and_functions.sql` and run it.

### Option B: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Initialize Supabase in your project (if not already done)
supabase init

# Link to your remote project
supabase link --project-ref your-project-id

# Run migrations
supabase db push
```

## Step 3: Verify Setup

After running all migrations, verify your setup:

### Check Tables
Your database should now have these tables:
- `users` - User profiles and roles
- `supermarkets` - Bulgarian supermarket chains
- `products` - Product catalog
- `prices` - Price history
- `discussions` - Product discussions
- `discussion_comments` - Discussion comments
- `user_products` - User's tracked products
- `admin_logs` - Admin action logs

### Check Sample Data
You should see:
- 10 Bulgarian supermarkets (Lidl, Fantastico, Billa, etc.)
- 10 sample products with prices
- Sample price data across different supermarkets

### Check Functions and Views
The following should be available:
- `products_with_prices` view
- `price_comparison` view
- `trending_products` view
- `search_products()` function
- `get_price_history()` function
- `get_user_tracked_products()` function

## Step 4: Test Authentication

1. Go to **Authentication > Settings** in your Supabase dashboard
2. Configure your site URL: `http://localhost:3000`
3. Enable email authentication
4. Optionally enable Google OAuth for social login

## Step 5: Create Admin User

To create your first admin user:

1. Register a new user through your application
2. Go to **Authentication > Users** in Supabase dashboard
3. Find your user and note the User ID
4. Go to **SQL Editor** and run:

```sql
UPDATE public.users 
SET role = 'super_admin' 
WHERE id = 'your-user-id-here';
```

## Database Schema Overview

### User Roles Hierarchy
- `user` - Regular users (default)
- `moderator` - Can moderate content
- `admin` - Can manage users and supermarkets
- `super_admin` - Full system access

### Key Features
- **Row Level Security (RLS)** - Ensures data security
- **Automatic EUR conversion** - BGN prices automatically converted using fixed rate (1.95583)
- **Content moderation** - Products and discussions require approval
- **Price tracking** - Users can track products and get notifications
- **Admin logging** - All admin actions are logged
- **Full-text search** - Optimized product search with PostgreSQL

### Sample Supermarkets Included
- Lidl
- Fantastico  
- Billa
- Kaufland
- T-Market
- Piccadilly
- CBA
- SPAR
- Carrefour
- Metro

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   - Make sure you're using the service role key for admin operations
   - Check that RLS policies are correctly applied

2. **Function Not Found**
   - Ensure all migrations ran successfully
   - Check that functions have proper permissions

3. **Authentication Issues**
   - Verify your site URL is configured correctly
   - Check that the auth trigger is working for new users

### Getting Help

If you encounter issues:
1. Check the Supabase logs in your dashboard
2. Verify all migrations completed successfully
3. Test with the SQL Editor to debug specific queries

## Next Steps

After setting up the database:
1. Test user registration and authentication
2. Create authentication pages in your Next.js app
3. Implement product management features
4. Build the admin dashboard
5. Add price tracking functionality

Your database is now ready to support the full PriceTrack Bulgaria application!
