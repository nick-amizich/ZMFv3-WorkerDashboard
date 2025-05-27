-- Create QC submissions table
CREATE TABLE IF NOT EXISTS public.qc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES public.workers(id),
  worker_name TEXT NOT NULL,
  production_step TEXT NOT NULL,
  checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  overall_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  product_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Add indexes for performance
  CONSTRAINT valid_checklist_items CHECK (jsonb_typeof(checklist_items) = 'array'),
  CONSTRAINT valid_production_step CHECK (production_step IN (
    'inventory_intake',
    'sanding_pre_work',
    'sanding_post_work',
    'finishing_pre_work',
    'finishing_post_work',
    'sub_assembly_chassis_pre_work',
    'sub_assembly_chassis_post_work',
    'sub_assembly_baffle_pre_work',
    'sub_assembly_baffle_post_work',
    'final_production',
    'final_assembly',
    'acoustic_aesthetic_qc',
    'shipping'
  ))
);

-- Create indexes
CREATE INDEX idx_qc_submissions_worker_id ON public.qc_submissions(worker_id);
CREATE INDEX idx_qc_submissions_production_step ON public.qc_submissions(production_step);
CREATE INDEX idx_qc_submissions_submitted_at ON public.qc_submissions(submitted_at DESC);

-- Enable RLS
ALTER TABLE public.qc_submissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Workers can view their own submissions
CREATE POLICY "Workers can view own QC submissions"
  ON public.qc_submissions
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM public.workers WHERE id = qc_submissions.worker_id
    )
  );

-- Workers can create their own submissions
CREATE POLICY "Workers can create QC submissions"
  ON public.qc_submissions
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT auth_user_id FROM public.workers WHERE id = qc_submissions.worker_id
    )
  );

-- Managers can create submissions for any worker
CREATE POLICY "Managers can create QC submissions"
  ON public.qc_submissions
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT auth_user_id FROM public.workers WHERE role = 'manager'
    )
  );

-- Managers can view all submissions
CREATE POLICY "Managers can view all QC submissions"
  ON public.qc_submissions
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM public.workers WHERE role = 'manager'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_qc_submissions_updated_at
  BEFORE UPDATE ON public.qc_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT ON public.qc_submissions TO authenticated;
GRANT ALL ON public.qc_submissions TO service_role;