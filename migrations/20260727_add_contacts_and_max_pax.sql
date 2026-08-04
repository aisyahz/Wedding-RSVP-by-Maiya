BEGIN;

ALTER TABLE public.invitations
    ADD COLUMN IF NOT EXISTS contacts JSONB NOT NULL DEFAULT '[]'::JSONB,
    ADD COLUMN IF NOT EXISTS max_pax INTEGER NOT NULL DEFAULT 6;

ALTER TABLE public.invitations
    DROP CONSTRAINT IF EXISTS invitations_max_pax_check;

ALTER TABLE public.invitations
    ADD CONSTRAINT invitations_max_pax_check CHECK (max_pax BETWEEN 1 AND 20);

UPDATE public.invitations
SET contacts = pg_catalog.jsonb_build_array(
    pg_catalog.jsonb_build_object(
        'id', 'legacy-contact',
        'name', 'Wakil Keluarga',
        'relationship', '',
        'phoneNumber', whatsapp_contact,
        'whatsappNumber', whatsapp_contact,
        'enabled', true
    )
)
WHERE contacts = '[]'::JSONB
  AND NULLIF(pg_catalog.btrim(whatsapp_contact), '') IS NOT NULL;

DROP FUNCTION IF EXISTS public.create_invitation_with_pin(
    TEXT, TEXT, TEXT, DATE, TIME, TEXT, TEXT, TEXT, TEXT, TEXT,
    TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION public.create_invitation_with_pin(
    p_slug TEXT,
    p_bride_name TEXT,
    p_groom_name TEXT,
    p_wedding_date DATE,
    p_wedding_time TIME,
    p_venue_name TEXT,
    p_venue_address TEXT,
    p_google_maps_url TEXT DEFAULT NULL,
    p_waze_url TEXT DEFAULT NULL,
    p_whatsapp_contact TEXT DEFAULT '',
    p_wishlist_url TEXT DEFAULT NULL,
    p_bank_name TEXT DEFAULT NULL,
    p_bank_account_number TEXT DEFAULT NULL,
    p_bank_account_holder TEXT DEFAULT NULL,
    p_qr_code_url TEXT DEFAULT NULL,
    p_rsvp_closing_date TIMESTAMPTZ DEFAULT NULL,
    p_video_key TEXT DEFAULT NULL,
    p_video_file_name TEXT DEFAULT NULL,
    p_status TEXT DEFAULT 'draft',
    p_custom_pin TEXT DEFAULT NULL,
    p_contacts JSONB DEFAULT '[]'::JSONB,
    p_max_pax INTEGER DEFAULT 6
)
RETURNS TABLE (invitation_id UUID, slug TEXT, plain_pin TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_invitation_id UUID;
    v_slug TEXT;
    v_plain_pin TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized. Authenticated access required.' USING ERRCODE = '42501';
    END IF;
    IF NULLIF(pg_catalog.btrim(p_slug), '') IS NULL THEN
        RAISE EXCEPTION 'Invitation slug is required.' USING ERRCODE = '22023';
    END IF;
    IF p_max_pax NOT BETWEEN 1 AND 20 THEN
        RAISE EXCEPTION 'Maximum pax must be between 1 and 20.' USING ERRCODE = '22023';
    END IF;
    IF p_custom_pin IS NOT NULL AND p_custom_pin !~ '^[0-9]{6}$' THEN
        RAISE EXCEPTION 'Custom PIN must contain exactly 6 digits.' USING ERRCODE = '22023';
    END IF;

    v_plain_pin := COALESCE(
        p_custom_pin,
        pg_catalog.lpad(pg_catalog.floor(pg_catalog.random() * 1000000)::TEXT, 6, '0')
    );
    INSERT INTO public.invitations AS invitation (
        slug, bride_name, groom_name, wedding_date, wedding_time,
        venue_name, venue_address, google_maps_url, waze_url,
        whatsapp_contact, contacts, max_pax, wishlist_url, bank_name,
        bank_account_number, bank_account_holder, qr_code_url,
        rsvp_closing_date, video_key, video_url, video_file_name, status
    ) VALUES (
        p_slug, p_bride_name, p_groom_name, p_wedding_date, p_wedding_time,
        p_venue_name, p_venue_address, p_google_maps_url, p_waze_url,
        p_whatsapp_contact, COALESCE(p_contacts, '[]'::JSONB), p_max_pax,
        p_wishlist_url, p_bank_name, p_bank_account_number,
        p_bank_account_holder, p_qr_code_url, p_rsvp_closing_date,
        p_video_key, NULL, p_video_file_name, p_status
    )
    RETURNING invitation.id, invitation.slug INTO v_invitation_id, v_slug;

    INSERT INTO public.invitation_secrets (invitation_id, private_pin)
    VALUES (v_invitation_id, v_plain_pin);

    RETURN QUERY SELECT v_invitation_id, v_slug, v_plain_pin;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_invitation_with_pin(
    TEXT, TEXT, TEXT, DATE, TIME, TEXT, TEXT, TEXT, TEXT, TEXT,
    TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT,
    TEXT, JSONB, INTEGER
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_invitation_with_pin(
    TEXT, TEXT, TEXT, DATE, TIME, TEXT, TEXT, TEXT, TEXT, TEXT,
    TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT,
    TEXT, JSONB, INTEGER
) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
