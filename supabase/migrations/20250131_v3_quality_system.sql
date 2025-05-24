-- V3 Quality System: Component Tracking and Quality Intelligence
-- This migration adds comprehensive quality control features on top of the V2 workflow system

-- Component tracking table for individual headphone components
CREATE TABLE component_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cup_pair_id UUID NOT NULL UNIQUE, -- Unique ID for L/R pair
    left_cup_serial TEXT UNIQUE NOT NULL,
    right_cup_serial TEXT UNIQUE NOT NULL,
    wood_batch_id UUID,
    grade TEXT CHECK (grade IN ('A', 'B')) NOT NULL,
    source_tracking JSONB DEFAULT '{}', -- supplier, receipt_date, moisture_content, grain_photos
    specifications JSONB NOT NULL, -- model, wood_type, finish_type, customer_order_id, custom_requirements
    journey JSONB DEFAULT '[]', -- Array of stage history with timestamps, workers, checks
    final_metrics JSONB DEFAULT '{}', -- total_production_hours, rework_count, quality_score
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quality checkpoints configuration for each workflow stage
CREATE TABLE quality_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_template_id UUID REFERENCES workflow_templates(id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    checkpoint_type TEXT CHECK (checkpoint_type IN ('pre_work', 'in_process', 'post_work', 'gate')) NOT NULL,
    severity TEXT CHECK (severity IN ('critical', 'major', 'minor')) NOT NULL DEFAULT 'major',
    checks JSONB NOT NULL, -- Array of {id, description, requires_photo, requires_measurement, acceptance_criteria, common_failures}
    on_failure TEXT CHECK (on_failure IN ('block_progress', 'warn_continue', 'log_only')) NOT NULL DEFAULT 'block_progress',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workflow_template_id, stage, checkpoint_type)
);

-- Enhanced inspection results with root cause analysis
CREATE TABLE inspection_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES work_tasks(id) ON DELETE CASCADE,
    checkpoint_id UUID REFERENCES quality_checkpoints(id),
    component_tracking_id UUID REFERENCES component_tracking(id),
    worker_id UUID REFERENCES workers(id) NOT NULL,
    passed BOOLEAN NOT NULL,
    failed_checks TEXT[], -- Array of check IDs that failed
    root_cause TEXT, -- Why did it fail?
    corrective_action TEXT, -- What was done to fix it?
    prevention_suggestion TEXT, -- How to prevent in the future
    time_to_resolve INTEGER, -- Minutes taken to fix the issue
    notes TEXT,
    photo_urls TEXT[], -- Array of photo URLs for evidence
    measurement_data JSONB, -- For acoustic tests, dimensional measurements
    inspected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quality patterns learning system
CREATE TABLE quality_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage TEXT NOT NULL,
    issue_type TEXT NOT NULL,
    occurrence_count INTEGER DEFAULT 1,
    common_causes TEXT[],
    effective_solutions TEXT[],
    prevention_tips TEXT[],
    affected_models TEXT[], -- Which headphone models see this issue
    affected_materials TEXT[], -- Which wood types/materials see this issue
    severity_trend TEXT CHECK (severity_trend IN ('increasing', 'stable', 'decreasing')),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stage, issue_type)
);

-- Quality hold management for batches with issues
CREATE TABLE quality_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES work_batches(id) ON DELETE CASCADE,
    component_tracking_id UUID REFERENCES component_tracking(id),
    hold_reason TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('critical', 'major', 'minor')) NOT NULL,
    reported_by UUID REFERENCES workers(id) NOT NULL,
    assigned_to UUID REFERENCES workers(id),
    status TEXT CHECK (status IN ('active', 'investigating', 'resolved', 'escalated')) NOT NULL DEFAULT 'active',
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    escalated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-populated quality checkpoint templates for common stages
CREATE TABLE quality_checkpoint_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_name TEXT NOT NULL,
    checkpoint_type TEXT CHECK (checkpoint_type IN ('pre_work', 'in_process', 'post_work', 'gate')) NOT NULL,
    template_name TEXT NOT NULL,
    checks JSONB NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stage_name, checkpoint_type, template_name)
);

-- Add quality-related fields to existing tables
ALTER TABLE work_tasks 
ADD COLUMN IF NOT EXISTS component_tracking_id UUID REFERENCES component_tracking(id),
ADD COLUMN IF NOT EXISTS quality_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS rework_count INTEGER DEFAULT 0;

