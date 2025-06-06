-- Create test results tables
CREATE TABLE IF NOT EXISTS test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_number SERIAL UNIQUE,
  branch TEXT NOT NULL DEFAULT 'main',
  commit_sha TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_tests INTEGER DEFAULT 0,
  passed_tests INTEGER DEFAULT 0,
  failed_tests INTEGER DEFAULT 0,
  skipped_tests INTEGER DEFAULT 0,
  coverage_percentage DECIMAL(5,2),
  status TEXT CHECK (status IN ('running', 'passed', 'failed', 'cancelled')) DEFAULT 'running',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_run_id UUID REFERENCES test_runs(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  test_path TEXT NOT NULL,
  suite_name TEXT,
  status TEXT CHECK (status IN ('passed', 'failed', 'skipped', 'pending')),
  duration_ms INTEGER,
  error_message TEXT,
  error_stack TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create bug tracking tables
CREATE TABLE IF NOT EXISTS bugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  component TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'wont_fix')) DEFAULT 'open',
  reported_by UUID REFERENCES workers(id),
  assigned_to UUID REFERENCES workers(id),
  error_message TEXT,
  error_stack TEXT,
  user_agent TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Create error tracking tables
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  component TEXT,
  user_id UUID REFERENCES workers(id),
  session_id TEXT,
  url TEXT,
  user_agent TEXT,
  ip_address INET,
  severity TEXT CHECK (severity IN ('fatal', 'error', 'warning', 'info')) DEFAULT 'error',
  environment TEXT DEFAULT 'production',
  additional_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create performance monitoring tables
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT CHECK (metric_type IN ('api', 'database', 'render', 'custom')) NOT NULL,
  endpoint TEXT,
  method TEXT,
  duration_ms INTEGER NOT NULL,
  status_code INTEGER,
  user_id UUID REFERENCES workers(id),
  session_id TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create test coverage tables
CREATE TABLE IF NOT EXISTS test_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_run_id UUID REFERENCES test_runs(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  statements_total INTEGER DEFAULT 0,
  statements_covered INTEGER DEFAULT 0,
  branches_total INTEGER DEFAULT 0,
  branches_covered INTEGER DEFAULT 0,
  functions_total INTEGER DEFAULT 0,
  functions_covered INTEGER DEFAULT 0,
  lines_total INTEGER DEFAULT 0,
  lines_covered INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_test_runs_status ON test_runs(status);
CREATE INDEX idx_test_runs_created_at ON test_runs(created_at DESC);
CREATE INDEX idx_test_results_test_run_id ON test_results(test_run_id);
CREATE INDEX idx_test_results_status ON test_results(status);
CREATE INDEX idx_bugs_status ON bugs(status);
CREATE INDEX idx_bugs_severity ON bugs(severity);
CREATE INDEX idx_bugs_component ON bugs(component);
CREATE INDEX idx_bugs_created_at ON bugs(created_at DESC);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_component ON error_logs(component);
CREATE INDEX idx_performance_metrics_timestamp ON performance_metrics(timestamp DESC);
CREATE INDEX idx_performance_metrics_endpoint ON performance_metrics(endpoint);

-- Create views for dashboard
CREATE OR REPLACE VIEW bug_summary AS
SELECT 
  component,
  COUNT(*) as total_bugs,
  COUNT(*) FILTER (WHERE severity = 'critical') as critical_bugs,
  COUNT(*) FILTER (WHERE severity = 'high') as high_bugs,
  COUNT(*) FILTER (WHERE severity = 'medium') as medium_bugs,
  COUNT(*) FILTER (WHERE severity = 'low') as low_bugs,
  COUNT(*) FILTER (WHERE status = 'open') as open_bugs,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as new_bugs_24h
FROM bugs
GROUP BY component;

CREATE OR REPLACE VIEW error_summary AS
SELECT 
  component,
  COUNT(*) as total_errors,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as errors_last_hour,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as errors_last_24h,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as errors_last_7d
FROM error_logs
WHERE component IS NOT NULL
GROUP BY component;

CREATE OR REPLACE VIEW performance_summary AS
SELECT 
  endpoint,
  metric_type,
  COUNT(*) as request_count,
  AVG(duration_ms)::INTEGER as avg_duration_ms,
  MAX(duration_ms) as max_duration_ms,
  MIN(duration_ms) as min_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::INTEGER as p95_duration_ms
FROM performance_metrics
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY endpoint, metric_type;

-- Enable RLS
ALTER TABLE test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE bugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_coverage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow managers and admins to see everything)
CREATE POLICY "Managers can view all test data" ON test_runs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE workers.id = auth.uid() 
      AND workers.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Managers can view all test results" ON test_results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE workers.id = auth.uid() 
      AND workers.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Anyone can report bugs" ON bugs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Managers can manage all bugs" ON bugs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE workers.id = auth.uid() 
      AND workers.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Workers can view their own bugs" ON bugs
  FOR SELECT USING (
    reported_by = auth.uid() OR
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM workers 
      WHERE workers.id = auth.uid() 
      AND workers.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "System can log errors" ON error_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Managers can view all errors" ON error_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE workers.id = auth.uid() 
      AND workers.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "System can log performance metrics" ON performance_metrics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Managers can view all performance metrics" ON performance_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE workers.id = auth.uid() 
      AND workers.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Managers can view all test coverage" ON test_coverage
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE workers.id = auth.uid() 
      AND workers.role IN ('admin', 'manager')
    )
  );