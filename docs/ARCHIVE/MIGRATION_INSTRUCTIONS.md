# Migration Instructions for V3.1

## Overview
This document contains the steps to apply the V3.1 migrations which include:
1. V3 Quality System tables (corrected to use 'workers' instead of 'employees')
2. User Management system with approval workflow

## Step 1: Apply Migrations to Supabase

Since the Supabase CLI is having issues with the migration history, you'll need to apply these migrations manually through the Supabase Dashboard.

### Option A: Using Supabase Dashboard SQL Editor

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/kjdicpudxqxenhjwdrzg
2. Navigate to the SQL Editor
3. Apply migrations in this order:

#### 1. First, apply the V3 Automation Rules migration:
```sql
-- Copy contents from: supabase/migrations/20250130_v3_automation_rules.sql
```

#### 2. Then, apply the corrected V3 Quality System migration:
```sql
-- Copy contents from: supabase/migrations/20250131_v3_quality_system_corrected.sql
```

#### 3. Finally, apply the User Management migration:
```sql
-- Copy contents from: supabase/migrations/20250133_user_management_system.sql
```

### Option B: Using Supabase CLI (if migration history is fixed)

```bash
# Link to project
npx supabase link --project-ref kjdicpudxqxenhjwdrzg

# Push migrations
npx supabase db push --password "taffYg-7mecqu-ratroh"
```

## Step 2: Generate Updated TypeScript Types

After migrations are applied:

```bash
# Generate types
npx supabase gen types typescript --project-id kjdicpudxqxenhjwdrzg > src/types/database.ts
```

Or use the script:
```bash
./scripts/generate-types.sh
```

## Step 3: Verify Installation

1. Check that the following tables exist:
   - component_tracking
   - quality_checkpoints
   - inspection_results
   - quality_patterns
   - quality_holds
   - quality_checkpoint_templates
   - worker_invitations
   - user_management_audit_log

2. Check that workers table has new columns:
   - approval_status
   - approved_by
   - approved_at
   - rejection_reason
   - suspension_reason
   - suspended_at

## Step 4: Set Up Initial Manager

Since all users now require approval, you need at least one approved manager:

```sql
-- Make the first user a manager (run in SQL Editor)
UPDATE workers 
SET 
  role = 'manager',
  approval_status = 'approved',
  approved_at = NOW()
WHERE id = (
  SELECT id FROM workers 
  ORDER BY created_at ASC 
  LIMIT 1
);
```

## Step 5: Test the System

1. Access the User Management page at `/manager/users`
2. Try inviting a new user
3. Have someone register and verify they see the pending approval page
4. Approve the user and verify they can access the system

## Troubleshooting

### If migrations fail:
1. Check for existing objects that might conflict
2. Drop and recreate if necessary (be careful with production data!)

### If types generation fails:
1. Ensure you're authenticated: `npx supabase login`
2. Check your project ID is correct
3. Try generating types through the dashboard instead

### If approval system doesn't work:
1. Check that the middleware is updated
2. Verify the workers table has the new columns
3. Check browser console for API errors

## Important Notes

- The user management system is backward compatible - if approval_status doesn't exist, users are assumed approved
- The first manager needs to be set up manually via SQL
- All new registrations will require approval after these migrations are applied