# 🛠️ ZMF V3 Troubleshooting Guide

**Common issues, quick fixes, and SQL solutions**

---

## 🚨 Common Issues & Quick Fixes

### 1. **Webpack Module Error**

**Error**: `Cannot find module './4447.js'`

**Cause**: Next.js webpack hot reload issue (not Supabase)

**Solutions** (in order of preference):
```bash
# 1. Clear Next.js cache (safest)
rm -rf .next
npm run dev

# 2. Clear node modules (if #1 doesn't work)
rm -rf .next node_modules
npm install
npm run dev

# 3. Restart Docker (if still having issues)
docker restart $(docker ps -q)
supabase stop
supabase start
npm run dev
```

### 2. **Empty Tasks Page**

**Issue**: No tasks showing in manager or worker dashboards

**Cause**: No tasks exist in database

**Solution**:
1. Import orders first: `/manager/orders/import`
2. Select specific order items to import
3. Tasks will be created automatically

### 3. **User Approval Not Working**

**Issue**: Pending users not appearing in `/manager/users`

**Troubleshooting**:
1. Check if anyone has actually registered
2. Verify your role is 'manager'
3. Look in Supabase dashboard → Authentication → Users
4. Check workers table for approval_status column

**SQL Check**:
```sql
-- See all workers and their approval status
SELECT id, name, email, approval_status, created_at 
FROM workers 
ORDER BY created_at DESC;
```

### 4. **Email Confirmations Redirect to Localhost**

**Issue**: Production email links redirect to localhost

**Cause**: Supabase Site URL still set to localhost

**Fix**:
1. Go to Supabase Dashboard → Settings → General
2. Change Site URL from `http://localhost:3000` to production URL
3. Update redirect URLs in Authentication settings

### 5. **Quality Features Not Loading**

**Issue**: V3 quality features not accessible

**Solutions**:
1. Verify database migrations are applied
2. Check that V3 tables exist
3. Regenerate TypeScript types
4. Test with `/manager/workflow-test`

---

## 🗄️ Database Issues & SQL Fixes

### Fix Active Properties

**Issue**: Inconsistent `is_active` vs `active` field usage

**SQL Fix**:
```sql
-- Standardize to is_active
ALTER TABLE workers 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

UPDATE workers 
SET is_active = active 
WHERE is_active IS NULL;

-- Update any references to use is_active consistently
```

### Create Missing Manager

**Issue**: No manager exists to approve users

**SQL Fix**:
```sql
-- Make first user a manager
UPDATE workers 
SET 
  role = 'manager',
  approval_status = 'approved',
  approved_at = NOW(),
  is_active = true
WHERE id = (
  SELECT id FROM workers 
  ORDER BY created_at ASC 
  LIMIT 1
);
```

### Fix User Approval Status

**Issue**: Users stuck in pending status

**SQL Fix**:
```sql
-- Approve all pending users (use carefully)
UPDATE workers 
SET 
  approval_status = 'approved',
  approved_at = NOW()
WHERE approval_status = 'pending';

-- Or approve specific user
UPDATE workers 
SET 
  approval_status = 'approved',
  approved_at = NOW()
WHERE email = 'user@example.com';
```

### Reset User Password (via Supabase)

**Issue**: User can't log in

**SQL Fix**:
```sql
-- Check user exists in auth.users
SELECT id, email, email_confirmed_at 
FROM auth.users 
WHERE email = 'user@example.com';

-- If user exists but can't log in, use Supabase dashboard to:
-- 1. Go to Authentication → Users
-- 2. Find user and click "Send password reset"
```

### Clean Up Test Data

**Issue**: Too much test data cluttering system

**SQL Fix**:
```sql
-- Remove test workers (be careful!)
DELETE FROM workers 
WHERE email LIKE '%test%' 
   OR name LIKE '%Test%';

-- Remove test orders
DELETE FROM orders 
WHERE order_number LIKE 'TEST%';

-- Remove test tasks
DELETE FROM work_tasks 
WHERE description LIKE '%test%';
```

---

## 🔧 TypeScript & Build Issues

### Type Generation Errors

**Issue**: Database types out of sync

**Solutions**:
```bash
# Regenerate types
supabase gen types typescript --local > src/types/database.types.ts

# Or for remote
supabase gen types typescript --project-id kjdicpudxqxenhjwdrzg > src/types/database.types.ts

# Check imports use correct path
# Should be: '@/types/database.types'
# NOT: '@/types/database'
```

### Build Failures

**Issue**: `npm run build` fails

**Common Fixes**:
1. Fix TypeScript errors first
2. Check for missing imports
3. Verify environment variables
4. Clear .next cache

