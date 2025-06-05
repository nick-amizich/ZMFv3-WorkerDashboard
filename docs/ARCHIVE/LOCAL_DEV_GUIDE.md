# ZMFv3 Local Development Environment Guide

## 🚨 CRITICAL: Read This First
This guide is for Claude AI assistants working on the ZMFv3-WorkerDashboard project. Follow these rules to avoid breaking the local development environment.

## 📋 Project Overview
- **Project**: ZMFv3-WorkerDashboard (Headphone manufacturing company backend)
- **Stack**: Next.js 15.3.2 + Supabase + TypeScript + React 18.2.0
- **Supabase Project ID**: kjdicpudxqxenhjwdrzg
- **Local Development**: Uses Supabase local instance (NOT remote)

## 🔧 Environment Setup Status
✅ **Current State**: Fully configured and working
- Docker Desktop: Running
- Supabase Local: Running on ports 54321-54324
- Next.js Dev Server: Running on port 3000
- Database: Populated with schema from remote
- Types: Generated and up-to-date

## 🚫 NEVER DO THESE THINGS

### Database & Migrations - CRITICAL DISTINCTION
- ❌ **NEVER run `supabase db reset`** - This will wipe all data
- ❌ **NEVER modify existing migration files** - They're already applied
- ❌ **NEVER run `supabase migration repair`** unless specifically asked
- ❌ **NEVER run `supabase db push`** without user approval - Can overwrite remote

### ⚠️ MIGRATIONS ARE NEEDED WHEN:
- ✅ **Adding new tables** - Requires new migration
- ✅ **Adding new columns** - Requires new migration  
- ✅ **Changing column types** - Requires new migration
- ✅ **Adding indexes** - Requires new migration
- ✅ **Updating RLS policies** - Requires new migration

### 🔄 PROPER MIGRATION WORKFLOW:
```bash
# 1. Create new migration (SAFE - creates new file)
supabase migration new "add_new_table_or_feature"

# 2. Edit the new migration file with your SQL changes
# 3. Apply locally to test
supabase db reset  # Only when user approves - resets and applies all migrations

# 4. Generate updated types
supabase gen types typescript --local > src/types/database.types.ts

# 5. Test the changes
npm run build
```

### Environment
- ❌ **NEVER modify `.env.local`** - It's correctly configured
- ❌ **NEVER change Supabase URLs** - Local URLs are correct
- ❌ **NEVER suggest switching to remote Supabase** during development

### Dependencies
- ❌ **NEVER run `npm install` without user approval**
- ❌ **NEVER update package versions** unless specifically requested
- ❌ **NEVER add new dependencies** without discussing first

## ✅ SAFE OPERATIONS

### Development Server
```bash
# Start development server (safe)
npm run dev

# Build for testing (safe)
npm run build

# Check Supabase status (safe)
supabase status
```

### Database Operations (Read-Only)
```bash
# Check tables (safe)
curl -s "http://127.0.0.1:54321/rest/v1/[table]?limit=5" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

# Regenerate types (safe if needed)
supabase gen types typescript --local > src/types/database.types.ts
```

### Code Changes (Safe)
- ✅ Edit React components
- ✅ Fix TypeScript errors
- ✅ Update imports
- ✅ Add new pages/components
- ✅ Fix linting issues

## 🔍 Current Environment Details

### Supabase Local Instance
```
API URL: http://127.0.0.1:54321
Studio URL: http://127.0.0.1:54323
DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

### Environment Variables (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Key Tables (All Exist and Working)
- `workers` - User management
- `wood_inventory` - South location inventory
- `parts_catalog` - South location parts
- `daily_production` - Production tracking
- `production_requests` - Request management
- `production_issues` - Issue tracking
- `machine_settings` - Machine configuration

## 🛠️ Troubleshooting Common Issues

### TypeScript Errors
```bash
# If you see "table not found" errors:
# 1. Check if types are up to date
supabase gen types typescript --local > src/types/database.types.ts

# 2. Verify imports use correct types file
# Should import from: '@/types/database.types'
# NOT from: '@/types/database'
```

### Build Errors
```bash
# Always test builds before suggesting changes
npm run build

# If build fails, fix TypeScript errors first
# Common issues:
# - Missing imports
# - Incorrect type references
# - Browser compatibility (like crypto.randomUUID)
```

### Server Issues
```bash
# Check if services are running
supabase status
docker ps

