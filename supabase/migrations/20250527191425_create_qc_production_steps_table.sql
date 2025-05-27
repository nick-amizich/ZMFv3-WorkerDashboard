-- Create QC Production Steps table
CREATE TABLE IF NOT EXISTS qc_production_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE qc_production_steps ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "QC steps are viewable by authenticated users" ON qc_production_steps
  FOR SELECT TO authenticated
  USING (true);

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

-- Indexes for performance
CREATE INDEX idx_qc_production_steps_value ON qc_production_steps(value);
CREATE INDEX idx_qc_production_steps_sort_order ON qc_production_steps(sort_order);
CREATE INDEX idx_qc_production_steps_active ON qc_production_steps(is_active);

-- Insert default production steps
INSERT INTO qc_production_steps (value, label, sort_order) VALUES
('inventory_intake', '1. Inventory Intake', 10),
('sanding_pre_work', '2. Sanding - Pre-Work', 20),
('sanding_post_work', '2. Sanding - Post-Work', 30),
('finishing_pre_work', '3. Finishing - Pre-Work', 40),
('finishing_post_work', '3. Finishing - Post-Work', 50),
('sub_assembly_chassis_pre_work', '4. Sub-assembly: Chassis - Pre-Work', 60),
('sub_assembly_chassis_post_work', '4. Sub-assembly: Chassis - Post-Work', 70),
('sub_assembly_baffle_pre_work', '5. Sub-assembly: Baffle - Pre-Work', 80),
('sub_assembly_baffle_post_work', '5. Sub-assembly: Baffle - Post-Work', 90),
('final_production', '6. Final Production', 100),
('final_assembly', '6.5 Final Assembly', 110),
('acoustic_aesthetic_qc', '7. Acoustic and Aesthetic QC', 120),
('shipping', '8. Shipping', 130);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_qc_production_steps_updated_at 
BEFORE UPDATE ON qc_production_steps 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
