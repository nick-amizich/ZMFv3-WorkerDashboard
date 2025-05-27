-- Create QC Checklist Items table
CREATE TABLE IF NOT EXISTS qc_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_step_value TEXT NOT NULL,
  item_text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (production_step_value) REFERENCES qc_production_steps(value) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE qc_checklist_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "QC checklist items are viewable by authenticated users" ON qc_checklist_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Only managers can modify QC checklist items" ON qc_checklist_items
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
CREATE INDEX idx_qc_checklist_items_production_step ON qc_checklist_items(production_step_value);
CREATE INDEX idx_qc_checklist_items_sort_order ON qc_checklist_items(sort_order);
CREATE INDEX idx_qc_checklist_items_active ON qc_checklist_items(is_active);

-- Insert default checklist items from the hardcoded data
INSERT INTO qc_checklist_items (production_step_value, item_text, sort_order) VALUES
-- Inventory Intake
('inventory_intake', 'Cup Count Verification: Ensure the number of cups received matches what was shipped.', 10),
('inventory_intake', 'Grade Check: Confirm all cups are A stock, not B stock.', 20),
('inventory_intake', 'Wood Type Validation: Check that the wood type matches the product that was sent or ordered.', 30),
('inventory_intake', 'Matching Pairs: Verify that left and right cups and baffles are matched correctly for each unit.', 40),

-- Sanding Pre-Work
('sanding_pre_work', 'Left/Right Pairing: Ensure cups are paired correctly as left and right.', 10),
('sanding_pre_work', 'Grade Check: Confirm all cups are A stock.', 20),
('sanding_pre_work', 'Pre-Sanding Validation: For robot-sanded models, confirm pre-sanding was completed.', 30),
('sanding_pre_work', 'Grille Fit Pre-Check: Ensure grilles fit properly before sanding begins.', 40),
('sanding_pre_work', 'Drilling Completion: Verify gimbal and jack holes are drilled out.', 50),
('sanding_pre_work', 'Wood Match: Check that the wood matches the work order.', 60),

-- Sanding Post-Work
('sanding_post_work', 'Surface Smoothness: Check for uniform smoothness without gouges or unevenness.', 10),
('sanding_post_work', 'Shape Accuracy: Confirm shape consistency and compare against example pieces for that model.', 20),
('sanding_post_work', 'Edge Treatment: Ensure all edges are properly rounded or beveled as needed.', 30),
('sanding_post_work', 'Gimbal Fit: Confirm gimbals fit properly post-sanding.', 40),
('sanding_post_work', 'Grille Fit (if applicable): Re-check that grille fit remains correct after sanding.', 50),
('sanding_post_work', 'Pore Filler Application: Apply and confirm pore filler use where needed.', 60),

-- Finishing Pre-Work
('finishing_pre_work', 'Surface Smoothness: Check for uniform smoothness without gouges or unevenness.', 10),
('finishing_pre_work', 'Shape Accuracy: Confirm shape consistency and compare against example pieces for that model.', 20),
('finishing_pre_work', 'Edge Treatment: Ensure all edges are properly rounded or beveled as needed.', 30),
('finishing_pre_work', 'Gimbal Fit: Confirm gimbals fit properly post-sanding.', 40),
('finishing_pre_work', 'Grille Fit (if applicable): Re-check that grille fit remains correct after sanding.', 50),
('finishing_pre_work', 'Pore Filler Application: Apply and confirm pore filler use where needed.', 60),

-- Finishing Post-Work
('finishing_post_work', 'Slots Stained: Verify that slots are evenly and adequately stained.', 10),
('finishing_post_work', 'Bottom Rim Stained: Confirm that the bottom rim has received proper stain treatment.', 20),
('finishing_post_work', 'Buffed as Needed: Ensure final buffing has been completed where necessary.', 30),
('finishing_post_work', 'Finish Cleanliness: Confirm no niblets, hairs, or debris are present in the finish.', 40),
('finishing_post_work', 'A-Stock Confirmation: Check for any abnormalities that would disqualify the cup from being A-stock.', 50),

-- Sub-assembly: Chassis - Pre-Work
('sub_assembly_chassis_pre_work', 'Stock Grade Verification: Confirm parts are A stock or B stock per the work order.', 10),
('sub_assembly_chassis_pre_work', 'Color Match: Ensure all components match the color specifications of the order.', 20),

-- Sub-assembly: Chassis - Post-Work
('sub_assembly_chassis_post_work', 'Component Fit: Ensure all parts align and fit snugly without force.', 10),
('sub_assembly_chassis_post_work', 'Rod Installation: Confirm rods are inserted with the correct amount of force.', 20),
('sub_assembly_chassis_post_work', 'Steel Band Alignment: Verify that the steel band is straight within the upright.', 30),
('sub_assembly_chassis_post_work', 'Fastener Tightness: Verify all screws/bolts are torqued correctly.', 40),
('sub_assembly_chassis_post_work', 'Thread Locking: Ensure screws are properly thread-locked or securely tightened.', 50),
('sub_assembly_chassis_post_work', 'Screw Integrity: Check that no screws are stripped.', 60),

-- Sub-assembly: Baffle - Pre-Work
('sub_assembly_baffle_pre_work', 'Driver Preparation: Ensure drivers are tested and labeled.', 10),
('sub_assembly_baffle_pre_work', 'Surface Quality: Confirm baffles are sanded and rounded properly.', 20),
('sub_assembly_baffle_pre_work', 'Finish Inspection: Ensure there are no sanding marks in incorrect areas.', 30),
('sub_assembly_baffle_pre_work', 'Hole Alignment: Check that baffle holes align properly with other components.', 40),

