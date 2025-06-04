-- Create the qc_production_steps table
CREATE TABLE qc_production_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  value TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE qc_production_steps ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_qc_production_steps_value ON qc_production_steps(value);
CREATE INDEX idx_qc_production_steps_sort_order ON qc_production_steps(sort_order);
CREATE INDEX idx_qc_production_steps_is_active ON qc_production_steps(is_active);

-- RLS Policies
-- Allow authenticated users to view active steps
CREATE POLICY "Authenticated users can view active QC steps" ON qc_production_steps
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Only managers can modify QC steps
CREATE POLICY "Only managers can modify QC steps" ON qc_production_steps
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workers
      WHERE auth_user_id = (SELECT auth.uid())
      AND role = 'manager'
      AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workers
      WHERE auth_user_id = (SELECT auth.uid())
      AND role = 'manager'
      AND is_active = true
    )
  );

-- Insert default production steps
INSERT INTO qc_production_steps (value, label, sort_order) VALUES
  ('box_opening', 'Box Opening', 10),
  ('accessories_check', 'Accessories Check', 20),
  ('cosmetic_inspection', 'Cosmetic Inspection', 30),
  ('driver_matching', 'Driver Matching', 40),
  ('left_channel_test', 'Left Channel Test', 50),
  ('right_channel_test', 'Right Channel Test', 60),
  ('frequency_response', 'Frequency Response', 70),
  ('impedance_test', 'Impedance Test', 80),
  ('cable_test', 'Cable Test', 90),
  ('final_listening', 'Final Listening Test', 100),
  ('packaging_check', 'Packaging Check', 110),
  ('documentation', 'Documentation Review', 120),
  ('final_approval', 'Final Approval', 130);
