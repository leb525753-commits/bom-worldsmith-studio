CREATE TABLE public.games (
  id text PRIMARY KEY,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  owner_name text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  data jsonb NOT NULL,
  object_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO authenticated;
GRANT ALL ON public.games TO service_role;

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in players can see every saved game" ON public.games
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Players save their own games" ON public.games
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Players update their own games" ON public.games
  FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Players delete their own games" ON public.games
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE INDEX games_updated_at_idx ON public.games (updated_at DESC);