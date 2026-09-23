-- Keep WhatsApp attachments in private storage; only the service role uploads.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('whatsapp-media', 'whatsapp-media', false, 52428800)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'whatsapp_media_admin_staff_read'
  ) THEN
    CREATE POLICY whatsapp_media_admin_staff_read
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'whatsapp-media'
        AND EXISTS (
          SELECT 1
          FROM public.user_roles
          WHERE user_id = auth.uid()
            AND role IN ('admin', 'staff')
        )
      );
  END IF;
END
$$;
