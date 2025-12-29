# Row Level Security (RLS) Setup Guide

This guide will help you enable Row Level Security (RLS) for all tables in your Company Bets application.

## Quick Start

1. Open your Supabase project dashboard
2. Go to **SQL Editor** (in the left sidebar)
3. Click **New Query**
4. Copy and paste the entire contents of `supabase-rls-policies.sql`
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. Verify there are no errors

## What RLS Does

Row Level Security ensures that users can only access data they're authorized to see. Without RLS, any authenticated user could potentially access or modify any data in your database.

## Policy Breakdown

### Users Table
- **SELECT**: Users can view their own profile, admins can view all profiles
- **UPDATE**: Users can only update their own profile
- **INSERT**: Users can only create their own profile (during signup)

### Bets Table
- **SELECT**: All authenticated users can view all bets
- **INSERT**: Users can create bets (must set `created_by` to their own ID)
- **UPDATE**: Only admins can update bets (to resolve or cancel them)

### User Predictions Table
- **SELECT**: All authenticated users can view all predictions (needed to show bet counts)
- **INSERT**: Users can only create their own predictions
- **UPDATE**: Users can only update their own predictions

### Refill Requests Table
- **SELECT**: Users can view their own requests, admins can view all
- **INSERT**: Users can only create their own refill requests
- **UPDATE**: Only admins can update refill requests (to approve/deny)

### Transactions Table
- **SELECT**: Users can view their own transactions, admins can view all
- **INSERT**: Any authenticated user can insert transactions (needed for system operations)

## Verifying RLS is Enabled

After running the SQL script, verify RLS is enabled:

1. Go to **Database** → **Tables** in Supabase
2. Click on each table (`users`, `bets`, `user_predictions`, `refill_requests`, `transactions`)
3. Check the **Policies** tab - you should see the policies listed
4. Check that **RLS Enabled** shows as **Yes**

## Troubleshooting

### Error: "policy already exists"
The script includes `DROP POLICY IF EXISTS` statements, so this shouldn't happen. If it does, you can manually drop policies:
```sql
DROP POLICY "Policy Name" ON table_name;
```

### Users can't sign up
Make sure the `users` table INSERT policy allows `auth.uid() = id`. The updated script includes this fix.

### Admins can't see all data
Make sure your user has `is_admin = true` in the `users` table:
```sql
UPDATE users SET is_admin = true WHERE email = 'your-email@example.com';
```

### Can't test policies
To test RLS policies, make sure you're:
1. Logged in as a regular user (not admin) to test user restrictions
2. Logged in as an admin to test admin permissions
3. Using the Supabase client from your app (not the Supabase dashboard, which bypasses RLS)

## Security Notes

- **Never disable RLS** in production - it's your primary security layer
- The policies use `auth.uid()` which is automatically set by Supabase Auth
- Admin checks use a subquery to verify `is_admin` status
- All policies are restrictive by default - if there's no policy for an operation, it's denied

## Next Steps

After enabling RLS:
1. Test signup and login
2. Test creating bets
3. Test placing predictions
4. Test admin functions (if you're an admin)
5. Enable Realtime for tables that need it (see README.md)

