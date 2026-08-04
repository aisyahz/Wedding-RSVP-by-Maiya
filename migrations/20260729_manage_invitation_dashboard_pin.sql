BEGIN;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.invitation_secrets
    ADD COLUMN IF NOT EXISTS private_pin TEXT;

ALTER TABLE public.invitation_secrets
    DROP CONSTRAINT IF EXISTS invitation_secrets_private_pin_format;

ALTER TABLE public.invitation_secrets
    ADD CONSTRAINT invitation_secrets_private_pin_format
    CHECK (private_pin IS NULL OR private_pin ~ '^[0-9]{6}$');

CREATE OR REPLACE FUNCTION public.generate_random_pin()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    random_bytes BYTEA;
    random_value BIGINT;
BEGIN
    LOOP
        random_bytes := extensions.gen_random_bytes(4);
        random_value :=
            pg_catalog.get_byte(random_bytes, 0)::BIGINT * 16777216 +
            pg_catalog.get_byte(random_bytes, 1)::BIGINT * 65536 +
            pg_catalog.get_byte(random_bytes, 2)::BIGINT * 256 +
            pg_catalog.get_byte(random_bytes, 3)::BIGINT;
        EXIT WHEN random_value < 4294000000;
    END LOOP;
    RETURN pg_catalog.lpad((random_value % 1000000)::TEXT, 6, '0');
END;
$function$;

REVOKE ALL ON FUNCTION public.generate_random_pin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_random_pin() TO service_role;

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
    new_invitation_id UUID;
    new_slug TEXT;
    new_pin TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized. Authenticated access required.'
            USING ERRCODE = '42501';
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

    new_pin := COALESCE(p_custom_pin, public.generate_random_pin());

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
    RETURNING invitation.id, invitation.slug
    INTO new_invitation_id, new_slug;

    INSERT INTO public.invitation_secrets (invitation_id, private_pin)
    VALUES (new_invitation_id, new_pin);

    RETURN QUERY SELECT new_invitation_id, new_slug, new_pin;
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

DROP FUNCTION IF EXISTS public.get_invitation_pin_status(UUID);

CREATE OR REPLACE FUNCTION public.get_invitation_pin(
    p_invitation_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    current_pin TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized. Authenticated access required.'
            USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.invitations i WHERE i.id = p_invitation_id
    ) THEN
        RAISE EXCEPTION 'Invitation not found.' USING ERRCODE = 'P0002';
    END IF;

    SELECT s.private_pin
    INTO current_pin
    FROM public.invitation_secrets s
    WHERE s.invitation_id = p_invitation_id;

    RETURN current_pin;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_invitation_pin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_invitation_pin(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.generate_invitation_pin(
    p_invitation_id UUID,
    p_replace_existing BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    plain_pin TEXT,
    replaced_existing BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    existing_pin BOOLEAN;
    generated_pin TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized. Authenticated access required.'
            USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.invitations i WHERE i.id = p_invitation_id
    ) THEN
        RAISE EXCEPTION 'Invitation not found.' USING ERRCODE = 'P0002';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.invitation_secrets s
        WHERE s.invitation_id = p_invitation_id
          AND s.private_pin ~ '^[0-9]{6}$'
    ) INTO existing_pin;

    IF existing_pin AND NOT p_replace_existing THEN
        RAISE EXCEPTION 'A security PIN already exists for this invitation.'
            USING ERRCODE = '23505';
    END IF;

    generated_pin := public.generate_random_pin();

    INSERT INTO public.invitation_secrets AS secret (invitation_id, private_pin)
    VALUES (p_invitation_id, generated_pin)
    ON CONFLICT (invitation_id)
    DO UPDATE SET
        private_pin = EXCLUDED.private_pin,
        created_at = pg_catalog.now();

    RETURN QUERY SELECT generated_pin, existing_pin;
END;
$function$;

REVOKE ALL ON FUNCTION public.generate_invitation_pin(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_invitation_pin(UUID, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_private_couple_rsvp_report(
    invitation_slug TEXT,
    input_pin TEXT
)
RETURNS TABLE (
    rsvp_id UUID,
    guest_name TEXT,
    attendance TEXT,
    pax INTEGER,
    wishes TEXT,
    submitted_at TIMESTAMPTZ,
    bride_name TEXT,
    groom_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    target_inv RECORD;
BEGIN
    IF input_pin IS NULL OR input_pin !~ '^[0-9]{6}$' THEN
        RAISE EXCEPTION 'Invalid security PIN format. Must be 6 numeric digits.'
            USING ERRCODE = '22023';
    END IF;

    SELECT i.id, i.bride_name, i.groom_name, s.private_pin
    INTO target_inv
    FROM public.invitations i
    LEFT JOIN public.invitation_secrets s ON s.invitation_id = i.id
    WHERE i.slug = invitation_slug;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invitation not found.' USING ERRCODE = 'P0002';
    END IF;

    IF target_inv.private_pin IS NULL THEN
        RAISE EXCEPTION 'A security PIN has not been generated for this invitation.'
            USING ERRCODE = 'P0001';
    END IF;

    IF target_inv.private_pin <> input_pin THEN
        RAISE EXCEPTION 'Invalid security PIN.' USING ERRCODE = '28P01';
    END IF;

    RETURN QUERY
    SELECT
        r.id,
        r.guest_name,
        r.attendance,
        r.pax,
        r.wishes,
        r.submitted_at,
        target_inv.bride_name,
        target_inv.groom_name
    FROM public.rsvp_entries r
    WHERE r.invitation_id = target_inv.id
    ORDER BY r.submitted_at DESC;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_private_couple_rsvp_report(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_private_couple_rsvp_report(TEXT, TEXT) TO anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
