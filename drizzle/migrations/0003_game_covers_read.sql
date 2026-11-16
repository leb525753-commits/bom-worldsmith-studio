CREATE POLICY "Signed-in players view game covers"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'game-covers');

COMMENT ON COLUMN public.games.cover_url IS 'Storage path of the cover image in the private game-covers bucket';