-- Quick fix: Update the existing settings row to remove the RLS issue
-- First, let's check what's in the table
SELECT * FROM public.settings WHERE key = 'shopify_config';

-- Option 1: Temporarily disable RLS to update (run these one by one)
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;

-- Now try saving in the app, then re-enable RLS:
-- ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Option 2: Or just delete the default row and let the app create a new one
-- DELETE FROM public.settings WHERE key = 'shopify_config';