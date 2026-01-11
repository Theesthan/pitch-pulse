-- Drop the existing overly permissive SELECT policy on runs
DROP POLICY IF EXISTS "Authenticated users can view runs" ON public.runs;

-- Create a new restricted policy that limits visibility to:
-- 1. The run creator
-- 2. The assigned reviewer
-- 3. Users with reviewer role (for the approval queue)
-- 4. Users with admin role
CREATE POLICY "Users can view relevant runs"
  ON public.runs
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = created_by 
    OR auth.uid() = reviewer_id
    OR has_role(auth.uid(), 'reviewer')
    OR has_role(auth.uid(), 'admin')
  );