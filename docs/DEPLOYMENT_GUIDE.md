# 🚀 ZMF V3 Deployment Guide

**Complete guide for deploying the ZMF Worker Dashboard to production**

---

## 📋 Prerequisites

Before starting deployment, ensure you have:
- Vercel account with GitHub integration
- Supabase project set up (Project ID: kjdicpudxqxenhjwdrzg)
- Shopify Private App credentials (optional, can be configured later)
- Domain configured (e.g., zmf.randomtask.us)

---

## 🔧 Pre-Deployment Checklist

### ✅ Code Quality
- [ ] All TypeScript errors fixed
- [ ] Build succeeds locally (`npm run build`)
- [ ] No linting errors (`npm run lint`)
- [ ] All tests passing (if applicable)

### ✅ Environment Setup
- [ ] Environment variables documented
- [ ] Database migrations ready
- [ ] Node.js version >= 18.17.0
- [ ] vercel.json configured

### ✅ Security Review
- [ ] No hardcoded secrets in code
- [ ] RLS enabled on all database tables
- [ ] Service role keys properly secured
- [ ] Auth patterns follow best practices

---

## 🗄️ Database Migration (Required)

### Step 1: Apply V3.1 Migrations

Since the Supabase CLI may have migration history issues, apply migrations manually:

#### Option A: Using Supabase Dashboard SQL Editor (Recommended)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/kjdicpudxqxenhjwdrzg)
2. Navigate to the SQL Editor
3. Apply migrations in this order:

**1. V3 Automation Rules:**
```sql
-- Copy contents from: supabase/migrations/20250130_v3_automation_rules.sql
```

**2. V3 Quality System (Corrected):**
```sql
-- Copy contents from: supabase/migrations/20250131_v3_quality_system_corrected.sql
```

**3. User Management System:**
```sql
-- Copy contents from: supabase/migrations/20250133_user_management_system.sql
```

#### Option B: Using Supabase CLI (if migration history is fixed)

```bash
# Link to project
npx supabase link --project-ref kjdicpudxqxenhjwdrzg

# Push migrations
npx supabase db push
```

### Step 2: Generate Updated TypeScript Types

```bash
# Generate types
npx supabase gen types typescript --project-id kjdicpudxqxenhjwdrzg > src/types/database.ts

# Or use the script
./scripts/generate-types.sh
```

### Step 3: Verify Migration Success

Check that these tables exist:
- `component_tracking`
- `quality_checkpoints`
- `inspection_results`
- `quality_patterns`
- `quality_holds`
- `quality_checkpoint_templates`
- `worker_invitations`
- `user_management_audit_log`

And that `workers` table has new columns:
- `approval_status`
- `approved_by`
- `approved_at`
- `rejection_reason`
- `suspension_reason`
- `suspended_at`

---

## 🌐 Vercel Deployment

### Step 1: Environment Variables

Set these in your Vercel project settings:

#### Required Variables
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://kjdicpudxqxenhjwdrzg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application
NODE_ENV=production
```

#### Optional Variables
```env
# For automated cron job security
CRON_SECRET=generate-a-secure-random-string

# Default Shopify config (can be set in Settings UI instead)
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_API_ACCESS_TOKEN=shpat_xxxxxxxxxxxxx
```

### Step 2: Deploy to Vercel

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for production deployment"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Configure environment variables (see above)
   - Deploy

3. **Verify Build Success**
   - Check that all 39+ pages generate successfully
   - Monitor build logs for any errors
   - Verify deployment URL is accessible

---

## 🚨 CRITICAL: Supabase Configuration Update

**This step is MANDATORY for email confirmations to work correctly:**

### Update Supabase Site URL

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**: kjdicpudxqxenhjwdrzg
3. **Go to**: Settings → General → Site URL
4. **Change Site URL** from `http://localhost:3000` to `https://zmf.randomtask.us`

### Update Authentication URLs

1. **Go to**: Authentication → URL Configuration
2. **Add Redirect URLs**:
   - `https://zmf.randomtask.us/auth/callback`
   - `https://zmf.randomtask.us/login`
   - `https://zmf.randomtask.us/manager/dashboard`
   - `https://zmf.randomtask.us/worker/dashboard`

**⚠️ If you skip this step, email confirmation links will redirect to localhost!**

---

## 👤 Initial User Setup

### Create First Manager Account

Since all users now require approval, you need at least one approved manager:

