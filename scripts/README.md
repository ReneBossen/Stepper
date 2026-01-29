# Scripts

This directory contains utility scripts for the Stepper/Stepper project.

## Prerequisites

1. **Node.js** (v18 or higher recommended)
2. **npm** package manager
3. **Supabase project** with the database schema applied

## Setup

1. Install dependencies from the project root:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root (copy from `.env.example`):

   ```bash
   cp .env.example .env
   ```

3. Fill in your Supabase credentials in `.env`:

   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

   > **WARNING**: The service role key has full database access. Never commit it to version control or expose it in client-side code.

## Available Scripts

### seed-test-data.ts

Generates comprehensive test data for development and testing.

#### What it creates:

- **10 Test Users** with varied display names
- **4 Groups** (mix of public/private, different period types)
- **15+ Group Memberships** with varied roles (owner, admin, member)
- **20 Friendships** (mix of accepted and pending statuses)
- **7-14 Days of Step Entries** per user with realistic step counts

#### Usage:

```bash
# Run the seed script
npm run seed

# Clean up existing test data first, then seed
npm run seed:cleanup
```

#### Test User Credentials:

All test users share the same password: `TestPassword123!`

| User | Email |
|------|-------|
| Alice Walker | alice@testuser.stepper.local |
| Bob Runner | bob@testuser.stepper.local |
| Carol Strider | carol@testuser.stepper.local |
| Dave Pacer | dave@testuser.stepper.local |
| Emma Steps | emma@testuser.stepper.local |
| Frank Marathon | frank@testuser.stepper.local |
| Grace Hiker | grace@testuser.stepper.local |
| Henry Trails | henry@testuser.stepper.local |
| Ivy Jogger | ivy@testuser.stepper.local |
| Jack Sprint | jack@testuser.stepper.local |

#### Notes:

- The script is **idempotent** - running it multiple times will skip existing data
- Use `--cleanup` flag to delete all test data before re-seeding
- Test data is identified by the email domain `testuser.stepper.local`
- Step counts are randomized between 3,000-18,000 per day for realistic leaderboards

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Your Supabase project URL | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key with admin privileges | Yes |

## Troubleshooting

### "Missing required environment variables"

Make sure you have created a `.env` file with both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set.

### "Error creating auth user"

- Check that your Supabase project is active
- Verify the service role key is correct
- Ensure the email domain is not blocked by your Supabase auth settings

### "Error creating profile"

- Verify the database schema has been applied (run all migrations)
- Check that the `users` table exists with the expected columns
