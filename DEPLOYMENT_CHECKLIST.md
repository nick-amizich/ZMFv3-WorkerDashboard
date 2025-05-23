# Deployment Checklist for Vercel

## Pre-deployment

- [x] TypeScript errors fixed
- [x] Build succeeds locally (`npm run build`)
- [x] Database types include settings table
- [x] Environment variables documented
- [x] vercel.json configured
- [x] Node.js version specified (>=18.17.0)

## Vercel Setup

1. **Environment Variables to Set:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://kjdicpudxqxenhjwdrzg.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   CRON_SECRET=generate-secure-random-string
   ```

2. **Database Migration:**
   - Run the settings table migration in Supabase:
   ```sql
   -- Copy contents of supabase/migrations/20250123_create_settings_table.sql
   ```

3. **First User Setup:**
   - Register at `/register`
   - Update user in Supabase:
   ```sql
   UPDATE workers 
   SET role = 'manager', is_active = true 
   WHERE email = 'your-email@example.com';
   ```

## Post-deployment

1. **Configure Shopify:**
   - Visit `/manager/settings`
   - Enter store domain and API token
   - Test connection
   - Enable automatic sync

2. **Test Core Features:**
   - [ ] Login/logout works
   - [ ] Manager can access settings
   - [ ] Shopify sync works
   - [ ] Task creation works
   - [ ] Worker assignment works
   - [ ] Worker can view tasks

3. **Monitor:**
   - Check Vercel Functions logs
   - Verify cron job runs every 15 minutes
   - Monitor Supabase usage

## Troubleshooting

### Common Issues:
1. **Build fails** - Check Node version and TypeScript errors
2. **Auth fails** - Verify Supabase keys are correct
3. **Sync fails** - Check Shopify credentials in Settings
4. **No data** - Run manual sync from Orders page

### Support:
- Vercel logs: https://vercel.com/[your-team]/[your-project]/functions
- Supabase dashboard: https://supabase.com/dashboard/project/kjdicpudxqxenhjwdrzg