ALTER TABLE work_batches
ADD COLUMN IF NOT EXISTS quality_hold_id UUID REFERENCES quality_holds(id),
ADD COLUMN IF NOT EXISTS first_pass_yield DECIMAL(5,2);

-- Indexes for performance
CREATE INDEX idx_component_tracking_cup_pair ON component_tracking(cup_pair_id);
CREATE INDEX idx_component_tracking_grade ON component_tracking(grade);
CREATE INDEX idx_component_tracking_wood_batch ON component_tracking(wood_batch_id);
CREATE INDEX idx_quality_checkpoints_workflow ON quality_checkpoints(workflow_template_id);
CREATE INDEX idx_quality_checkpoints_stage ON quality_checkpoints(stage);
CREATE INDEX idx_inspection_results_task ON inspection_results(task_id);
CREATE INDEX idx_inspection_results_component ON inspection_results(component_tracking_id);
CREATE INDEX idx_inspection_results_passed ON inspection_results(passed);
CREATE INDEX idx_quality_patterns_stage ON quality_patterns(stage);
CREATE INDEX idx_quality_patterns_issue ON quality_patterns(issue_type);
CREATE INDEX idx_quality_holds_batch ON quality_holds(batch_id);
CREATE INDEX idx_quality_holds_status ON quality_holds(status);

-- Row Level Security (RLS) policies
ALTER TABLE component_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_checkpoint_templates ENABLE ROW LEVEL SECURITY;

-- Component tracking: workers can view all, managers can modify
CREATE POLICY "Workers can view component tracking" ON component_tracking
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.auth_user_id = auth.uid() 
            AND e.active = true
        )
    );

CREATE POLICY "Managers can modify component tracking" ON component_tracking
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.auth_user_id = auth.uid() 
            AND e.role IN ('manager', 'supervisor')
            AND e.active = true
        )
    );

-- Quality checkpoints: all authenticated users can view
CREATE POLICY "All employees can view quality checkpoints" ON quality_checkpoints
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.auth_user_id = auth.uid() 
            AND e.active = true
        )
    );

CREATE POLICY "Managers can modify quality checkpoints" ON quality_checkpoints
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.auth_user_id = auth.uid() 
            AND e.role = 'manager'
            AND e.active = true
        )
    );

-- Inspection results: workers can create their own, view all
CREATE POLICY "Workers can create inspection results" ON inspection_results
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.auth_user_id = auth.uid() 
            AND e.id = worker_id
            AND e.active = true
        )
    );

CREATE POLICY "All employees can view inspection results" ON inspection_results
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.auth_user_id = auth.uid() 
            AND e.active = true
        )
    );

-- Quality patterns: all can view, managers can modify
CREATE POLICY "All employees can view quality patterns" ON quality_patterns
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.auth_user_id = auth.uid() 
            AND e.active = true
        )
    );

CREATE POLICY "Managers can modify quality patterns" ON quality_patterns
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.auth_user_id = auth.uid() 
            AND e.role = 'manager'
            AND e.active = true
        )
    );

-- Quality holds: workers can create, managers can modify all
CREATE POLICY "Workers can create quality holds" ON quality_holds
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.auth_user_id = auth.uid() 
            AND e.id = reported_by
            AND e.active = true
        )
    );

CREATE POLICY "All employees can view quality holds" ON quality_holds
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.auth_user_id = auth.uid() 
            AND e.active = true
        )
    );

CREATE POLICY "Managers can modify quality holds" ON quality_holds
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.auth_user_id = auth.uid() 
            AND e.role IN ('manager', 'supervisor')
            AND e.active = true
        )
    );

-- Quality checkpoint templates: all can view
CREATE POLICY "All employees can view checkpoint templates" ON quality_checkpoint_templates
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.auth_user_id = auth.uid() 
            AND e.active = true
        )
    );

CREATE POLICY "Managers can modify checkpoint templates" ON quality_checkpoint_templates
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.auth_user_id = auth.uid() 
            AND e.role = 'manager'
            AND e.active = true
        )
    );

-- Insert default quality checkpoint templates based on common ZMF production stages
INSERT INTO quality_checkpoint_templates (stage_name, checkpoint_type, template_name, checks, is_default) VALUES
-- Sanding pre-work checks
('sanding', 'pre_work', 'Standard Sanding Pre-Check', 
 '[{"id": "sand-pre-1", "description": "Verify cup grade matches work order", "requires_photo": false, "requires_measurement": false, "acceptance_criteria": "Grade stamp clearly visible and matches", "common_failures": ["Wrong grade selected", "Grade stamp unclear"]},
   {"id": "sand-pre-2", "description": "Check L/R pairs are matched", "requires_photo": true, "requires_measurement": false, "acceptance_criteria": "Wood grain patterns complement each other", "common_failures": ["Mismatched grain", "Color variation too high"]},
   {"id": "sand-pre-3", "description": "Inspect for existing defects", "requires_photo": true, "requires_measurement": false, "acceptance_criteria": "No cracks, voids, or damage", "common_failures": ["Hairline cracks missed", "Internal voids"]}]', 
 true),

