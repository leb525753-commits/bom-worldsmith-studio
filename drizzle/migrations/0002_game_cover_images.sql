ALTER TABLE public.games ADD COLUMN IF NOT EXISTS cover_url text;

CREATE POLICY "Players upload covers to their own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'game-covers' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Players update their own covers"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'game-covers' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Players delete their own covers"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'game-covers' AND (storage.foldername(name))[1] = auth.uid()::text);