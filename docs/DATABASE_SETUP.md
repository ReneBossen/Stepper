# Walking App Database Setup Guide

This comprehensive guide will help you set up the complete database schema for the Walking App in Supabase.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Setup](#quick-setup-recommended)
- [What Gets Created](#what-gets-created)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [Individual Migrations](#individual-migrations-advanced)
- [Next Steps](#next-steps)
- [Support](#support)

## Prerequisites

Before starting, ensure you have:

- [ ] A Supabase account (sign up at https://supabase.com)
- [ ] A Supabase project created
- [ ] Project URL and anon key (found in Project Settings > API)
- [ ] Access to the Supabase SQL Editor

## Quick Setup (Recommended)

### Step 1: Access Supabase SQL Editor

1. Go to https://app.supabase.com
2. Select your Walking App project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"** button in the top right

### Step 2: Copy the Complete Setup Script

1. Navigate to the file: `docs/migrations/000_complete_database_setup.sql`
2. Open the file and copy **all** of its contents (Ctrl+A, then Ctrl+C)

### Step 3: Run the Setup Script

1. Paste the entire script into the SQL Editor (Ctrl+V)
2. Click the **"Run"** button (or press Ctrl+Enter)
3. Wait for execution to complete
   - **Expected time:** 5-10 seconds
   - You should see "Success. No rows returned" or similar message

### Step 4: Verify the Setup

Go to **"Table Editor"** in the Supabase Dashboard sidebar. You should see the following tables:

- users
- step_entries
- friendships
- groups
- group_memberships
- invite_codes

### Step 5: Test the Setup

Run this verification query in the SQL Editor:

```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Expected output:** A list of all 6 tables created by the setup script.

## What Gets Created

### Tables

#### 1. **users**
- Stores user profile information
- Links to Supabase Auth users
- Contains display name, avatar URL, preferences
- Includes unique QR code ID for friend discovery

#### 2. **step_entries**
- Records daily step counts
- Tracks distance in meters
- Supports multiple data sources (Apple Health, Google Fit, manual)
- Prevents duplicate entries with unique constraint on (user_id, date, source)

#### 3. **friendships**
- Manages friend relationships between users
- Supports statuses: pending, accepted, rejected, blocked
- Bidirectional friendship model (requester/addressee)
- Prevents self-friendships

#### 4. **groups**
- Walking competition groups
- Public or private (with join codes)
- Configurable competition periods (daily, weekly, monthly, custom)
- Created by users with ownership tracking

#### 5. **group_memberships**
- Links users to groups
- Role-based access (owner, admin, member)
- Tracks join timestamps

#### 6. **invite_codes**
- QR codes and shareable links
- Optional expiration dates
- Usage tracking and limits
- Secure validation

### Functions

#### Step Tracking
- **`get_daily_step_summary(user_id, start_date, end_date)`**
  Aggregates step entries by date for a user within a date range

- **`count_step_entries_in_range(user_id, start_date, end_date)`**
  Efficiently counts step entries for pagination

#### Social Features
- **`get_friend_ids(user_id)`**
  Returns all accepted friend IDs for a user

- **`search_users(query, requesting_user_id)`**
  Searches users by display name with friendship status

- **`get_user_by_qr_code(qr_code)`**
  Finds user by their QR code identifier

- **`validate_invite_code(code)`**
  Validates invite codes and increments usage count

#### Groups & Competitions
- **`get_group_leaderboard(group_id, start_date, end_date)`**
  Calculates ranked leaderboard for a group

- **`get_competition_period_dates(period_type, reference_date)`**
  Calculates start and end dates for competition periods

#### Utility
- **`update_updated_at_column()`**
  Automatically updates `updated_at` timestamps on row changes

### Security (Row Level Security)

All tables have RLS (Row Level Security) enabled with policies to ensure:

- **Users can only access their own data** (profiles, steps, invite codes)
- **Friends can view each other's profiles and steps** (accepted friendships only)
- **Group members can view group data** (membership required)
- **Privacy controls** for user discovery and blocking
- **Role-based access** for group management (owner, admin, member)

### Performance Indexes

Optimized indexes on:

- **Users:** `created_at`, `qr_code_id`, `display_name` (trigram + lowercase)
- **Step entries:** `user_id + date`, `date`
- **Friendships:** `requester_id`, `addressee_id`, `status`
- **Groups:** `join_code`, `is_public`, `created_by_id`
- **Group memberships:** `user_id`, `group_id`, `role`
- **Invite codes:** `user_id`, `code`, `type`, `expires_at`

### Extensions

- **pg_trgm** - Trigram matching for fuzzy user search

## Verification

### Check All Tables Exist

```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Expected result:** 6 tables (friendships, group_memberships, groups, invite_codes, step_entries, users)

### Check All Functions Exist

```sql
SELECT proname
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
ORDER BY proname;
```

**Expected result:** 9 functions (count_step_entries_in_range, get_competition_period_dates, get_daily_step_summary, get_friend_ids, get_group_leaderboard, get_user_by_qr_code, search_users, update_updated_at_column, validate_invite_code)

### Check RLS is Enabled

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Expected result:** All tables should have `rowsecurity = true`

### Check Policies Exist

```sql
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Expected result:** Multiple policies for each table ensuring secure access

## Troubleshooting

### Error: "relation already exists"

**Cause:** Table already created in a previous run

**Solutions:**

1. **Skip if intentional** - If you previously ran part of the setup, this is expected
2. **Drop and recreate** - If you want a clean setup:
   ```sql
   DROP TABLE IF EXISTS invite_codes CASCADE;
   DROP TABLE IF EXISTS group_memberships CASCADE;
   DROP TABLE IF EXISTS groups CASCADE;
   DROP TABLE IF EXISTS friendships CASCADE;
   DROP TABLE IF EXISTS step_entries CASCADE;
   DROP TABLE IF EXISTS users CASCADE;
   ```
   Then run the complete setup script again.

### Error: "permission denied"

**Cause:** Insufficient database permissions

**Solution:** Ensure you're logged in as the project owner or have admin privileges

### Error: "function ... already exists"

**Cause:** Function was created in a previous run

**Solution:** This is not a problem. The script uses `CREATE OR REPLACE FUNCTION`, so it will update the function. If the error persists, the function is already correct.

### Error: "extension 'pg_trgm' already exists"

**Cause:** Extension was enabled previously

**Solution:** This is not a problem. The script uses `CREATE EXTENSION IF NOT EXISTS`, so it safely skips re-creation.

### Error: "could not find the table 'public.users' in the schema cache"

**Cause:** Migration hasn't been run yet or failed partway

**Solution:**
1. Check which tables exist: `SELECT tablename FROM pg_tables WHERE schemaname = 'public';`
2. If no tables exist, run the complete setup script
3. If some tables exist, check the error messages to see where the script failed

### Error: "duplicate key value violates unique constraint"

**Cause:** Trying to insert data that already exists

**Solution:** This typically happens when re-running migrations. If you're setting up a fresh database, drop all tables and run the complete setup script.

### Setup completes but tables don't appear in Table Editor

**Cause:** Browser cache or UI issue

**Solutions:**
1. Refresh the page (Ctrl+R or Cmd+R)
2. Click on "Table Editor" in the sidebar again
3. Try a different browser
4. Verify tables exist with SQL: `SELECT * FROM pg_tables WHERE schemaname = 'public';`

### RLS policies blocking test queries

**Cause:** Row Level Security is working correctly

**Solution:** RLS policies require authentication. To test:

1. **Disable RLS temporarily** (NOT recommended for production):
   ```sql
   ALTER TABLE users DISABLE ROW LEVEL SECURITY;
   ```

2. **Use authenticated queries** - Test through your mobile app after authentication

3. **Use SECURITY DEFINER functions** - The provided functions bypass RLS when needed

## Individual Migrations (Advanced)

If you need to run migrations individually (e.g., for debugging or incremental updates), run them in this exact order:

### Migration Order

1. **002_create_users_table.sql**
   Creates users table with profile data

2. **003_create_step_entries_table.sql**
   Creates step_entries table for tracking steps

3. **004_create_friendships_table.sql**
   Creates friendships table and adds friend visibility policies

4. **005_update_friendships_rls_for_blocking.sql**
   Updates friendships policies to support blocking

5. **006_create_groups_tables.sql**
   Creates groups and group_memberships tables

6. **007_add_qr_code_id_to_users.sql**
   Adds QR code identifier to users table

7. **008_add_user_search_indexes.sql**
   Adds search indexes for user discovery

8. **009_create_invite_codes_table.sql**
   Creates invite_codes table

9. **010_create_discovery_functions.sql**
   Creates search and discovery functions

### How to Run Individual Migrations

1. Go to SQL Editor in Supabase
2. Open the migration file (e.g., `docs/migrations/002_create_users_table.sql`)
3. Copy the entire contents
4. Paste into SQL Editor
5. Click "Run"
6. Verify success before proceeding to the next migration

**Warning:** Do not skip migrations or run them out of order. Later migrations depend on earlier ones.

## Next Steps

After successful database setup:

### 1. Update Mobile App Configuration

Create or update `WalkingApp.Mobile/.env` with your Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**To find your credentials:**
1. Go to Supabase Dashboard
2. Click "Project Settings" (gear icon in sidebar)
3. Click "API" tab
4. Copy "Project URL" and "anon public" key

### 2. Test the Mobile App

```bash
cd WalkingApp.Mobile
npm install
npx expo start
```

Press `a` for Android or `i` for iOS

### 3. Test Authentication Flow

1. Launch the app
2. Register a new account
3. Verify email (check inbox)
4. Complete onboarding (set display name)
5. Check that profile is created in Supabase Table Editor

### 4. Test Core Features

- **Profile:** View and edit your profile
- **Steps:** Add step entries manually
- **Friends:** Search for users, send friend requests
- **Groups:** Create a group, join a group
- **QR Code:** Generate and scan QR codes

### 5. Monitor Database Activity

In Supabase Dashboard:
- **Logs** - View real-time queries and errors
- **Table Editor** - Browse data visually
- **SQL Editor** - Run custom queries
- **Database > Roles** - Manage access (if needed)

## Support

### Common Questions

**Q: Do I need to run this setup on every device?**
A: No. Database setup is done once per Supabase project. All devices connect to the same database.

**Q: What happens if I run the setup script twice?**
A: Some parts will fail with "already exists" errors, but this is harmless. Functions will be updated.

**Q: Can I undo the setup?**
A: Yes. You can drop all tables with:
```sql
DROP TABLE IF EXISTS invite_codes CASCADE;
DROP TABLE IF EXISTS group_memberships CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS friendships CASCADE;
DROP TABLE IF EXISTS step_entries CASCADE;
DROP TABLE IF EXISTS users CASCADE;
```

**Q: How do I backup my database?**
A: In Supabase Dashboard, go to Database > Backups. Free tier includes daily backups.

**Q: Can I modify the schema after setup?**
A: Yes, but use migrations. Create new migration files (e.g., `011_your_change.sql`) to track changes.

**Q: Is my data secure?**
A: Yes. RLS policies ensure users can only access their own data and data they're authorized to see.

### Getting Help

1. **Check Supabase Logs**
   Dashboard > Logs > Look for errors

2. **Verify Postgres Version**
   Dashboard > Database > Database settings > Should be PostgreSQL 13+

3. **Check Extension Support**
   Dashboard > Database > Extensions > Ensure `pg_trgm` is enabled

4. **Review Migration Files**
   Each file in `docs/migrations/` has detailed comments

5. **Test with Simple Queries**
   Try `SELECT * FROM users;` to ensure basic connectivity

### Resources

- **Supabase Documentation:** https://supabase.com/docs
- **Supabase Auth Guide:** https://supabase.com/docs/guides/auth
- **Supabase RLS Guide:** https://supabase.com/docs/guides/auth/row-level-security
- **PostgreSQL Documentation:** https://www.postgresql.org/docs/

---

## Summary Checklist

After completing this guide, you should have:

- [ ] Created a Supabase project
- [ ] Run the complete database setup script
- [ ] Verified all 6 tables exist
- [ ] Verified all 9 functions exist
- [ ] Confirmed RLS is enabled on all tables
- [ ] Updated mobile app `.env` file with credentials
- [ ] Tested mobile app authentication
- [ ] Successfully created a user profile

**Congratulations!** Your Walking App database is now fully configured and ready to use.