-- Sanding post-work checks
('sanding', 'post_work', 'Standard Sanding Post-Check',
 '[{"id": "sand-post-1", "description": "Surface smoothness check", "requires_photo": false, "requires_measurement": false, "acceptance_criteria": "No roughness felt when running hand across surface", "common_failures": ["Missed spots", "Uneven sanding"]},
   {"id": "sand-post-2", "description": "Grille fit test", "requires_photo": true, "requires_measurement": false, "acceptance_criteria": "Grille sits flush without forcing", "common_failures": ["Over-sanded opening", "Tight fit"]},
   {"id": "sand-post-3", "description": "Final dimension check", "requires_photo": false, "requires_measurement": true, "acceptance_criteria": "Within 0.5mm of spec", "common_failures": ["Over-sanded thickness", "Uneven removal"]}]',
 true),

-- Finishing pre-work checks
('finishing', 'pre_work', 'Standard Finishing Pre-Check',
 '[{"id": "fin-pre-1", "description": "Surface preparation verified", "requires_photo": false, "requires_measurement": false, "acceptance_criteria": "Surface clean and dust-free", "common_failures": ["Dust particles", "Oil contamination"]},
   {"id": "fin-pre-2", "description": "Spray booth ready", "requires_photo": false, "requires_measurement": false, "acceptance_criteria": "Booth clean, filters checked", "common_failures": ["Dirty filters", "Overspray buildup"]},
   {"id": "fin-pre-3", "description": "Material temperature check", "requires_photo": false, "requires_measurement": true, "acceptance_criteria": "Room temp 65-75°F", "common_failures": ["Too cold", "Too humid"]}]',
 true),

-- Finishing post-work checks  
('finishing', 'post_work', 'Standard Finishing Post-Check',
 '[{"id": "fin-post-1", "description": "No niblets or imperfections", "requires_photo": true, "requires_measurement": false, "acceptance_criteria": "Surface completely smooth", "common_failures": ["Dust niblets", "Orange peel", "Runs"]},
   {"id": "fin-post-2", "description": "Even coverage check", "requires_photo": true, "requires_measurement": false, "acceptance_criteria": "Consistent sheen across surface", "common_failures": ["Thin spots", "Overlap marks"]},
   {"id": "fin-post-3", "description": "Cure state verification", "requires_photo": false, "requires_measurement": false, "acceptance_criteria": "Tack-free to touch", "common_failures": ["Under-cured", "Fingerprints"]}]',
 true),

-- Assembly critical gate check
('assembly', 'gate', 'Final Assembly Gate',
 '[{"id": "asm-gate-1", "description": "Gimbal tension test", "requires_photo": false, "requires_measurement": true, "acceptance_criteria": "3-5 lbs force to rotate", "common_failures": ["Too loose", "Too tight", "Uneven L/R"]},
   {"id": "asm-gate-2", "description": "Driver alignment check", "requires_photo": true, "requires_measurement": false, "acceptance_criteria": "Drivers centered in cups", "common_failures": ["Off-center", "Tilted"]},
   {"id": "asm-gate-3", "description": "Cable routing verification", "requires_photo": true, "requires_measurement": false, "acceptance_criteria": "No strain on connections", "common_failures": ["Pinched wire", "Strain relief missing"]}]',
 true),

-- Final QC gate
('quality_control', 'gate', 'Final Quality Gate',
 '[{"id": "qc-gate-1", "description": "Full visual inspection", "requires_photo": true, "requires_measurement": false, "acceptance_criteria": "No visible defects from 12 inches", "common_failures": ["Minor scratches", "Fingerprints"]},
   {"id": "qc-gate-2", "description": "Acoustic test", "requires_photo": false, "requires_measurement": true, "acceptance_criteria": "Within 3dB of reference", "common_failures": ["Driver mismatch", "Air leak"]},
   {"id": "qc-gate-3", "description": "Serial number verification", "requires_photo": true, "requires_measurement": false, "acceptance_criteria": "Numbers match order and are legible", "common_failures": ["Wrong serial", "Poor engraving"]}]',
 true);