```sql
-- Run this in Supabase SQL Editor
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

### Alternative: Register and Manually Approve

1. Register a new account at `/register`
2. Manually update the user in Supabase:
   ```sql
   UPDATE workers 
   SET 
     role = 'manager', 
     approval_status = 'approved',
     approved_at = NOW()
   WHERE email = 'your-email@example.com';
   ```

---

## 🧪 Post-Deployment Testing

### Core Authentication Flow
- [ ] Registration flow with email confirmation
- [ ] Email links redirect to production (not localhost)
- [ ] Login with existing accounts
- [ ] Manager dashboard access
- [ ] Worker dashboard access
- [ ] User approval workflow

### Feature Testing
- [ ] Shopify integration (if configured)
- [ ] Task creation and assignment
- [ ] Quality control workflows
- [ ] User management features
- [ ] API endpoints responding correctly

### Performance Testing
- [ ] Page load times acceptable
- [ ] Database queries performing well
- [ ] No console errors in browser
- [ ] Mobile responsiveness

---

## ⚙️ Optional: Shopify Configuration

### Option 1: Environment Variables (Recommended for Production)
Set `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_API_ACCESS_TOKEN` in Vercel.

### Option 2: Settings UI (Flexible)
1. Visit `/manager/settings` in your deployed app
2. Enter your Shopify store domain and API token
3. Test connection and save
4. Enable automatic sync if desired

---

## 📊 Monitoring & Maintenance

### Set Up Monitoring
1. **Vercel Functions Logs**: Monitor for sync errors and performance
2. **Supabase Dashboard**: Watch database usage and query performance
3. **Error Tracking**: Check application logs regularly

### Automated Tasks
- The vercel.json includes a cron job that runs every 15 minutes
- Secure it by setting the `CRON_SECRET` environment variable
- Monitor cron job execution in Vercel Functions logs

### Regular Maintenance
- Monitor database storage usage
- Review and rotate API keys periodically
- Update dependencies regularly
- Backup critical data

---

## 🛠️ Troubleshooting

### Build Errors
- **Node.js version**: Ensure >= 18.17.0
- **TypeScript errors**: Fix all type violations
- **Missing dependencies**: Check package.json
- **Environment variables**: Verify all required vars are set

### Database Connection Issues
- **Supabase URL**: Verify correct project URL
- **API keys**: Check anon and service role keys
- **RLS policies**: Ensure policies are properly configured
- **Network**: Check for firewall or proxy issues

### Authentication Issues
- **Site URL**: Must match production domain exactly
- **Redirect URLs**: Include all necessary callback URLs
- **Email delivery**: Check Supabase email settings
- **CORS**: Verify domain is whitelisted

### Shopify Sync Issues
- **API permissions**: Verify token has read permissions for Orders, Products, Customers
- **Store domain**: Must be exact Shopify store name
- **Rate limits**: Monitor for API rate limiting
- **Network connectivity**: Check for connection issues

### Performance Issues
- **Database queries**: Optimize slow queries
- **Image optimization**: Ensure Next.js image optimization is working
- **Caching**: Verify proper caching headers
- **Bundle size**: Monitor JavaScript bundle sizes

---

## 🎯 Success Criteria

### Deployment is Successful When:
- ✅ All pages load without errors
- ✅ Authentication flow works end-to-end
- ✅ Email confirmations redirect to production
- ✅ Database operations function correctly
- ✅ User approval workflow operates properly
- ✅ Manager can access all admin features
- ✅ Workers can complete assigned tasks
- ✅ No console errors in browser
- ✅ Mobile interface is responsive

### Production Quality Indicators:
- 🔒 **Security**: No exposed secrets, RLS enforced
- 🎨 **UX**: Professional interface, clear error messages
- 🚀 **Performance**: Fast page loads, efficient queries
- 🔧 **Reliability**: Graceful error handling, comprehensive logging
- 📱 **Accessibility**: Mobile-friendly, keyboard navigation

---

## 📞 Support & Resources

### Documentation
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)

### Quick Commands
```bash
# Verify configuration
npm run verify:config

# Test build locally
npm run build

# Check TypeScript compliance
npm run typecheck

# Deploy to production
git push origin main  # Auto-deploys via Vercel
```

### Emergency Contacts
- **Vercel Support**: Available through dashboard
- **Supabase Support**: Available through dashboard
- **Project Repository**: GitHub issues for code-related problems

---

**🎉 Congratulations! Your ZMF Worker Dashboard is now production-ready with enterprise-grade security, professional user experience, and comprehensive monitoring.** 