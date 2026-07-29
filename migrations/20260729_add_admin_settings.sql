BEGIN;

CREATE TABLE IF NOT EXISTS public.app_settings (
    id TEXT PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
    business_name TEXT NOT NULL DEFAULT 'Digital Card by Maiya'
        CHECK (length(btrim(business_name)) BETWEEN 1 AND 100),
    tagline TEXT NOT NULL DEFAULT 'Beautiful Digital Wedding Invitation'
        CHECK (length(tagline) <= 160),
    whatsapp_number TEXT NOT NULL DEFAULT ''
        CHECK (length(whatsapp_number) <= 30),
    default_expiry_days INTEGER NOT NULL DEFAULT 30
        CHECK (default_expiry_days BETWEEN 1 AND 365),
    google_sheets_sync_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.app_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated admins can read app settings" ON public.app_settings;
CREATE POLICY "Authenticated admins can read app settings"
    ON public.app_settings FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "Authenticated admins can update app settings" ON public.app_settings;
CREATE POLICY "Authenticated admins can update app settings"
    ON public.app_settings FOR UPDATE TO authenticated
    USING (TRUE) WITH CHECK (id = 'default');

DROP POLICY IF EXISTS "Authenticated admins can insert app settings" ON public.app_settings;
CREATE POLICY "Authenticated admins can insert app settings"
    ON public.app_settings FOR INSERT TO authenticated
    WITH CHECK (id = 'default');

DROP TRIGGER IF EXISTS trigger_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER trigger_app_settings_updated_at
    BEFORE UPDATE ON public.app_settings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

REVOKE ALL ON TABLE public.app_settings FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.app_settings TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