```bash
# Debug build issues
npm run build 2>&1 | tee build.log

# Common fixes
rm -rf .next
npm run typecheck
npm run lint --fix
npm run build
```

---

## 🌐 Network & API Issues

### Supabase Connection Issues

**Issue**: Can't connect to Supabase

**Troubleshooting**:
```bash
# Check Supabase status
supabase status

# Test API connectivity
curl -s "http://127.0.0.1:54321/rest/v1/workers?limit=1" \
  -H "apikey: YOUR_ANON_KEY"

# Check environment variables
cat .env.local | grep SUPABASE
```

### API Endpoint Errors

**Issue**: API routes returning errors

**Debugging**:
1. Check browser console for errors
2. Look at network tab for failed requests
3. Check `/manager/logs` for server errors
4. Use `/manager/workflow-test` to test endpoints

### Shopify Integration Issues

**Issue**: Can't import orders from Shopify

**Solutions**:
1. Verify API token has correct permissions
2. Check store domain is correct
3. Test connection in `/manager/settings`
4. Look for rate limiting errors

---

## 📱 Mobile & UI Issues

### Mobile Interface Problems

**Issue**: Interface not working on mobile

**Solutions**:
1. Check viewport meta tag exists
2. Test on actual device, not just browser resize
3. Check for touch event handlers
4. Verify responsive CSS classes

### Navigation Issues

**Issue**: Can't access certain pages

**Solutions**:
1. Check user role permissions
2. Verify navigation component includes all routes
3. Check for JavaScript errors
4. Clear browser cache

---

## 🔐 Authentication Issues

### Login Failures

**Issue**: Users can't log in

**Troubleshooting**:
1. Check email is confirmed
2. Verify user is approved (if approval system enabled)
3. Check user is active
4. Verify password is correct

**SQL Checks**:
```sql
-- Check user status
SELECT 
  w.email,
  w.approval_status,
  w.is_active,
  au.email_confirmed_at
FROM workers w
JOIN auth.users au ON w.auth_user_id = au.id
WHERE w.email = 'user@example.com';
```

### Session Issues

**Issue**: Users get logged out frequently

**Solutions**:
1. Check session timeout settings
2. Verify JWT secret is consistent
3. Check for clock skew issues
4. Review Supabase auth settings

---

## 🧪 Testing & Development Issues

### Test Data Creation

**Issue**: Need test data for development

**SQL Solutions**:
```sql
-- Create test worker
INSERT INTO workers (
  name, email, role, approval_status, is_active, auth_user_id
) VALUES (
  'Test Worker', 'test@example.com', 'worker', 'approved', true, 
  gen_random_uuid()
);

-- Create test order
INSERT INTO orders (
  order_number, customer_name, status, total_amount
) VALUES (
  'TEST-001', 'Test Customer', 'pending', 100.00
);

-- Create test task
INSERT INTO work_tasks (
  title, description, status, assigned_to
) VALUES (
  'Test Task', 'Test task description', 'pending', 
  (SELECT id FROM workers WHERE email = 'test@example.com')
);
```

### Performance Issues

**Issue**: Slow page loads or queries

**Solutions**:
1. Check database indexes
2. Optimize queries with EXPLAIN
3. Add pagination for large datasets
4. Monitor Supabase performance metrics

**SQL Performance Check**:
```sql
-- Check slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_workers_email ON workers(email);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON work_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
```

---

## 🚨 Emergency Procedures

### System Recovery

**If system is completely broken**:
1. Check Supabase status first
2. Verify environment variables
3. Check recent deployments
4. Review error logs
5. Rollback if necessary

### Data Recovery

**If data is lost or corrupted**:
1. Check Supabase backups
2. Review recent migrations
3. Check for accidental deletions
4. Restore from backup if available

### Security Incidents

**If security issue suspected**:
1. Rotate API keys immediately
2. Check access logs
3. Review user permissions
4. Update passwords
5. Audit recent changes

---

## 📞 Getting Help

### Self-Service Resources
1. **Check logs**: `/manager/logs`
2. **Run tests**: `/manager/workflow-test`
3. **Supabase dashboard**: Monitor database
4. **Browser console**: Check for JavaScript errors

### Documentation
- [Development Guide](./DEVELOPMENT_GUIDE.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Feature Guides](./FEATURE_GUIDES.md)
- [Project Status](./PROJECT_STATUS.md)

### External Resources
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Documentation](https://vercel.com/docs)

---

**💡 Remember**: When in doubt, check the logs first, then test with known good data, and always backup before making major changes! 