ALTER TABLE public.games ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "Signed-in players can see every saved game" ON public.games;

CREATE POLICY "Players see shared games and their own"
ON public.games
FOR SELECT
TO authenticated
USING (is_public = true OR owner_id = auth.uid());