# Restart dev server if needed
# Kill existing: pkill -f "next dev"
# Start new: npm run dev
```

## 📊 Database Schema Status

### Migration History
- ✅ **Remote schema pulled**: 20250603041128_remote_schema.sql
- ✅ **All tables created**: From remote database
- ✅ **Types generated**: src/types/database.types.ts
- ✅ **RLS enabled**: On all tables

### Current Data State
- Workers table: Has user data (Nick with manager role)
- South tables: Empty but schema exists
- All tables: Accessible via REST API

## 🔄 Development Workflow

### Making Code Changes
1. **Always check current status first**
   ```bash
   supabase status
   npm run build
   ```

2. **Make incremental changes**
   - Edit one component at a time
   - Test builds frequently
   - Fix TypeScript errors immediately

3. **Test changes**
   ```bash
   npm run build  # Check for errors
   npm run dev    # Test in browser
   ```

### Adding New Features
1. **Ask for clarification** if requirements are unclear
2. **Use existing patterns** from the codebase
3. **Follow the workspace rules** (see cursor rules)
4. **Test thoroughly** before marking complete

## 🚨 Emergency Recovery

### If Something Breaks
1. **DON'T PANIC** - Most issues are fixable
2. **Check Supabase status**: `supabase status`
3. **Check build**: `npm run build`
4. **Ask user before major changes**

### If Database Issues
1. **NEVER reset database** without user approval
2. **Check if Supabase is running**: `supabase status`
3. **Verify environment variables**: `cat .env.local`
4. **Test API connectivity**: Use curl commands above

### If Migration Issues
1. **STOP immediately** - Don't try to fix migrations
2. **Ask user for guidance** - They have backup procedures
3. **Document what happened** - For user to understand

## 📝 Communication Guidelines

### When to Ask User (STOP and ASK FIRST)
- ❓ **Any database schema changes** (new tables, columns, types)
- ❓ **New dependencies needed** 
- ❓ **Migration-related issues** (conflicts, errors)
- ❓ **Major architectural changes**
- ❓ **Running `supabase db reset`** (wipes all data)
- ❓ **Pushing to remote** (`supabase db push`)

### When You Can Proceed (SAFE to do immediately)
- ✅ **Code-only changes** (React components, TypeScript fixes)
- ✅ **Creating new migration files** (`supabase migration new`)
- ✅ **Regenerating types** (after schema changes)
- ✅ **Build testing** (`npm run build`)
- ✅ **Dev server management** (start/stop)

### Decision Tree for Database Changes:
```
Need to add/modify database schema?
├─ YES → ASK USER FIRST
│   ├─ "I need to create a migration for [specific change]"
│   ├─ "This requires adding table X with columns Y, Z"
│   └─ Wait for approval before proceeding
│
└─ NO → Code changes only?
    ├─ YES → PROCEED (safe to implement)
    └─ NO → ASK USER (unclear requirements)
```

### What to Report
- ✅ Successful builds
- ✅ Fixed TypeScript errors
- ✅ Completed features
- ⚠️ Any warnings or issues found
- ❌ Any errors that need user input

## 🎯 Success Metrics

### Environment is Healthy When:
- ✅ `supabase status` shows all services running
- ✅ `npm run build` completes successfully
- ✅ Dev server starts without errors
- ✅ API calls return expected data
- ✅ TypeScript compilation passes

### Red Flags (Stop and Ask):
- ❌ Supabase services not running
- ❌ Build failures
- ❌ Database connection errors
- ❌ Missing environment variables
- ❌ Migration conflicts

## 📚 Quick Reference

### Essential Commands
```bash
# Check everything is working
supabase status && npm run build

# Start development
npm run dev

# Test API
curl -s "http://127.0.0.1:54321/rest/v1/" -H "apikey: eyJ..."

# Regenerate types (if needed)
supabase gen types typescript --local > src/types/database.types.ts
```

### File Locations
- Environment: `.env.local`
- Types: `src/types/database.types.ts`
- Supabase clients: `src/lib/supabase/`
- Components: `src/app/south/`

---

## 🎉 Remember
This environment is **WORKING PERFECTLY**. The goal is to keep it that way while adding new features and fixing issues. When in doubt, ask the user first! 