-- South Expansion Tables Migration
-- This migration adds all necessary tables for the South location machine shop features

-- 1. Create locations table (needed for facility transfers)
CREATE TABLE IF NOT EXISTS public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  address text,
  city text,
  state text,
  zip text,
  country text DEFAULT 'USA',
  is_active boolean DEFAULT true,
  capabilities text[] DEFAULT '{}', -- e.g. {'manufacturing', 'assembly', 'machining', 'warehouse'}
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Insert default locations
INSERT INTO public.locations (name, display_name, capabilities) VALUES
  ('north', 'North Office - Assembly', ARRAY['assembly', 'warehouse']),
  ('south', 'South Office - Machine Shop', ARRAY['manufacturing', 'machining'])
ON CONFLICT (name) DO NOTHING;

-- 2. Create parts_catalog table
CREATE TABLE IF NOT EXISTS public.parts_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_name text NOT NULL,
  part_type text NOT NULL CHECK (part_type IN ('cup', 'baffle', 'driver_mount', 'connector', 'other')),
  species text, -- Wood species if applicable
  specifications jsonb DEFAULT '{}',
  material_cost decimal(10,2),
  estimated_labor_hours decimal(10,2),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create production_requests table
CREATE TABLE IF NOT EXISTS public.production_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number text UNIQUE NOT NULL DEFAULT 'PR-' || LPAD(FLOOR(RANDOM() * 99999)::text, 5, '0'),
  customer_name text NOT NULL,
  part_id uuid REFERENCES public.parts_catalog(id),
  quantity_ordered integer NOT NULL,
  quantity_completed integer DEFAULT 0,
  due_date date NOT NULL,
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'rush')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_production', 'completed', 'on_hold', 'cancelled')),
  location text DEFAULT 'south',
  unit_price decimal(10,2),
  notes text,
  created_by uuid REFERENCES public.workers(auth_user_id),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create machines table
CREATE TABLE IF NOT EXISTS public.machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_name text NOT NULL,
  machine_type text NOT NULL,
  manufacturer text,
  model text,
  serial_number text,
  status text DEFAULT 'operational' CHECK (status IN ('operational', 'maintenance', 'repair', 'offline')),
  location text DEFAULT 'south',
  hourly_rate decimal(10,2),
  last_maintenance date,
  next_maintenance_due date,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create daily_production table
CREATE TABLE IF NOT EXISTS public.daily_production (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_request_id uuid REFERENCES public.production_requests(id),
  machine_id uuid REFERENCES public.machines(id),
  manufacturing_date date NOT NULL DEFAULT CURRENT_DATE,
  quantity_produced integer NOT NULL,
  scrap_quantity integer DEFAULT 0,
  setup_time_minutes integer,
  run_time_minutes integer,
  completed_by uuid REFERENCES public.workers(auth_user_id),
  quality_notes text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create machine_downtime_log table
CREATE TABLE IF NOT EXISTS public.machine_downtime_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid REFERENCES public.machines(id),
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone,
  reason text NOT NULL,
  reported_by uuid REFERENCES public.workers(auth_user_id),
  notes text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- 7. Create wood_inventory table (simplified version for compatibility)
CREATE TABLE IF NOT EXISTS public.wood_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  species text NOT NULL,
  board_feet decimal(10,2),
  quantity_in_stock integer NOT NULL DEFAULT 0,
  minimum_stock integer DEFAULT 10,
  unit_cost decimal(10,2),
  supplier text,
  last_ordered date,
  last_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  notes text
);

-- 8. Create production_schedule table
CREATE TABLE IF NOT EXISTS public.production_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_request_id uuid REFERENCES public.production_requests(id),
  machine_id uuid REFERENCES public.machines(id),
  operator_id uuid REFERENCES public.workers(auth_user_id),
  scheduled_start timestamp with time zone NOT NULL,
  scheduled_end timestamp with time zone NOT NULL,
  actual_start timestamp with time zone,
  actual_end timestamp with time zone,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'delayed', 'cancelled')),
  priority integer DEFAULT 5,
  setup_time_minutes integer,
  run_time_minutes integer,
  notes text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- 9. Create facility_transfers table (now that locations exists)
