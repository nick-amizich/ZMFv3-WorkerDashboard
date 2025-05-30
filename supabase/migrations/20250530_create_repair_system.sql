-- Create repair system tables
-- This migration creates all tables needed for the ZMF repair tracking system

-- 1. Main repair orders table
CREATE TABLE repair_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_number TEXT UNIQUE NOT NULL, -- REP-YYYY-####
  
  -- Source tracking
  repair_source TEXT CHECK (repair_source IN ('customer', 'internal')) NOT NULL,
  order_type TEXT CHECK (order_type IN ('customer_return', 'warranty', 'internal_qc')) NOT NULL,
  original_order_id UUID REFERENCES orders(id),
  original_order_number TEXT,
  
  -- Customer info
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  
  -- Product details
  model TEXT NOT NULL,
  serial_number TEXT,
  wood_type TEXT,
  
  -- Status and workflow
  status TEXT CHECK (status IN ('intake', 'diagnosed', 'approved', 'in_progress', 'testing', 'completed', 'shipped')) DEFAULT 'intake',
  priority TEXT CHECK (priority IN ('standard', 'rush')) DEFAULT 'standard',
  repair_type TEXT CHECK (repair_type IN ('production', 'finishing', 'sonic')) NOT NULL,
  location TEXT, -- Physical location
  
  -- Financial
  estimated_cost DECIMAL(10,2),
  final_cost DECIMAL(10,2),
  customer_approved BOOLEAN DEFAULT false,
  
  -- Assignment and dates
  assigned_to UUID REFERENCES workers(id),
  received_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  diagnosed_date TIMESTAMPTZ,
  approved_date TIMESTAMPTZ,
  started_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  shipped_date TIMESTAMPTZ,
  
  -- Notes
  customer_note TEXT,
  internal_notes TEXT,
  
  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES workers(id) NOT NULL
);

-- 2. Issues tracking
CREATE TABLE repair_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_order_id UUID REFERENCES repair_orders(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  specific_issue TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('cosmetic', 'functional', 'critical')),
  discovered_by UUID REFERENCES workers(id),
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Actions taken
CREATE TABLE repair_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_order_id UUID REFERENCES repair_orders(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_description TEXT NOT NULL,
  performed_by UUID REFERENCES workers(id),
  time_spent_minutes INTEGER,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Parts used
CREATE TABLE repair_parts_used (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_action_id UUID REFERENCES repair_actions(id) ON DELETE CASCADE,
  part_name TEXT NOT NULL,
  part_number TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Time tracking
CREATE TABLE repair_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_order_id UUID REFERENCES repair_orders(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES workers(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  work_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Photos
CREATE TABLE repair_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_order_id UUID REFERENCES repair_orders(id) ON DELETE CASCADE,
  photo_type TEXT CHECK (photo_type IN ('intake', 'diagnosis', 'before', 'after', 'completed')),
  storage_path TEXT NOT NULL,
  caption TEXT,
  uploaded_by UUID REFERENCES workers(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Knowledge base
CREATE TABLE repair_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_order_id UUID REFERENCES repair_orders(id),
  model TEXT NOT NULL,
  issue_category TEXT NOT NULL,
  issue_description TEXT NOT NULL,
  solution_description TEXT NOT NULL,
  technician_id UUID REFERENCES workers(id),
  technician_name TEXT,
  time_to_repair_minutes INTEGER,
  parts_used JSONB,
  success_rate DECIMAL(3,2),
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Notifications log
CREATE TABLE repair_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_order_id UUID REFERENCES repair_orders(id) ON DELETE CASCADE,
  notification_type TEXT CHECK (notification_type IN ('intake_confirmation', 'diagnosis_complete', 'approval_required', 'work_started', 'completed', 'shipped')),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_repair_orders_status ON repair_orders(status);
CREATE INDEX idx_repair_orders_assigned_to ON repair_orders(assigned_to);
CREATE INDEX idx_repair_orders_repair_number ON repair_orders(repair_number);
CREATE INDEX idx_repair_orders_customer_email ON repair_orders(customer_email);
CREATE INDEX idx_repair_orders_created_at ON repair_orders(created_at DESC);
CREATE INDEX idx_repair_issues_repair_order_id ON repair_issues(repair_order_id);
CREATE INDEX idx_repair_actions_repair_order_id ON repair_actions(repair_order_id);
CREATE INDEX idx_repair_time_logs_repair_order_id ON repair_time_logs(repair_order_id);
CREATE INDEX idx_repair_time_logs_worker_id ON repair_time_logs(worker_id);
CREATE INDEX idx_repair_knowledge_base_model_category ON repair_knowledge_base(model, issue_category);

-- Enable RLS on all tables
ALTER TABLE repair_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_parts_used ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for repair_orders
CREATE POLICY "Workers can view all repairs" ON repair_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE workers.auth_user_id = auth.uid() 
      AND workers.active = true
    )
  );

CREATE POLICY "Workers can create repairs" ON repair_orders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE workers.auth_user_id = auth.uid() 
      AND workers.active = true
    )
  );

CREATE POLICY "Workers can update repairs" ON repair_orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE workers.auth_user_id = auth.uid() 
      AND workers.active = true
    )
  );

