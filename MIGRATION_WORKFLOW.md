# Migration Workflow Guide for Claude Assistants

## 🎯 When Migrations Are Required

### ✅ ALWAYS Need Migration For:
- Adding new tables
- Adding new columns to existing tables
- Changing column data types
- Adding/removing constraints
- Creating/dropping indexes
- Updating RLS (Row Level Security) policies
- Adding/modifying database functions
- Creating/updating triggers

### ❌ NO Migration Needed For:
- React component changes
- TypeScript interface updates
- UI/UX modifications
- Client-side logic changes
- Import/export changes

## 🔄 Step-by-Step Migration Process

### Step 1: Ask Permission (REQUIRED)
```
"I need to create a migration to [specific change]. 
This will add/modify [table/column details].
Should I proceed with creating the migration?"
```

### Step 2: Create Migration File (After Approval)
```bash
# Use descriptive name
supabase migration new "add_inventory_tracking_table"
supabase migration new "add_cost_column_to_parts"
supabase migration new "update_worker_permissions_rls"
```

### Step 3: Write Migration SQL
Edit the new migration file in `supabase/migrations/`:
```sql
-- Example: Adding new table
CREATE TABLE inventory_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES parts_catalog(id),
  quantity_change INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES workers(id)
);

-- Enable RLS
ALTER TABLE inventory_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Workers can view inventory tracking" 
  ON inventory_tracking FOR SELECT 
  TO authenticated 
  USING (true);

-- Create indexes for performance
CREATE INDEX idx_inventory_tracking_item_id ON inventory_tracking(item_id);
CREATE INDEX idx_inventory_tracking_created_at ON inventory_tracking(created_at);
```

### Step 4: Ask Before Applying (REQUIRED)
```
"Migration file created. Should I apply it locally with 'supabase db reset'?
This will reset the local database and apply all migrations."
```

### Step 5: Apply Migration (After Approval)
```bash
# This resets local DB and applies ALL migrations
supabase db reset
```

### Step 6: Generate Updated Types
```bash
# Always regenerate types after schema changes
supabase gen types typescript --local > src/types/database.types.ts
```

### Step 7: Test Everything
```bash
# Test build
npm run build

# Test dev server
npm run dev

# Verify new tables/columns exist
curl -s "http://127.0.0.1:54321/rest/v1/[new_table]?limit=1" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 🚨 Important Safety Rules

### NEVER Do Without Permission:
- ❌ `supabase db reset` (wipes all data)
- ❌ `supabase db push` (affects remote database)
- ❌ Modify existing migration files
- ❌ Delete migration files

### ALWAYS Ask First:
- ❓ Before creating any migration
- ❓ Before applying migrations (`db reset`)
- ❓ Before pushing to remote
- ❓ If migration conflicts occur

## 📋 Migration Checklist

### Before Creating Migration:
- [ ] Clearly understand what schema changes are needed
- [ ] Ask user for permission to create migration
- [ ] Use descriptive migration name
- [ ] Plan RLS policies for new tables

### In Migration File:
- [ ] Include all necessary CREATE statements
- [ ] Enable RLS on new tables: `ALTER TABLE x ENABLE ROW LEVEL SECURITY`
- [ ] Create appropriate RLS policies
- [ ] Add indexes for foreign keys and frequently queried columns
- [ ] Include any necessary seed data

### After Creating Migration:
- [ ] Ask permission before applying (`supabase db reset`)
- [ ] Regenerate TypeScript types
- [ ] Test build: `npm run build`
- [ ] Verify tables exist via API calls
- [ ] Test that RLS policies work correctly

## 🔧 Common Migration Patterns

### Adding New Table:
```sql
CREATE TABLE new_table (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES workers(id)
);

ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "policy_name" ON new_table 
  FOR ALL TO authenticated 
  USING ((SELECT auth.uid()) = created_by);

CREATE INDEX idx_new_table_created_by ON new_table(created_by);
```

### Adding Column to Existing Table:
```sql
ALTER TABLE existing_table 
ADD COLUMN new_column TEXT;

-- Update RLS policies if needed
DROP POLICY IF EXISTS "old_policy" ON existing_table;
CREATE POLICY "updated_policy" ON existing_table 
  FOR ALL TO authenticated 
  USING (/* updated condition */);
```

### Adding Index:
```sql
CREATE INDEX idx_table_column ON table_name(column_name);
CREATE INDEX idx_table_multiple ON table_name(col1, col2);
```

## 🎯 Success Criteria

### Migration is Successful When:
- ✅ `supabase db reset` completes without errors
- ✅ New tables/columns appear in Supabase Studio
- ✅ TypeScript types include new schema
- ✅ `npm run build` passes
- ✅ API calls to new tables work
- ✅ RLS policies function correctly

### Red Flags (Stop and Ask):
- ❌ Migration syntax errors
- ❌ Foreign key constraint failures
- ❌ RLS policy conflicts
- ❌ Type generation failures
- ❌ Build errors after migration

---

## 💡 Remember
Migrations are **permanent changes** to the database schema. Always ask permission and test thoroughly! 