-- Sub-assembly: Baffle - Post-Work
('sub_assembly_baffle_post_work', 'Driver Seating: Confirm drivers are flush and secure in their mountings.', 10),
('sub_assembly_baffle_post_work', 'Seal Integrity: Test for air-tight seal where required.', 20),
('sub_assembly_baffle_post_work', 'Soldering Quality: Inspect solder joints for cleanliness and strength.', 30),
('sub_assembly_baffle_post_work', 'Foam Matching: Ensure all foam is matched by weight as required.', 40),

-- Final Production
('final_production', 'Component Check: Ensure all sub-assemblies and hardware are ready and defect-free.', 10),
('final_production', 'Full Assembly Check: Verify all parts are installed in the correct order and orientation.', 20),
('final_production', 'Functional Test: Perform electrical and mechanical testing.', 30),
('final_production', 'Hardware Check: Confirm all external hardware is present and functional.', 40),
('final_production', 'Comfort Test: Inspect headband adjustment, clamp force, and padding.', 50),

-- Final Assembly
('final_assembly', 'Parts Verification: Ensure all parts match the assigned specs.', 10),
('final_assembly', 'Finish Check: Inspect the cup finish for quality.', 20),
('final_assembly', 'Grille Fit: Confirm grille fit and darken slots as needed.', 30),
('final_assembly', 'Component Grade: Ensure all parts meet the assigned quality grade.', 40),
('final_assembly', 'Set Screw Slots: Properly darkened and smooth.', 50),
('final_assembly', 'Icon Slots: Cleaned thoroughly, with no wood or debris remaining.', 60),
('final_assembly', 'Baffle Length: Does not extend past outer cup diameter.', 70),
('final_assembly', 'Steel Band Insertion: Set at 90° and correctly inserted.', 80),
('final_assembly', 'Fraying Check: No fraying present; trim any visible frays.', 90),
('final_assembly', 'Thread Securing: Use a heat gun briefly to shrink threads and secure leather ends.', 100),
('final_assembly', 'Baffle Screws: Confirm presence and correct installation.', 110),
('final_assembly', 'Gimbal Tension: Ensure even tension on both sides, with a premium feel and proper stability.', 120),
('final_assembly', 'Waxed O-Rings: Ensure no squeaking; apply guitar detailer if needed.', 130),
('final_assembly', 'Vibratite Application: Check bolts have vibratite applied; remove visible residue; confirm tightness with hex keys.', 140),
('final_assembly', 'Rod Adjustment: Perform click test for audible feedback and inspect visual congruence.', 150),
('final_assembly', 'Metal Finish: Check rods and metal components for marks, inconsistencies, and confirm symmetrical molded marks.', 160),
('final_assembly', 'Audio Test (Sonic Sweeps): Run sweeps with JDS Labs Element amp; confirm absence of buzzes or rattles.', 170),
('final_assembly', 'Audio Test (In Phase): Play stereo phase test and confirm accurate phase alignment.', 180),

-- Acoustic and Aesthetic QC
('acoustic_aesthetic_qc', 'Listening Test: Compare sound signature to a reference unit.', 10),
('acoustic_aesthetic_qc', 'Cosmetic Review: Check for blemishes, fingerprints, mismatched grain or finish.', 20),
('acoustic_aesthetic_qc', 'Measurement Test: Confirm measurements match acoustic standards.', 30),
('acoustic_aesthetic_qc', 'Listening Test Confirmation: Ensure no audible buzzes, rattles, or imperfections.', 40),
('acoustic_aesthetic_qc', 'Debris Check: Confirm headphone is free of debris.', 50),
('acoustic_aesthetic_qc', 'Headband Alignment: Verify headband is properly bent.', 60),
('acoustic_aesthetic_qc', 'Fit Test: Check headband tension for comfort and security.', 70),
('acoustic_aesthetic_qc', 'Rod Tension: Confirm rod tension is correct and consistent.', 80),
('acoustic_aesthetic_qc', 'Surface Cleanliness: Ensure no thread locker or touch-up paint is visible.', 90),
('acoustic_aesthetic_qc', 'Quality Standard: Confirm headphone meets the assigned quality standard.', 100),
('acoustic_aesthetic_qc', 'Headband Stamp: Ensure stamp is present on the headband.', 110),
('acoustic_aesthetic_qc', 'Spec Verification: Confirm all product specs are correct.', 120),

-- Shipping
('shipping', 'Cleaning: Wipe down all surfaces and polish metal and wood.', 10),
('shipping', 'Accessory Inclusion: Verify that all cables, cases, documentation, etc. are present.', 20),
('shipping', 'Packaging Inspection: Ensure all items are secured and protected for transit.', 30),
('shipping', 'Labeling and Tracking: Attach correct labels and confirm tracking system updates.', 40),
('shipping', 'Headband Bolts: Confirm secure installation and appropriate tightness.', 50),
('shipping', 'Finish Gimbal: Check finish on gimbals for consistency and cleanliness.', 60),
('shipping', 'Touchup O-Rings: Ensure O-rings are clean and free of cosmetic touch-up residue.', 70),
('shipping', 'Set-Screw: Confirm proper fit and darkening as required.', 80),
('shipping', 'Earpad Align: Ensure earpads are aligned properly.', 90),
('shipping', 'DUST: Check that all headphone surfaces are free of dust.', 100),
('shipping', 'Pre-Pack Confirmation: Confirm pre-pack checklist is complete and matches Shopify/listing records.', 110);

-- Add trigger for updated_at
CREATE TRIGGER update_qc_checklist_items_updated_at 
BEFORE UPDATE ON qc_checklist_items 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
