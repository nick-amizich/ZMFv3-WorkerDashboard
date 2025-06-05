# Migration Setup Guide

## Quick Fix (Do This Now)

1. The approval functions SQL has been copied to your clipboard
2. Go to: https://supabase.com/dashboard/project/kjdicpudxqxenhjwdrzg/sql/new
3. Paste and click "Run"

## Permanent Solution

### Option 1: Database URL (Recommended)

1. Get your database password from Supabase Dashboard:
   https://supabase.com/dashboard/project/kjdicpudxqxenhjwdrzg/settings/database

2. Add to `.env.local`:
   ```
   DATABASE_URL=postgresql://postgres.kjdicpudxqxenhjwdrzg:[YOUR-PASSWORD]@aws-0-us-east-2.pooler.supabase.com:6543/postgres
   ```

3. Run migrations:
   ```bash
   node scripts/pg-migrate.js
   ```

### Option 2: Supabase CLI

1. Get database password from dashboard
2. Run:
   ```bash
   cd /Users/nickamizich/localdev/ZMFv3-WorkerDashboard
   npx supabase db push
   # Enter password when prompted
   ```

### Option 3: All Migrations at Once

1. Copy all migrations:
   ```bash
   cat scripts/all-migrations.sql | pbcopy
   ```
2. Paste in SQL editor and run

## Files Created

- `/scripts/create-approval-functions.sql` - Just the 4 approval functions
- `/scripts/all-migrations.sql` - All migrations consolidated
- `/scripts/pg-migrate.js` - Direct PostgreSQL migration runner
- `/scripts/direct-migration.js` - Migration helper script

## Why This Happened

- Supabase CLI needs database password for remote connections
- The project was set up without local Supabase development
- Migrations are just SQL files that need to be executed
- The REST API doesn't allow arbitrary SQL execution for security