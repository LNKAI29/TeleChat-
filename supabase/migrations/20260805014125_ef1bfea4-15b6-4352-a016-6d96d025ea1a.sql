DROP POLICY IF EXISTS "Users can upload their chat media" ON storage.objects;
CREATE POLICY "Users can upload their chat media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Authenticated users can read chat media" ON storage.objects;
CREATE POLICY "Authenticated users can read chat media"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-media');

DROP POLICY IF EXISTS "Users can delete their chat media" ON storage.objects;
CREATE POLICY "Users can delete their chat media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);