-- Insert common quality patterns based on historical data
INSERT INTO quality_patterns (stage, issue_type, occurrence_count, common_causes, effective_solutions, prevention_tips, affected_models, affected_materials) VALUES
('finishing', 'niblets', 1, 
 ARRAY['Dirty spray booth filters', 'Dust in environment', 'Contaminated finish'],
 ARRAY['Clean booth thoroughly', 'Replace filters', 'Filter finish before use'],
 ARRAY['Check filters before each session', 'Use tack cloth between coats', 'Control room air flow'],
 ARRAY['HD650', 'Atticus', 'Eikon'],
 ARRAY['walnut', 'cherry']),

('assembly', 'gimbal_tension', 1,
 ARRAY['Over-tightening', 'Incorrect spacer', 'Worn tools'],
 ARRAY['Use torque wrench', 'Verify spacer thickness', 'Replace worn bits'],
 ARRAY['Follow torque spec exactly', 'Check tool calibration weekly', 'Use fresh threadlocker'],
 ARRAY['Verite', 'Auteur'],
 NULL),

('sanding', 'grille_fit', 1,
 ARRAY['Over-sanding', 'Wrong grit sequence', 'Rushing'],
 ARRAY['Test fit frequently', 'Follow grit progression', 'Take breaks'],
 ARRAY['Mark depth limits', 'Use go/no-go gauge', 'Sand in stages'],
 ARRAY['HD800', 'Aeolus'],
 ARRAY['zebrawood', 'ebony']);

-- Function to generate unique serial numbers
CREATE OR REPLACE FUNCTION generate_serial_number(model TEXT, year INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER)
RETURNS TEXT AS $$
DECLARE
    counter INTEGER;
    serial TEXT;
BEGIN
    -- Get the next counter for this model and year
    SELECT COUNT(*) + 1 INTO counter
    FROM component_tracking
    WHERE specifications->>'model' = model
    AND EXTRACT(YEAR FROM created_at) = year;
    
    -- Format: ZMF-YYYY-MODEL-NNNNN
    serial := FORMAT('ZMF-%s-%s-%s', year, UPPER(LEFT(model, 3)), LPAD(counter::TEXT, 5, '0'));
    
    RETURN serial;
END;
$$ LANGUAGE plpgsql;

-- Function to update quality pattern statistics
CREATE OR REPLACE FUNCTION update_quality_pattern_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT NEW.passed THEN
        -- Update pattern occurrence count
        UPDATE quality_patterns
        SET occurrence_count = occurrence_count + 1,
            last_seen = NOW(),
            severity_trend = CASE 
                WHEN last_seen > NOW() - INTERVAL '7 days' THEN 'increasing'
                WHEN last_seen < NOW() - INTERVAL '30 days' THEN 'decreasing'
                ELSE 'stable'
            END
        WHERE stage = (
            SELECT stage FROM quality_checkpoints 
            WHERE id = NEW.checkpoint_id
        )
        AND issue_type = ANY(NEW.failed_checks);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update quality patterns on new inspection results
CREATE TRIGGER update_quality_patterns_on_inspection
AFTER INSERT ON inspection_results
FOR EACH ROW
EXECUTE FUNCTION update_quality_pattern_stats();

-- Function to calculate first pass yield for a batch
CREATE OR REPLACE FUNCTION calculate_first_pass_yield(batch_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    total_inspections INTEGER;
    passed_inspections INTEGER;
    yield DECIMAL;
BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE passed = true)
    INTO total_inspections, passed_inspections
    FROM inspection_results ir
    JOIN work_tasks wt ON ir.task_id = wt.id
    WHERE wt.batch_id = calculate_first_pass_yield.batch_id;
    
    IF total_inspections = 0 THEN
        RETURN NULL;
    END IF;
    
    yield := (passed_inspections::DECIMAL / total_inspections::DECIMAL) * 100;
    
    -- Update the batch record
    UPDATE work_batches
    SET first_pass_yield = yield
    WHERE id = calculate_first_pass_yield.batch_id;
    
    RETURN yield;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger for new tables
CREATE TRIGGER update_component_tracking_updated_at BEFORE UPDATE ON component_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quality_checkpoints_updated_at BEFORE UPDATE ON quality_checkpoints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quality_patterns_updated_at BEFORE UPDATE ON quality_patterns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quality_holds_updated_at BEFORE UPDATE ON quality_holds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();