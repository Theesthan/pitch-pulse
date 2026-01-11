-- Drop the existing overly permissive SELECT policy on profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a restricted policy for users to view only their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create an admin-specific policy to maintain admin panel functionality
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));