-- RLS Policies for repair_issues
CREATE POLICY "Workers can view all repair issues" ON repair_issues
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE workers.auth_user_id = auth.uid() 
      AND workers.active = true
    )
  );

CREATE POLICY "Workers can manage repair issues" ON repair_issues
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE workers.auth_user_id = auth.uid() 
      AND workers.active = true
    )
  );

-- RLS Policies for repair_actions
CREATE POLICY "Workers can view all repair actions" ON repair_actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE workers.auth_user_id = auth.uid() 
      AND workers.active = true
    )
  );

CREATE POLICY "Workers can manage repair actions" ON repair_actions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE workers.auth_user_id = auth.uid() 
      AND workers.active = true
    )
  );

-- RLS Policies for repair_parts_used
CREATE POLICY "Workers can view all repair parts" ON repair_parts_used
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE workers.auth_user_id = auth.uid() 
      AND workers.active = true
    )
  );

CREATE POLICY "Workers can manage repair parts" ON repair_parts_used
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE workers.auth_user_id = auth.uid() 
      AND workers.active = true
    )
  );

-- RLS Policies for repair_time_logs
CREATE POLICY "Workers can view all time logs" ON repair_time_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE workers.auth_user_id = auth.uid() 
      AND workers.active = true
    )
  );

CREATE POLICY "Workers can manage their own time logs" ON repair_time_logs
  FOR ALL USING (
    worker_id IN (
      SELECT id FROM workers 
      WHERE workers.auth_user_id = auth.uid() 
      AND workers.active = true
    )
  );

-- RLS Policies for repair_photos
CREATE POLICY "Workers can view all repair photos" ON repair_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE workers.auth_user_id = auth.uid() 
      AND workers.active = true
    )
  );

CREATE POLICY "Workers can manage repair photos" ON repair_photos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE workers.auth_user_id = auth.uid() 
      AND workers.active = true
    )
  );

-- RLS Policies for repair_knowledge_base
CREATE POLICY "Workers can view all knowledge base entries" ON repair_knowledge_base
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE workers.auth_user_id = auth.uid() 
      AND workers.active = true
    )
  );

CREATE POLICY "Workers can manage knowledge base" ON repair_knowledge_base
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE workers.auth_user_id = auth.uid() 
      AND workers.active = true
    )
  );

-- RLS Policies for repair_notifications
CREATE POLICY "Workers can view all notifications" ON repair_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE workers.auth_user_id = auth.uid() 
      AND workers.active = true
    )
  );

CREATE POLICY "Workers can manage notifications" ON repair_notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE workers.auth_user_id = auth.uid() 
      AND workers.active = true
    )
  );

-- Function to generate repair numbers
CREATE OR REPLACE FUNCTION generate_repair_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  sequence_number INTEGER;
  new_repair_number TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(repair_number FROM 10) AS INTEGER)), 0) + 1
  INTO sequence_number
  FROM repair_orders
  WHERE repair_number LIKE 'REP-' || year_part || '-%';
  
  new_repair_number := 'REP-' || year_part || '-' || LPAD(sequence_number::TEXT, 4, '0');
  
  RETURN new_repair_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_repair_orders_updated_at BEFORE UPDATE ON repair_orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_repair_knowledge_base_updated_at BEFORE UPDATE ON repair_knowledge_base
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions for Supabase service role
GRANT ALL ON repair_orders TO service_role;
GRANT ALL ON repair_issues TO service_role;
GRANT ALL ON repair_actions TO service_role;
GRANT ALL ON repair_parts_used TO service_role;
GRANT ALL ON repair_time_logs TO service_role;
GRANT ALL ON repair_photos TO service_role;
GRANT ALL ON repair_knowledge_base TO service_role;
GRANT ALL ON repair_notifications TO service_role;

-- Grant permissions for authenticated users (through RLS)
GRANT ALL ON repair_orders TO authenticated;
GRANT ALL ON repair_issues TO authenticated;
GRANT ALL ON repair_actions TO authenticated;
GRANT ALL ON repair_parts_used TO authenticated;
GRANT ALL ON repair_time_logs TO authenticated;
GRANT ALL ON repair_photos TO authenticated;
GRANT ALL ON repair_knowledge_base TO authenticated;
GRANT ALL ON repair_notifications TO authenticated;