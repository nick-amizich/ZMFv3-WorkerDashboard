-- Run this script in Supabase SQL Editor to create the approval functions

-- Function to approve a worker
CREATE OR REPLACE FUNCTION approve_worker(
  p_worker_id UUID,
  p_approved_by_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update worker status
  UPDATE workers
  SET 
    approval_status = 'approved',
    approved_by = p_approved_by_id,
    approved_at = NOW(),
    is_active = true
  WHERE id = p_worker_id
  AND approval_status = 'pending';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject a worker
CREATE OR REPLACE FUNCTION reject_worker(
  p_worker_id UUID,
  p_rejected_by_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update worker status
  UPDATE workers
  SET 
    approval_status = 'rejected',
    rejection_reason = p_reason,
    approved_by = p_rejected_by_id,
    approved_at = NOW(),
    is_active = false
  WHERE id = p_worker_id
  AND approval_status = 'pending';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to suspend a worker
CREATE OR REPLACE FUNCTION suspend_worker(
  p_worker_id UUID,
  p_suspended_by_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update worker status
  UPDATE workers
  SET 
    approval_status = 'suspended',
    suspension_reason = p_reason,
    suspended_at = NOW(),
    is_active = false
  WHERE id = p_worker_id
  AND approval_status = 'approved';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reactivate a worker
CREATE OR REPLACE FUNCTION reactivate_worker(
  p_worker_id UUID,
  p_reactivated_by_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update worker status
  UPDATE workers
  SET 
    approval_status = 'approved',
    suspension_reason = NULL,
    suspended_at = NULL,
    is_active = true
  WHERE id = p_worker_id
  AND approval_status = 'suspended';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION approve_worker TO authenticated;
GRANT EXECUTE ON FUNCTION reject_worker TO authenticated;
GRANT EXECUTE ON FUNCTION suspend_worker TO authenticated;
GRANT EXECUTE ON FUNCTION reactivate_worker TO authenticated;

-- Test that functions were created
SELECT 
  'approve_worker' as function_name,
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'approve_worker') as exists
UNION ALL
SELECT 
  'reject_worker',
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'reject_worker')
UNION ALL
SELECT 
  'suspend_worker',
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'suspend_worker')
UNION ALL
SELECT 
  'reactivate_worker',
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'reactivate_worker');