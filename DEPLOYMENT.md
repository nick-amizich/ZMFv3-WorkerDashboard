# Deployment Guide for Vercel

## Prerequisites
- Vercel account
- Supabase project set up with the database schema
- Shopify Private App (optional, can be configured later in Settings)

## Environment Variables

Set these in your Vercel project settings:

### Required Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Optional Variables
```
# For automated cron job security
CRON_SECRET=generate-a-secure-random-string

# Default Shopify config (can be set in Settings UI instead)
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_API_ACCESS_TOKEN=shpat_xxxxxxxxxxxxx
```

## Deployment Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Configure environment variables (see above)
   - Deploy

3. **Run Database Migrations**
   ```bash
   npx supabase db push --project-ref your-project-ref
   ```

4. **Configure Shopify (if not using env vars)**
   - Visit `/manager/settings` in your deployed app
   - Enter your Shopify store domain and API token
   - Test connection and save

## Post-Deployment

1. **Create Admin User**
   - Register a new account at `/register`
   - Manually update the user in Supabase to have `role: 'manager'` and `is_active: true`

2. **Set Up Cron Job (Optional)**
   - The vercel.json includes a cron job that runs every 15 minutes
   - To secure it, set the CRON_SECRET environment variable
   - The cron will automatically sync Shopify orders

3. **Monitor**
   - Check Vercel Functions logs for any sync errors
   - Monitor Supabase for database usage

## Troubleshooting

### Build Errors
- Ensure all TypeScript errors are fixed
- Check that Node.js version is >= 18.17.0

### Database Connection Issues
- Verify Supabase URL and keys are correct
- Check RLS policies are properly set up

### Shopify Sync Issues
- Verify API token has read permissions for Orders, Products, and Customers
- Check the Settings page for connection test
- Look at Vercel Function logs for detailed errors