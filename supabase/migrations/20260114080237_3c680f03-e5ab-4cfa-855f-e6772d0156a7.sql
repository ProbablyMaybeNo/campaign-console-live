-- Add INSERT policy for game_systems (admin can create)
CREATE POLICY "Authenticated users can create game systems"
ON public.game_systems
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Add UPDATE policy for game_systems
CREATE POLICY "Authenticated users can update game systems"
ON public.game_systems
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Add DELETE policy for game_systems
CREATE POLICY "Authenticated users can delete game systems"
ON public.game_systems
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Also allow viewing draft game systems for admin purposes
DROP POLICY IF EXISTS "Authenticated users can view active game systems" ON public.game_systems;
CREATE POLICY "Authenticated users can view all game systems"
ON public.game_systems
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Add policies for master_factions (for sync operations)
CREATE POLICY "Authenticated users can insert master factions"
ON public.master_factions
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update master factions"
ON public.master_factions
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete master factions"
ON public.master_factions
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Add policies for master_units (for sync operations)
CREATE POLICY "Authenticated users can insert master units"
ON public.master_units
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update master units"
ON public.master_units
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete master units"
ON public.master_units
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Add policies for master_rules (for sync operations)
CREATE POLICY "Authenticated users can insert master rules"
ON public.master_rules
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update master rules"
ON public.master_rules
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete master rules"
ON public.master_rules
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Allow viewing all master_rules (not just public)
DROP POLICY IF EXISTS "Authenticated users can view public master rules" ON public.master_rules;
CREATE POLICY "Authenticated users can view master rules"
ON public.master_rules
FOR SELECT
USING (auth.uid() IS NOT NULL);