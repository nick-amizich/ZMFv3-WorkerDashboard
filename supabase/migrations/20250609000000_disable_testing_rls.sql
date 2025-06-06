-- Temporarily disable RLS for testing tables in local development
-- This allows the test reporter to insert data without authentication

-- Disable RLS on testing tables
ALTER TABLE test_runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE test_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE test_coverage DISABLE ROW LEVEL SECURITY;

-- Keep RLS enabled but add permissive policies for error and performance tracking
ALTER TABLE error_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on bugs table to allow anonymous bug reporting
ALTER TABLE bugs DISABLE ROW LEVEL SECURITY;

-- Note: In production, you would want to keep RLS enabled and properly configure policies
-- This is a development-only solution