CREATE TABLE IF NOT EXISTS public.facility_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES public.work_batches(id),
  from_location uuid REFERENCES public.locations(id),
  to_location uuid REFERENCES public.locations(id),
  transfer_type text NOT NULL CHECK (transfer_type IN ('components', 'materials', 'finished_goods')),
  quantity integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'received', 'cancelled')),
  shipped_date timestamp with time zone,
  received_date timestamp with time zone,  
  tracking_number text,
  notes text,
  created_by uuid REFERENCES public.workers(auth_user_id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_facility_transfers_from_location ON public.facility_transfers(from_location);
CREATE INDEX IF NOT EXISTS idx_facility_transfers_to_location ON public.facility_transfers(to_location);
CREATE INDEX IF NOT EXISTS idx_facility_transfers_status ON public.facility_transfers(status);
CREATE INDEX IF NOT EXISTS idx_production_requests_status ON public.production_requests(status);
CREATE INDEX IF NOT EXISTS idx_production_requests_due_date ON public.production_requests(due_date);
CREATE INDEX IF NOT EXISTS idx_daily_production_date ON public.daily_production(manufacturing_date);
CREATE INDEX IF NOT EXISTS idx_machines_status ON public.machines(status);
CREATE INDEX IF NOT EXISTS idx_production_schedule_start ON public.production_schedule(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_wood_inventory_species ON public.wood_inventory(species);

-- 11. Enable RLS on all tables
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_production ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_downtime_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wood_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_schedule ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies
-- Locations - everyone can read
CREATE POLICY "locations_read_all" ON public.locations 
  FOR SELECT TO authenticated 
  USING (true);

-- Facility transfers - authenticated users can read, workers can create
CREATE POLICY "facility_transfers_read_all" ON public.facility_transfers 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "facility_transfers_create_workers" ON public.facility_transfers 
  FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workers 
      WHERE auth_user_id = auth.uid() 
      AND is_active = true
    )
  );

-- Parts catalog - authenticated read, managers can manage
CREATE POLICY "parts_catalog_read_all" ON public.parts_catalog 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "parts_catalog_manage_managers" ON public.parts_catalog 
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workers 
      WHERE auth_user_id = auth.uid() 
      AND role = 'manager' 
      AND is_active = true
    )
  );

-- Production requests - authenticated read, workers can manage
CREATE POLICY "production_requests_read_all" ON public.production_requests 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "production_requests_manage_workers" ON public.production_requests 
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workers 
      WHERE auth_user_id = auth.uid() 
      AND is_active = true
    )
  );

-- Daily production - authenticated read, workers can create
CREATE POLICY "daily_production_read_all" ON public.daily_production 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "daily_production_create_workers" ON public.daily_production 
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workers 
      WHERE auth_user_id = auth.uid() 
      AND is_active = true
    )
  );

-- Machines - authenticated read, managers can manage
CREATE POLICY "machines_read_all" ON public.machines 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "machines_manage_managers" ON public.machines 
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workers 
      WHERE auth_user_id = auth.uid() 
      AND role = 'manager' 
      AND is_active = true
    )
  );

-- Machine downtime - authenticated read, workers can create
CREATE POLICY "machine_downtime_read_all" ON public.machine_downtime_log 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "machine_downtime_create_workers" ON public.machine_downtime_log 
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workers 
      WHERE auth_user_id = auth.uid() 
      AND is_active = true
    )
  );

-- Wood inventory - authenticated read, workers can manage
CREATE POLICY "wood_inventory_read_all" ON public.wood_inventory 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "wood_inventory_manage_workers" ON public.wood_inventory 
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workers 
      WHERE auth_user_id = auth.uid() 
      AND is_active = true
    )
  );

-- Production schedule - authenticated read, workers can manage
CREATE POLICY "production_schedule_read_all" ON public.production_schedule 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "production_schedule_manage_workers" ON public.production_schedule 
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workers 
      WHERE auth_user_id = auth.uid() 
      AND is_active = true
    )
  );

-- 13. Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 14. Add updated_at triggers
CREATE TRIGGER update_locations_updated_at 
  BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parts_catalog_updated_at 
  BEFORE UPDATE ON public.parts_catalog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_production_requests_updated_at 
  BEFORE UPDATE ON public.production_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_machines_updated_at 
  BEFORE UPDATE ON public.machines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_production_schedule_updated_at 
  BEFORE UPDATE ON public.production_schedule
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facility_transfers_updated_at 
  BEFORE UPDATE ON public.facility_transfers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 15. Insert sample data for testing
INSERT INTO public.machines (machine_name, machine_type, status, location, hourly_rate) VALUES
  ('CNC Mill #1', 'CNC Milling Machine', 'operational', 'south', 75.00),
  ('CNC Lathe #1', 'CNC Lathe', 'operational', 'south', 65.00),
  ('CNC Router #1', 'CNC Router', 'operational', 'south', 55.00)
ON CONFLICT DO NOTHING;

INSERT INTO public.parts_catalog (part_name, part_type, species, material_cost, estimated_labor_hours) VALUES
  ('Walnut Cup - Standard', 'cup', 'Walnut', 15.00, 0.5),
  ('Cherry Cup - Standard', 'cup', 'Cherry', 12.00, 0.5),
  ('Maple Cup - Standard', 'cup', 'Maple', 10.00, 0.5),
  ('Richlite Cup - Standard', 'cup', 'Richlite', 8.00, 0.3),
  ('Walnut Baffle - Standard', 'baffle', 'Walnut', 8.00, 0.3),
  ('Cherry Baffle - Standard', 'baffle', 'Cherry', 6.00, 0.3)
ON CONFLICT DO NOTHING;

INSERT INTO public.wood_inventory (species, board_feet, quantity_in_stock, unit_cost) VALUES
  ('Walnut', 500, 20, 12.50),
  ('Cherry', 400, 15, 10.00),
  ('Maple', 600, 25, 8.00),
  ('Richlite', 300, 30, 6.00),
  ('Oak', 350, 18, 9.50)
ON CONFLICT DO NOTHING;