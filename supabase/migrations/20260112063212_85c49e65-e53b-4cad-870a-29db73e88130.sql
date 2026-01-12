-- Drop the overly permissive policy that allows anonymous access
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a new policy that requires authentication to view profiles
CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);