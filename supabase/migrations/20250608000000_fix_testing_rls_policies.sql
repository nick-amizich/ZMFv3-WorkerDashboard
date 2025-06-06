-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Managers can view all test data" ON test_runs;
DROP POLICY IF EXISTS "Managers can view all test results" ON test_results;

-- Create new policies that allow service role access for automated testing

-- Test runs - allow service role and managers full access
CREATE POLICY "Service role and managers can manage test runs" ON test_runs
  FOR ALL USING (
    -- Allow service role (for test reporter)
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR
    -- Allow managers and admins
    EXISTS (
      SELECT 1 FROM workers 
      WHERE workers.id = auth.uid() 
      AND workers.role IN ('admin', 'manager')
    )
  );

-- Test results - allow service role and managers full access  
CREATE POLICY "Service role and managers can manage test results" ON test_results
  FOR ALL USING (
    -- Allow service role
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR
    -- Allow managers and admins
    EXISTS (
      SELECT 1 FROM workers 
      WHERE workers.id = auth.uid() 
      AND workers.role IN ('admin', 'manager')
    )
  );

-- Test coverage - allow service role and managers full access
CREATE POLICY "Service role and managers can manage test coverage" ON test_coverage
  FOR ALL USING (
    -- Allow service role
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR
    -- Allow managers and admins
    EXISTS (
      SELECT 1 FROM workers 
      WHERE workers.id = auth.uid() 
      AND workers.role IN ('admin', 'manager')
    )
  );

-- Update error logs policy to allow service role inserts
DROP POLICY IF EXISTS "Anyone can insert error logs" ON error_logs;
CREATE POLICY "Service role and authenticated users can insert error logs" ON error_logs
  FOR INSERT WITH CHECK (
    -- Allow service role
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR
    -- Allow any authenticated user
    auth.uid() IS NOT NULL
  );

-- Update performance metrics policy to allow service role inserts
DROP POLICY IF EXISTS "Anyone can insert performance metrics" ON performance_metrics;
CREATE POLICY "Service role and authenticated users can insert performance metrics" ON performance_metrics
  FOR INSERT WITH CHECK (
    -- Allow service role
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR
    -- Allow any authenticated user
    auth.uid() IS NOT NULL
  );

-- Ensure managers can view all testing data
CREATE POLICY "Managers can view error logs" ON error_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE workers.id = auth.uid() 
      AND workers.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Managers can view performance metrics" ON performance_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE workers.id = auth.uid() 
      AND workers.role IN ('admin', 'manager')
    )
  );